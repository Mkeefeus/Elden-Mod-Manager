import { BrowserWindow, app, session } from 'electron';
import { randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import { join } from 'path';
import { DownloadState } from 'types';
import { extractModArchive } from './fileSystem';
import { logger } from '../utils/mainLogger';
import { errToString } from '../utils/utilities';

const { debug, error } = logger;

const downloads = new Map<string, DownloadState & { savePath: string; item?: Electron.DownloadItem }>();

let getWindow: (() => BrowserWindow | null) | null = null;

const sendToWindow = (channel: string, payload: unknown) => {
  const win = getWindow?.();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
};

export const initDownloadManager = (windowGetter: () => BrowserWindow | null) => {
  getWindow = windowGetter;

  session.fromPartition('persist:nexus').on('will-download', (_event, item) => {
    const id = randomUUID();
    const filename = item.getFilename();
    const savePath = join(app.getPath('temp'), 'elden-mod-manager', id, filename);

    item.setSavePath(savePath);

    const state: DownloadState & { savePath: string; item: Electron.DownloadItem } = {
      id,
      filename,
      status: 'downloading',
      progress: 0,
      source: 'nexus',
      savePath,
      item,
    };
    downloads.set(id, state);

    debug(`Download started: ${filename} (${id})`);
    sendToWindow('download-started', toPublicState(state));

    item.on('updated', (_evt, downloadState) => {
      if (downloadState === 'progressing') {
        const total = item.getTotalBytes();
        const received = item.getReceivedBytes();
        const progress = total > 0 ? Math.floor((received / total) * 100) : 0;
        const entry = downloads.get(id);
        if (entry) {
          entry.progress = progress;
          sendToWindow('download-progress', { id, progress });
        }
      }
    });

    item.once('done', (_evt, doneState) => {
      void (async () => {
        const entry = downloads.get(id);
        if (!entry) return;

        if (doneState === 'completed') {
          entry.status = 'extracting';
          sendToWindow('download-progress', { id, progress: 100, status: 'extracting' });

          try {
            const extractedPath = await extractModArchive(savePath);
            if (!extractedPath) {
              throw new Error('Extraction returned no valid mod path');
            }
            entry.status = 'ready';
            entry.extractedPath = extractedPath;
            debug(`Download extracted: ${filename} → ${extractedPath}`);
            sendToWindow('download-complete', toPublicState(entry));
          } catch (err) {
            entry.status = 'error';
            entry.error = errToString(err);
            error(`Failed to extract download ${filename}: ${errToString(err)}`);
            sendToWindow('download-error', toPublicState(entry));
          }
        } else {
          entry.status = 'error';
          entry.error = `Download ${doneState}`;
          debug(`Download ${doneState}: ${filename}`);
          sendToWindow('download-error', toPublicState(entry));
        }
      })();
    });
  });

  debug('Download manager initialised (partition: persist:nexus)');
};

const toPublicState = (entry: DownloadState & { savePath: string }): DownloadState => ({
  id: entry.id,
  filename: entry.filename,
  status: entry.status,
  progress: entry.progress,
  source: entry.source,
  extractedPath: entry.extractedPath,
  error: entry.error,
});

export const getActiveDownloads = (): DownloadState[] => [...downloads.values()].map(toPublicState);

export const cancelDownload = (id: string) => {
  const entry = downloads.get(id);
  if (!entry) return;
  entry.item?.cancel();
  debug(`Cancelled download: ${id}`);
};

export const dismissDownload = async (id: string) => {
  const entry = downloads.get(id);
  if (!entry) return;

  // Cancel if still active
  if (entry.item && ['downloading', 'extracting'].includes(entry.status)) {
    entry.item.cancel();
  }

  // Clean up temp folder
  const tempDir = join(app.getPath('temp'), 'elden-mod-manager', id);
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch (err) {
    error(`Failed to clean up temp dir for ${id}: ${errToString(err)}`);
  }

  downloads.delete(id);
  debug(`Dismissed download: ${id}`);
};

/** Register a local (zip/folder) entry directly — no file download needed */
export const addLocalDownload = (
  id: string,
  filename: string,
  source: 'local',
  extractedPath: string
): DownloadState => {
  const state: DownloadState & { savePath: string } = {
    id,
    filename,
    status: 'ready',
    progress: 100,
    source,
    extractedPath,
    savePath: extractedPath,
  };
  downloads.set(id, state);
  return toPublicState(state);
};

// Clean up all temp files on quit
app.on('before-quit', () => {
  for (const [id, entry] of downloads.entries()) {
    const tempDir = join(app.getPath('temp'), 'elden-mod-manager', id);
    // Only clean up nexus temp — local folder mods should not be deleted
    if (entry.source === 'nexus') {
      rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
});

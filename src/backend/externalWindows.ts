import { spawn } from 'child_process';
import { logger } from '@utils/mainLogger';

const { debug, warning } = logger;

const FOCUS_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runCommand = (command: string, args: string[]): Promise<{ code: number | null; stdout: string }> => {
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let stdout = '';
    child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.on('error', () => resolve({ code: -1, stdout: '' }));
    child.on('close', (code) => resolve({ code, stdout }));
  });
};

const commandExists = async (command: string): Promise<boolean> => {
  const { code } = await runCommand(process.platform === 'win32' ? 'where' : 'command', [
    ...(process.platform === 'win32' ? [] : ['-v']),
    command,
  ]);
  return code === 0;
};

// --- Windows: shell out to PowerShell, P/Invoking user32.dll -------------------------------

const PS_HELPER = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
}
"@
function Get-VisibleWindowsByExe([string]$exeName) {
  $result = @()
  $callback = {
    param($hWnd, $lParam)
    if ([Win32]::IsWindowVisible($hWnd)) {
      $procId = 0
      [Win32]::GetWindowThreadProcessId($hWnd, [ref]$procId) | Out-Null
      try {
        $proc = Get-Process -Id $procId -ErrorAction Stop
        if ($proc.Path -and (Split-Path $proc.Path -Leaf) -ieq $exeName) {
          $script:result += $hWnd
        }
      } catch {}
    }
    return $true
  }
  [Win32]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
  return $result
}
`;

const psMinimizeByExecutable = (exeName: string): string => `
${PS_HELPER}
Get-VisibleWindowsByExe -exeName "${exeName}" | ForEach-Object { [Win32]::ShowWindow($_, 6) | Out-Null }
`;

const psFocusByExecutable = (exeName: string): string => `
${PS_HELPER}
$windows = Get-VisibleWindowsByExe -exeName "${exeName}"
if ($windows.Count -gt 0) {
  [Win32]::ShowWindow($windows[0], 9) | Out-Null
  [Win32]::SetForegroundWindow($windows[0]) | Out-Null
  Write-Output "found"
}
`;

const runPowerShellScript = async (script: string): Promise<string> => {
  const { stdout } = await runCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
  return stdout.trim();
};

// --- Linux: shell out to xdotool/wmctrl ----------------------------------------------------

let cachedLinuxTool: 'xdotool' | 'wmctrl' | 'none' | null = null;

const getLinuxWindowTool = async (): Promise<'xdotool' | 'wmctrl' | 'none'> => {
  if (cachedLinuxTool) return cachedLinuxTool;
  // Prefer wmctrl: it lists windows unconditionally (no pattern needed) and
  // reads the modern _NET_WM_NAME property. xdotool's --name only matches
  // the legacy WM_NAME, so many windows (including our own enumerate-all
  // trick below) can silently fail to match on it.
  if (await commandExists('wmctrl')) {
    cachedLinuxTool = 'wmctrl';
  } else if (await commandExists('xdotool')) {
    cachedLinuxTool = 'xdotool';
  } else {
    cachedLinuxTool = 'none';
  }
  return cachedLinuxTool;
};

const readProcExe = async (pid: string): Promise<string | null> => {
  try {
    const fs = await import('fs/promises');
    return await fs.readlink(`/proc/${pid}/exe`);
  } catch {
    return null;
  }
};

/** Returns xdotool/wmctrl window ids whose owning process's executable basename matches `exeName`. */
const findLinuxWindowIds = async (exeName: string, tool: 'xdotool' | 'wmctrl'): Promise<string[]> => {
  if (tool === 'xdotool') {
    // No --onlyvisible: under XWayland, windows don't reliably get flagged
    // as "visible" the way xdotool expects from a native X11 session, so
    // --onlyvisible filters out everything. We're matching by owning
    // process anyway, so including hidden/withdrawn windows here is fine.
    const { stdout } = await runCommand('xdotool', ['search', 'onlyvisible', '--class', "'.*'"]);
    const windowIds = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const matches: string[] = [];
    for (const windowId of windowIds) {
      const { stdout: pidOut } = await runCommand('xdotool', ['getwindowpid', windowId]);
      const pid = pidOut.trim();
      if (!pid) continue;
      const exePath = await readProcExe(pid);
      if (exePath && exePath.toLowerCase().endsWith(`/${exeName.toLowerCase()}`)) {
        matches.push(windowId);
      }
    }
    return matches;
  }

  const { stdout } = await runCommand('wmctrl', ['-lp']);
  const matches: string[] = [];
  for (const line of stdout.split('\n')) {
    const [windowId, , pid] = line.trim().split(/\s+/);
    if (!windowId || !pid) continue;
    const exePath = await readProcExe(pid);
    if (exePath && exePath.toLowerCase().endsWith(`/${exeName.toLowerCase()}`)) {
      matches.push(windowId);
    }
  }
  return matches;
};

const minimizeLinuxWindow = async (windowId: string, tool: 'xdotool' | 'wmctrl'): Promise<void> => {
  if (tool === 'xdotool') {
    await runCommand('xdotool', ['windowminimize', windowId]);
  } else {
    await runCommand('wmctrl', ['-ir', windowId, '-b', 'add,hidden']);
  }
};

const focusLinuxWindow = async (windowId: string, tool: 'xdotool' | 'wmctrl'): Promise<void> => {
  if (tool === 'xdotool') {
    await runCommand('xdotool', ['windowactivate', windowId]);
  } else {
    await runCommand('wmctrl', ['-ia', windowId]);
  }
};

// --- Public API -------------------------------------------------------------------------

/**
 * Best-effort: minimizes any currently open window owned by a process whose executable
 * basename matches one of `exeNames`. No-ops per-platform when the required OS tooling
 * (PowerShell on Windows, xdotool/wmctrl on Linux) is unavailable.
 */
export const minimizeWindowsByExecutables = async (exeNames: string[]): Promise<void> => {
  const names = exeNames.filter(Boolean);
  if (names.length === 0) return;

  if (process.platform === 'win32') {
    for (const exeName of names) {
      await runPowerShellScript(psMinimizeByExecutable(exeName));
    }
    return;
  }

  if (process.platform === 'linux') {
    const tool = await getLinuxWindowTool();
    if (tool === 'none') {
      debug('Skipping tool-window minimize: neither xdotool nor wmctrl is available');
      return;
    }
    for (const exeName of names) {
      const windowIds = await findLinuxWindowIds(exeName, tool);
      for (const windowId of windowIds) {
        await minimizeLinuxWindow(windowId, tool);
      }
    }
    return;
  }

  debug(`Skipping tool-window minimize: unsupported platform ${process.platform}`);
};

/**
 * Polls for a window owned by a process matching `exeName` and brings it to the foreground
 * once found. Gives up and logs a warning after `timeoutMs` (default 60s, to allow for
 * slow-loading games/anti-cheat) if the window never appears.
 */
export const focusWindowByExecutable = async (
  exeName: string,
  options?: { timeoutMs?: number; pollIntervalMs?: number }
): Promise<void> => {
  const timeoutMs = options?.timeoutMs ?? FOCUS_TIMEOUT_MS;
  const pollIntervalMs = options?.pollIntervalMs ?? POLL_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;

  if (process.platform === 'win32') {
    while (Date.now() < deadline) {
      const result = await runPowerShellScript(psFocusByExecutable(exeName));
      if (result.includes('found')) return;
      await sleep(pollIntervalMs);
    }
    warning(`Could not find window for ${exeName} to focus after ${timeoutMs}ms`);
    return;
  }

  if (process.platform === 'linux') {
    const tool = await getLinuxWindowTool();
    if (tool === 'none') {
      debug(`Skipping focus for ${exeName}: neither xdotool nor wmctrl is available`);
      return;
    }
    while (Date.now() < deadline) {
      const windowIds = await findLinuxWindowIds(exeName, tool);
      if (windowIds.length > 0) {
        await focusLinuxWindow(windowIds[0], tool);
        return;
      }
      await sleep(pollIntervalMs);
    }
    warning(`Could not find window for ${exeName} to focus after ${timeoutMs}ms`);
    return;
  }

  debug(`Skipping focus for ${exeName}: unsupported platform ${process.platform}`);
};

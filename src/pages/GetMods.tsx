import { useState, useEffect, useCallback } from 'react';
import { Box, Group } from '@mantine/core';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../themes';
import { DownloadState } from 'types';
import GetModsSidebar from '../components/GetMods/GetModsSidebar';
import NexusWebView from '../components/GetMods/NexusWebView';
import AddFromLocalForm from '../components/GetMods/AddFromLocalForm';
import ModConfigForm from '../components/GetMods/ModConfigForm';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 1000 * 60 * 5 } },
});

export type ActiveTab = 'nexus' | 'add-archive' | 'add-folder' | (string & {}); // string & {} = download id

const GetModsInner = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('nexus');
  const [downloads, setDownloads] = useState<DownloadState[]>([]);

  // Hydrate from download manager on mount
  useEffect(() => {
    window.electronAPI.getDownloads().then(setDownloads).catch(console.error);
  }, []);

  // Warn before closing if there are uninstalled mods
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasPending = downloads.some((d) => d.status !== 'error');
      if (hasPending) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [downloads]);

  // Subscribe to download events
  useEffect(() => {
    window.electronAPI.onDownloadStarted((state) => {
      setDownloads((prev) => {
        const exists = prev.find((d) => d.id === state.id);
        return exists ? prev : [...prev, state];
      });
    });

    window.electronAPI.onDownloadProgress((update) => {
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === update.id
            ? { ...d, progress: update.progress, status: (update.status as DownloadState['status']) ?? d.status }
            : d
        )
      );
    });

    window.electronAPI.onDownloadComplete((state) => {
      setDownloads((prev) => prev.map((d) => (d.id === state.id ? state : d)));
    });

    window.electronAPI.onDownloadError((state) => {
      setDownloads((prev) => prev.map((d) => (d.id === state.id ? state : d)));
    });
  }, []);

  const handleLocalAdded = useCallback((state: DownloadState) => {
    setDownloads((prev) => {
      const exists = prev.find((d) => d.id === state.id);
      return exists ? prev : [...prev, state];
    });
    setActiveTab(state.id);
  }, []);

  const handleDismiss = useCallback(
    (id: string) => {
      window.electronAPI.dismissDownload(id);
      setDownloads((prev) => prev.filter((d) => d.id !== id));
      if (activeTab === id) setActiveTab('nexus');
    },
    [activeTab]
  );

  const activeDownload = downloads.find((d) => d.id === activeTab);

  const renderOverlayContent = () => {
    if (activeTab === 'add-archive') return <AddFromLocalForm type="archive" onAdded={handleLocalAdded} />;
    if (activeTab === 'add-folder') return <AddFromLocalForm type="folder" onAdded={handleLocalAdded} />;
    if (activeDownload) {
      return (
        <ModConfigForm
          download={activeDownload}
          onSuccess={() => handleDismiss(activeDownload.id)}
          onDismiss={() => handleDismiss(activeDownload.id)}
        />
      );
    }
    return null;
  };

  const overlayContent = renderOverlayContent();

  return (
    <Group gap={0} style={{ height: '100vh', overflow: 'hidden' }}>
      <Box
        style={{
          width: 260,
          flexShrink: 0,
          height: '100%',
          borderRight: '1px solid var(--mantine-color-gold-7)',
          overflow: 'hidden',
        }}
      >
        <GetModsSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          downloads={downloads}
          onDismiss={handleDismiss}
        />
      </Box>
      <Box style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
        {/* NexusWebView stays mounted to preserve navigation state */}
        <Box style={{ position: 'absolute', inset: 0, display: overlayContent ? 'none' : 'block' }}>
          <NexusWebView />
        </Box>
        {overlayContent && <Box style={{ position: 'absolute', inset: 0 }}>{overlayContent}</Box>}
      </Box>
    </Group>
  );
};

const GetMods = () => (
  <QueryClientProvider client={queryClient}>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications />
      <GetModsInner />
    </MantineProvider>
  </QueryClientProvider>
);

export default GetMods;

import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Group, Stack, Text } from '@mantine/core';
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';

interface NexusWebViewProps {
  navigateTo?: string;
  onNavigated?: () => void;
}

const NexusWebView = ({ navigateTo, onNavigated }: NexusWebViewProps) => {
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const isDomReadyRef = useRef(false);
  const onNavigatedRef = useRef(onNavigated);
  useEffect(() => {
    onNavigatedRef.current = onNavigated;
  }, [onNavigated]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const handleNavigateTo = (url: string) => {
      void wv.loadURL(url);
    };

    window.electronAPI.onNavigateNexusTo(handleNavigateTo);
  }, []);

  // Prop-driven navigation (from sidebar click within the same renderer)
  useEffect(() => {
    if (!navigateTo || !webviewRef.current) return;
    const wv = webviewRef.current;
    const doNav = () => {
      void wv.loadURL(navigateTo);
      onNavigatedRef.current?.();
    };
    if (isDomReadyRef.current) {
      doNav();
      return;
    }
    wv.addEventListener('dom-ready', doNav);
    return () => {
      wv.removeEventListener('dom-ready', doNav);
    };
  }, [navigateTo]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const syncNavigationState = () => {
      if (!isDomReadyRef.current) return;
      setCanGoBack(wv.canGoBack());
      setCanGoForward(wv.canGoForward());
    };

    const handleDomReady = () => {
      isDomReadyRef.current = true;
      syncNavigationState();
    };

    const handleLoad = () => {
      syncNavigationState();
    };

    const handleNavigation = () => {
      syncNavigationState();
    };

    wv.addEventListener('dom-ready', handleDomReady);
    wv.addEventListener('did-finish-load', handleLoad);
    wv.addEventListener('did-navigate', handleNavigation);
    wv.addEventListener('did-navigate-in-page', handleNavigation);

    return () => {
      isDomReadyRef.current = false;
      wv.removeEventListener('dom-ready', handleDomReady);
      wv.removeEventListener('did-finish-load', handleLoad);
      wv.removeEventListener('did-navigate', handleNavigation);
      wv.removeEventListener('did-navigate-in-page', handleNavigation);
    };
  }, []);

  return (
    <Stack gap={0} h="100%">
      {/* Notice bar */}
      <Box
        px="md"
        py={6}
        style={{
          background: 'var(--mantine-color-dark-7)',
          borderBottom: '1px solid var(--mantine-color-gold-7)',
          flexShrink: 0,
        }}
      >
        <Group gap="md" wrap="nowrap" align="center">
          <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
            <ActionIcon
              variant="outline"
              aria-label="Go back"
              disabled={!canGoBack}
              onClick={() => {
                webviewRef.current?.goBack();
              }}
            >
              <IconArrowLeft size={16} />
            </ActionIcon>
            <ActionIcon
              variant="outline"
              aria-label="Go forward"
              disabled={!canGoForward}
              onClick={() => {
                webviewRef.current?.goForward();
              }}
            >
              <IconArrowRight size={16} />
            </ActionIcon>
          </Group>

          <Text size="xs" c="gold.4" style={{ flex: 1 }}>
            <strong>Note:</strong> Use the <strong>Manual Download</strong> button on Nexus to download mods. "Mod
            Manager Download" (nxm://) is not supported.
          </Text>
        </Group>
      </Box>

      {/* WebView */}
      <Box style={{ flex: 1, overflow: 'hidden' }}>
        <webview
          ref={webviewRef}
          src="https://www.nexusmods.com/eldenring"
          partition="persist:nexus"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </Box>
    </Stack>
  );
};

export default NexusWebView;

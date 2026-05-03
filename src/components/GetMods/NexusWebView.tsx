import { useEffect, useRef } from 'react';
import { Box, Stack, Text } from '@mantine/core';

// Script injected into the WebView after each page load.
// Disables nxm:// links and observes dynamic content for new ones.
const NXM_DISABLE_SCRIPT = `
(function () {
  const TOOLTIP = 'Use "Manual Download" to download via Elden Mod Manager';

  function disableNxmLink(el) {
    if (el._nxmDisabled) return;
    el._nxmDisabled = true;
    el.setAttribute('href', 'javascript:void(0)');
    el.setAttribute('title', TOOLTIP);
    el.style.opacity = '0.5';
    el.style.cursor = 'not-allowed';
    el.style.pointerEvents = 'none';
    const parent = el.closest('[data-e2eid]') || el.parentElement;
    if (parent) {
      const badge = document.createElement('span');
      badge.textContent = '⚠ Use Manual Download';
      badge.style.cssText =
        'font-size:11px;color:#c89b4a;display:block;margin-top:2px;';
      if (!parent.querySelector('.emm-nxm-notice')) {
        badge.classList.add('emm-nxm-notice');
        parent.appendChild(badge);
      }
    }
  }

  function processAll() {
    document.querySelectorAll('a[href^="nxm://"]').forEach(disableNxmLink);
  }

  processAll();

  const observer = new MutationObserver(processAll);
  observer.observe(document.body, { childList: true, subtree: true });
})();
`;

const NexusWebView = () => {
  const webviewRef = useRef<Electron.WebviewTag | null>(null);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const handleLoad = () => {
      wv.executeJavaScript(NXM_DISABLE_SCRIPT).catch(console.error);
    };

    wv.addEventListener('did-finish-load', handleLoad);
    return () => {
      wv.removeEventListener('did-finish-load', handleLoad);
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
        <Text size="xs" c="gold.4">
          <strong>Note:</strong> Use the <strong>Manual Download</strong> button on Nexus to download mods. "Mod Manager
          Download" (nxm://) is not supported.
        </Text>
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

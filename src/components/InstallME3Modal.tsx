import { Button, Stack, Text, Group, Anchor } from '@mantine/core';
import { sendLog } from '../utils/rendererLogger';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

interface InstallME3ModalProps {
  hideModal: () => void;
}

const InstallME3Modal = ({ hideModal }: InstallME3ModalProps) => {
  const [loading, setLoading] = useState(false);

  const handleAutoDetect = async () => {
    setLoading(true);
    const detected = await window.electronAPI.detectME3();
    if (!detected) {
      sendLog({
        level: 'error',
        message:
          'ME3 could not be found automatically. Please install it or browse to me3.exe manually.',
      });
      setLoading(false);
      return;
    }
    window.electronAPI.setME3Path(detected);
    sendLog({ level: 'info', message: `ME3 found at: ${detected}` });
    setLoading(false);
    hideModal();
  };

  const handleBrowse = async () => {
    setLoading(true);
    const me3Path = await window.electronAPI.browse('exe', 'Select ME3 Executable (me3 or me3.exe)');
    if (!me3Path) {
      setLoading(false);
      return;
    }
    const basename = me3Path.split(/[\\/]/).pop()?.toLowerCase() ?? '';
    if (basename !== 'me3.exe' && basename !== 'me3') {
      sendLog({
        level: 'error',
        message: 'Please select the me3 executable (me3.exe on Windows, me3 on Linux).',
      });
      setLoading(false);
      return;
    }
    window.electronAPI.setME3Path(me3Path);
    setLoading(false);
    hideModal();
  };

  return (
    <Stack>
      <Group gap="xs" align="center">
        <FontAwesomeIcon icon={faTriangleExclamation} color="var(--mantine-color-gold-4)" size="lg" />
        <Text fz="lg" fw={600}>ModEngine3 (me3) is required to use the mod manager.</Text>
      </Group>
      <Text fz="sm">
        me3 is the successor to ModEngine2. Download and install it from the{' '}
        <Anchor
          href="https://github.com/garyttierney/me3/releases/latest"
          target="_blank"
          c="gold.4"
        >
          me3 GitHub releases page
        </Anchor>
        , then return here.
      </Text>
      <Text fz="sm">
        Once installed, click <strong>Auto-detect</strong> to find it automatically, or{' '}
        <strong>Browse</strong> to locate <code>me3.exe</code> manually.
      </Text>
      <Group justify="space-evenly" mt="sm">
        <Button style={{ flex: 1 }} loading={loading} onClick={() => { void handleAutoDetect(); }}>
          Auto-detect
        </Button>
        <Button style={{ flex: 1 }} loading={loading} variant="outline" onClick={() => { void handleBrowse(); }}>
          Browse
        </Button>
      </Group>
    </Stack>
  );
};

export default InstallME3Modal;

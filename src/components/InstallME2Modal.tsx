import { Button, Stack, Text, Group, HoverCard, Code } from '@mantine/core';
import { sendLog } from '../utils/rendererLogger';
import { useState } from 'react';

interface InstallME2ModalProps {
  hideModal: () => void;
}

const InstallME2Modal = ({ hideModal }: InstallME2ModalProps) => {
  const [loading, setLoading] = useState(false);
  const handleBrowse = async () => {
    setLoading(true);
    const me2Path = await window.electronAPI.browse('exe', 'Select ModEngine2 Executable');
    let invalidPath = false;
    if (!me2Path?.includes('modengine2_launcher.exe')) {
      invalidPath = true;
    }
    if (invalidPath || !me2Path) {
      sendLog({
        level: 'error',
        message: 'The path you selected is not Mod Engine 2. Please select modengine2_launcher.exe',
      });
      return;
    }
    window.electronAPI.setME2Path(me2Path);
    hideModal();
    setLoading(false);
  };

  const handleInstall = async (browse?: boolean) => {
    setLoading(true);
    if (browse) {
      const me2Path = await window.electronAPI.browse('directory', 'Select Installation Directory', 'me2Default');
      if (!me2Path) {
        return;
      }
      window.electronAPI.setME2Path(me2Path);
    }
    // await window.electronAPI.installME2();
    setLoading(false);
    hideModal();
  };

  return (
    <Stack>
      <Text fz="lg">🚨ModEngine2 is required to use the mod manager.🚨</Text>
      <Text fz="sm">
        If you already have ModEngine2, select "browse" and navigate to your ModEngine2 installation and select{' '}
        <Code>modengine2_launcher.exe</Code>. <br />
        <br />
        Alternitvely, you can install ME2 to the default location by selecting "Default", or select "Custom" and browse
        to the location you would like to install ModEngine2 to.
      </Text>
      {loading ? (
        <Button loading>Installing...</Button>
      ) : (
        <Group justify="space-evenly">
          <Button style={{ flex: 1 }} onClick={handleBrowse}>
            Browse
          </Button>
          <Button
            style={{ flex: 1 }}
            onClick={() => {
              handleInstall(true);
            }}
          >
            Custom
          </Button>
          <HoverCard>
            <HoverCard.Target>
              <Button
                style={{ flex: 1 }}
                onClick={() => {
                  handleInstall();
                }}
              >
                Default
              </Button>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Text>Default install location is %AppData%\elden-mod-manager\ModEngine\</Text>
            </HoverCard.Dropdown>
          </HoverCard>
        </Group>
      )}
    </Stack>
  );
};
export default InstallME2Modal;

import { Button, Group, HoverCard, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { sendLog } from 'src/utils/rendererLogger';

interface PromptModsFolderModalProps {
  hideModal: () => void;
}

const PromptModsFolderModal = ({ hideModal }: PromptModsFolderModalProps) => {
  const [loading, setLoading] = useState(false);

  const clearPromptFlag = () => {
    window.electronAPI.clearPromptedModsFolder();
    hideModal();
  };

  const handleSelectModFolder = async () => {
    setLoading(true);
    const modFoler = await window.electronAPI.browse('directory', 'Select Mods Folder');
    if (!modFoler) {
      setLoading(false);
      sendLog({
        level: 'warning',
        message: 'No folder selected',
      });
      return;
    }
    window.electronAPI.saveModsFolder(modFoler);
    clearPromptFlag();
  };

  return (
    <Stack>
      <Text>
        Please select where you would like to store your mods when importing them using the mod manager. Either select
        browse to choose a custom location, or select default.
      </Text>
      {loading ? (
        <Button loading>Button</Button>
      ) : (
        <Group justify="space-evenly">
          <Button style={{ flex: 1 }} onClick={handleSelectModFolder}>
            Browse
          </Button>
          <HoverCard>
            <HoverCard.Target>
              <Button style={{ flex: 1 }} onClick={clearPromptFlag}>
                Default
              </Button>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Text>The default mod location is %AppData%/elden-mod-manager/mods</Text>
            </HoverCard.Dropdown>
          </HoverCard>
        </Group>
      )}
    </Stack>
  );
};
export default PromptModsFolderModal;

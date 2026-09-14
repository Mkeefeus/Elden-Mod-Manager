import { TextInput, Button, Stack, Group, Divider, Text } from '@mantine/core';
import { sendLog } from '@utils/rendererLogger';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const TEXT_INPUT_STYLE = { flex: 7 };
const BUTTON_STYLE = { flex: 1 };

const Settings = () => {
  const { data: modsPath } = useQuery({
    queryKey: ['mods-path'],
    queryFn: () => window.electronAPI.getModsPath(),
    staleTime: Infinity,
  });
  const { data: toolsPath } = useQuery({
    queryKey: ['tools-path'],
    queryFn: () => window.electronAPI.getToolsPath(),
    staleTime: Infinity,
  });
  const queryClient = useQueryClient();

  const handleBrowseMods = async () => {
    const path = await window.electronAPI.browse('directory', 'Select Folder');
    if (!path) {
      sendLog({ level: 'warning', message: 'No path selected' });
      return;
    }
    queryClient.setQueryData(['mods-path'], path);
    window.electronAPI.updateModsFolder(path);
  };

  const handleBrowseTools = async () => {
    const path = await window.electronAPI.browse('directory', 'Select Folder');
    if (!path) {
      sendLog({ level: 'warning', message: 'No path selected' });
      return;
    }
    queryClient.setQueryData(['tools-path'], path);
    window.electronAPI.updateToolsFolder(path);
  };

  return (
    <Stack gap={'md'} flex={'1 0 0'}>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Mods Folder Path"
          placeholder="Select Mod Folder"
          style={TEXT_INPUT_STYLE}
          value={modsPath ?? ''}
          disabled
        />
        <Button
          style={BUTTON_STYLE}
          onClick={() => {
            void handleBrowseMods();
          }}
        >
          Browse
        </Button>
      </Group>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Tools Folder Path"
          placeholder="Select Tools Folder"
          style={TEXT_INPUT_STYLE}
          value={toolsPath ?? ''}
          disabled
        />
        <Button
          style={BUTTON_STYLE}
          onClick={() => {
            void handleBrowseTools();
          }}
        >
          Browse
        </Button>
      </Group>
      <Divider mt="sm" />
      <Text size="sm" fw={500} c="dimmed">
        Backup
      </Text>
      <Group>
        <Button
          variant="outline"
          onClick={() => {
            void window.electronAPI.exportSettings().then((success) => {
              if (success) sendLog({ level: 'info', message: 'Settings exported successfully' });
            });
          }}
        >
          Export Settings
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            void window.electronAPI.importSettings().then((result) => {
              if (!result) return;
              queryClient.setQueryData(['mods-path'], result.modFolderPath);
              if (result.toolFolderPath) {
                queryClient.setQueryData(['tools-path'], result.toolFolderPath);
              }
              sendLog({ level: 'info', message: 'Settings imported successfully' });
            });
          }}
        >
          Import Settings
        </Button>
      </Group>
    </Stack>
  );
};

export default Settings;

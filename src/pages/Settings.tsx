import { TextInput, Button, Stack, Group, Divider, Text } from '@mantine/core';
import { sendLog } from '@utils/rendererLogger';
import { errToString } from '@utils/utilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SettingSwitch from '@components/shared/SettingSwitch';
import { GeneralSettings } from 'types';

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

  const { data: generalSettings } = useQuery({
    queryKey: ['general-settings'],
    queryFn: () => window.electronAPI.getGeneralSettings(),
    staleTime: Infinity,
  });

  const loading = modsPath === undefined || toolsPath === undefined || generalSettings === undefined;

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

  const handleUpdateGeneralSettings = async (value: Partial<GeneralSettings>) => {
    try {
      // Wait for the main process to save before refetching anything that depends on the new value
      await window.electronAPI.updateGeneralSettings(value);
      await queryClient.invalidateQueries({ queryKey: ['general-settings'] });
      // The main process returns no updates while these checks are off, so refetch to show/clear the results
      if (value.checkForModUpdatesOnStartup !== undefined) {
        await queryClient.invalidateQueries({ queryKey: ['mod-updates'] });
      }
      if (value.checkForAppUpdatesOnStartup !== undefined) {
        await queryClient.invalidateQueries({ queryKey: ['latest-release'] });
      }
    } catch (err) {
      sendLog({ level: 'error', message: `Error updating general settings: ${errToString(err)}` });
    }
  };

  return loading ? (
    <Text>Loading...</Text>
  ) : (
    <Stack gap={'md'} flex={'1 0 0'}>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Mods Folder Path"
          placeholder="Select Mod Folder"
          style={TEXT_INPUT_STYLE}
          value={modsPath}
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
          value={toolsPath}
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
        General
      </Text>
      <SettingSwitch
        label="Remember Last Page"
        description="Reopen on whichever page you had open last time (default: on)"
        checked={generalSettings.rememberLastPage}
        onChange={(checked) => void handleUpdateGeneralSettings({ rememberLastPage: checked })}
      />
      <SettingSwitch
        label="Check for Mod Updates on Startup"
        description="Automatically check for mod updates when the app starts (default: on)"
        checked={generalSettings.checkForModUpdatesOnStartup}
        onChange={(checked) => void handleUpdateGeneralSettings({ checkForModUpdatesOnStartup: checked })}
      />
      <SettingSwitch
        label="Check for App Updates on Startup"
        description="Automatically check for app updates when the app starts (default: on)"
        checked={generalSettings.checkForAppUpdatesOnStartup}
        onChange={(checked) => void handleUpdateGeneralSettings({ checkForAppUpdatesOnStartup: checked })}
      />
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
            void (async () => {
              try {
                const result = await window.electronAPI.importSettings();
                if (!result) return;
                queryClient.setQueryData(['mods-path'], result.modFolderPath);
                if (result.toolFolderPath) {
                  queryClient.setQueryData(['tools-path'], result.toolFolderPath);
                }
                if (result.generalSettings) {
                  // Refetch rather than caching the file's contents - it may be missing keys the backend fills in
                  await queryClient.invalidateQueries({ queryKey: ['general-settings'] });
                  await queryClient.invalidateQueries({ queryKey: ['mod-updates'] });
                  await queryClient.invalidateQueries({ queryKey: ['latest-release'] });
                }
                sendLog({ level: 'info', message: 'Settings imported successfully' });
              } catch (err) {
                sendLog({ level: 'error', message: `Error importing settings: ${errToString(err)}` });
              }
            })();
          }}
        >
          Import Settings
        </Button>
      </Group>
    </Stack>
  );
};

export default Settings;

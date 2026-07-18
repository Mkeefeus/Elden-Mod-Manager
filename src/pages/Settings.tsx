import { TextInput, Button, Stack, Group, Switch, Divider, Text } from '@mantine/core';
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
  const { data: launcherSettings } = useQuery({
    queryKey: ['launcher-settings'],
    queryFn: () => window.electronAPI.getLauncherSettings(),
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
      <Divider mt="sm" />
      <Text size="sm" fw={500} c="dimmed">
        Launcher Settings
      </Text>
      <Switch
        label="Disable Boot Boost"
        description="Don't cache decrypted BHD files — increases startup time (default: off)"
        checked={launcherSettings?.noBootBoost ?? false}
        onChange={(e) => {
          const checked = e.currentTarget.checked;
          queryClient.setQueryData(['launcher-settings'], { ...launcherSettings!, noBootBoost: checked });
          window.electronAPI.updateLauncherSettings({ noBootBoost: checked });
        }}
      />
      <Switch
        label="Show Intro Logos"
        description="Show game intro logos on launch (default: off)"
        checked={launcherSettings?.showLogos ?? false}
        onChange={(e) => {
          const checked = e.currentTarget.checked;
          queryClient.setQueryData(['launcher-settings'], { ...launcherSettings!, showLogos: checked });
          window.electronAPI.updateLauncherSettings({ showLogos: checked });
        }}
      />
      <Switch
        label="Skip Steam Init"
        description="Skip initializing Steam within the launcher (default: off)"
        checked={launcherSettings?.skipSteamInit ?? false}
        onChange={(e) => {
          const checked = e.currentTarget.checked;
          queryClient.setQueryData(['launcher-settings'], { ...launcherSettings!, skipSteamInit: checked });
          window.electronAPI.updateLauncherSettings({ skipSteamInit: checked });
        }}
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
            void window.electronAPI.importSettings().then((result) => {
              if (!result) return;
              queryClient.setQueryData(['mods-path'], result.modFolderPath);
              queryClient.setQueryData(['launcher-settings'], {
                noBootBoost: result.noBootBoost,
                showLogos: result.showLogos,
                skipSteamInit: result.skipSteamInit,
              });
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

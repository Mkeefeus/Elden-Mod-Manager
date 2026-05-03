import { TextInput, Button, Stack, Group, Switch, Divider, Text, Loader } from '@mantine/core';
import { useEffect, useState } from 'react';
import { sendLog } from '../utils/rendererLogger';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const TEXT_INPUT_STYLE = { flex: 7 };
const BUTTON_STYLE = { flex: 1 };

const Settings = () => {
  const { data: nexusApiKey } = useQuery({
    queryKey: ['nexus-api-key'],
    queryFn: () => window.electronAPI.getNexusApiKey(),
  });

  const { data: me3Path } = useQuery({
    queryKey: ['me3-path'],
    queryFn: () => window.electronAPI.getME3Path(),
    staleTime: Infinity,
  });
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
  const [draftKey, setDraftKey] = useState<string>(nexusApiKey ?? '');
  const queryClient = useQueryClient();

  const {
    data: nexusUser,
    isFetching: nexusValidating,
    error: nexusError,
  } = useQuery({
    queryKey: ['nexus-user'],
    queryFn: () => window.electronAPI.validateNexusApiKey(),
    staleTime: Infinity,
    retry: false,
    enabled: !!nexusApiKey,
  });

  useEffect(() => {
    if (nexusApiKey !== undefined) setDraftKey(nexusApiKey);
  }, [nexusApiKey]);

  const handleBrowse = async (field: string) => {
    const path = await window.electronAPI.browse('directory', 'Select Folder');
    if (!path) {
      sendLog({ level: 'warning', message: 'No path selected' });
      return;
    }
    if (field === 'me3') {
      queryClient.setQueryData(['me3-path'], path);
      window.electronAPI.updateME3Path(path);
    } else {
      queryClient.setQueryData(['mods-path'], path);
      window.electronAPI.updateModsFolder(path);
    }
  };

  const handleBrowseME3Exe = async () => {
    const path = await window.electronAPI.browse('exe', 'Select ME3 Executable (me3.exe)');
    if (!path) {
      sendLog({ level: 'warning', message: 'No path selected' });
      return;
    }
    queryClient.setQueryData(['me3-path'], path);
    window.electronAPI.updateME3Path(path);
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
            void handleBrowse('mods');
          }}
        >
          Browse
        </Button>
      </Group>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Mod Engine 3 Path (me3.exe)"
          placeholder="Auto-detected or browse to me3.exe"
          style={TEXT_INPUT_STYLE}
          value={me3Path ?? ''}
          disabled
        />
        <Button
          style={BUTTON_STYLE}
          onClick={() => {
            void handleBrowseME3Exe();
          }}
        >
          Browse
        </Button>
      </Group>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Nexus Mods API Key (Premium only)"
          placeholder="Enter your Nexus Mods API Key"
          style={TEXT_INPUT_STYLE}
          value={draftKey}
          disabled={nexusValidating}
          error={nexusError ? nexusError.message : undefined}
          description={
            nexusValidating ? (
              <Group gap={4}>
                <Loader size={10} />
                <span>Validating...</span>
              </Group>
            ) : nexusUser ? (
              <Text size="xs" c="green">
                Connected as {nexusUser.name}
                {nexusUser.premium ? ' (Premium)' : ''}
              </Text>
            ) : undefined
          }
          onChange={(e) => {
            setDraftKey(e.currentTarget.value);
          }}
          onBlur={() => {
            if (!draftKey) return;
            void window.electronAPI
              .setNexusApiKey(draftKey)
              .then(() => queryClient.invalidateQueries({ queryKey: ['nexus-user'] }))
              .catch(() => queryClient.invalidateQueries({ queryKey: ['nexus-user'] }));
          }}
        />
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
    </Stack>
  );
};

export default Settings;

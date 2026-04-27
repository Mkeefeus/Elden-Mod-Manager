import { TextInput, Button, Stack, Group, Switch, Divider, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { sendLog } from '../utils/rendererLogger';

const TEXT_INPUT_STYLE = { flex: 7 };
const BUTTON_STYLE = { flex: 1 };

const Settings = () => {
  const [me3Path, setMe3Path] = useState<string>('');
  const [modsPath, setModsPath] = useState<string>('');
  const [noBootBoost, setNoBootBoost] = useState<boolean>(false);
  const [showLogos, setShowLogos] = useState<boolean>(false);
  const [skipSteamInit, setSkipSteamInit] = useState<boolean>(false);

  const getPaths = async () => {
    const me3Path = await window.electronAPI.getME3Path();
    const modsPath = await window.electronAPI.getModsPath();
    setMe3Path(me3Path);
    setModsPath(modsPath);
    const launcher = await window.electronAPI.getLauncherSettings();
    setNoBootBoost(launcher.noBootBoost);
    setShowLogos(launcher.showLogos);
    setSkipSteamInit(launcher.skipSteamInit);
  };

  useEffect(() => {
    void getPaths();
  }, []);

  const handleBrowse = async (field: string) => {
    const path = await window.electronAPI.browse('directory', 'Select Folder');
    if (!path) {
      sendLog({ level: 'warning', message: 'No path selected' });
      return;
    }
    if (field === 'me3') {
      setMe3Path(path);
      window.electronAPI.updateME3Path(path);
    } else {
      setModsPath(path);
      window.electronAPI.updateModsFolder(path);
    }
  };

  const handleBrowseME3Exe = async () => {
    const path = await window.electronAPI.browse('exe', 'Select ME3 Executable (me3.exe)');
    if (!path) {
      sendLog({ level: 'warning', message: 'No path selected' });
      return;
    }
    setMe3Path(path);
    window.electronAPI.updateME3Path(path);
  };

  return (
    <Stack gap={'md'} flex={'1 0 0'}>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Mods Folder Path"
          placeholder="Select Mod Folder"
          style={TEXT_INPUT_STYLE}
          value={modsPath}
          disabled
        />
        <Button style={BUTTON_STYLE} onClick={() => { void handleBrowse('mods'); }}>
          Browse
        </Button>
      </Group>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Mod Engine 3 Path (me3.exe)"
          placeholder="Auto-detected or browse to me3.exe"
          style={TEXT_INPUT_STYLE}
          value={me3Path}
          disabled
        />
        <Button style={BUTTON_STYLE} onClick={() => { void handleBrowseME3Exe(); }}>
          Browse
        </Button>
      </Group>
      <Divider mt="sm" />
      <Text size="sm" fw={500} c="dimmed">Launcher Settings</Text>
      <Switch
        label="Disable Boot Boost"
        description="Don't cache decrypted BHD files — increases startup time (default: off)"
        checked={noBootBoost}
        onChange={(e) => {
          setNoBootBoost(e.currentTarget.checked);
          window.electronAPI.updateLauncherSettings({ noBootBoost: e.currentTarget.checked });
        }}
      />
      <Switch
        label="Show Intro Logos"
        description="Show game intro logos on launch (default: off)"
        checked={showLogos}
        onChange={(e) => {
          setShowLogos(e.currentTarget.checked);
          window.electronAPI.updateLauncherSettings({ showLogos: e.currentTarget.checked });
        }}
      />
      <Switch
        label="Skip Steam Init"
        description="Skip initializing Steam within the launcher (default: off)"
        checked={skipSteamInit}
        onChange={(e) => {
          setSkipSteamInit(e.currentTarget.checked);
          window.electronAPI.updateLauncherSettings({ skipSteamInit: e.currentTarget.checked });
        }}
      />
    </Stack>
  );
};

export default Settings;

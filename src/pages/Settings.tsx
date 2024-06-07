import { TextInput, Button, Stack, Group } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { sendLog } from '../utils/rendererLogger';

const TEXT_INPUT_STYLE = { flex: 7 };
const BUTTON_STYLE = { flex: 1 };

const Settings = () => {
  const [me2Path, setMe2Path] = useState<string | undefined>('');
  const [modsPath, setModsPath] = useState<string | undefined>('');

  // Refs to track if it's the initial render
  const isInitialMe2PathRender = useRef(true);
  const isInitialModsPathRender = useRef(true);

  const getPaths = async () => {
    const me2Path = await window.electronAPI.getME2Path();
    const modsPath = await window.electronAPI.getModsPath();
    setMe2Path(me2Path);
    setModsPath(modsPath);
  };

  useEffect(() => {
    getPaths();
  }, []);

  useEffect(() => {
    if (!me2Path) return;
    if (isInitialMe2PathRender.current) {
      isInitialMe2PathRender.current = false;
      return;
    }
    console.log('updating me2 path', me2Path);
    window.electronAPI.updateME2Path(me2Path);
  }, [me2Path]);

  useEffect(() => {
    if (!modsPath) return;
    if (isInitialModsPathRender.current) {
      isInitialModsPathRender.current = false;
      return;
    }
    window.electronAPI.updateModsFolder(modsPath);
  }, [modsPath]);

  const handleBrowse = async (field: string) => {
    const path = await window.electronAPI.browse('directory', 'Select Folder');
    if (!path) {
      sendLog({ level: 'warning', message: 'No path selected' });
    }
    console.log('path', path)
    field === 'me2' ? setMe2Path(path) : setModsPath(path);
  };

  return (
    <Stack gap={'md'} style={{ height: '100%' }}>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Mods Folder Path"
          placeholder="Select Mod Folder"
          style={TEXT_INPUT_STYLE}
          defaultValue={modsPath}
          disabled
        />
        <Button style={BUTTON_STYLE} onClick={() => handleBrowse('mods')}>
          Browse
        </Button>
      </Group>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Mod Engine 2 Path"
          placeholder="Select Mod Engine 2 Executable"
          style={TEXT_INPUT_STYLE}
          defaultValue={me2Path}
          disabled
        />
        <Button style={BUTTON_STYLE} onClick={() => handleBrowse('me2')}>
          Browse
        </Button>
      </Group>
    </Stack>
  );
};

export default Settings;

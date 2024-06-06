import { TextInput, Button, Stack, Group } from '@mantine/core';
import { useEffect, useState } from 'react';

const TEXT_INPUT_STYLE = { flex: 7 };
const BUTTON_STYLE = { flex: 1 };

const Settings = () => {
  const [me2Path, setMe2Path] = useState<string | undefined>('');
  const [modsPath, setModsPath] = useState<string | undefined>('');

  const getPaths = async () => {
    const me2Path = await window.electronAPI.getME2Path();
    const modsPath = await window.electronAPI.getModsPath();
    setMe2Path(me2Path);
    setModsPath(modsPath);
  };

  useEffect(() => {
    getPaths();
  }, []);

  return (
    <Stack gap={'md'} style={{ height: '100%' }}>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput label="Mods Folder Path" placeholder="Select Mod Folder" style={TEXT_INPUT_STYLE} value={modsPath} />
        <Button style={BUTTON_STYLE}>Browse</Button>
      </Group>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Mod Engine 2 Path"
          placeholder="Select Mod Engine 2 Executable"
          style={TEXT_INPUT_STYLE}
          value={me2Path}
        />
        <Button style={BUTTON_STYLE}>Browse</Button>
      </Group>
    </Stack>
  );
};

export default Settings;

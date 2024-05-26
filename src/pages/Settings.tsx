import { TextInput, Button, Stack, Group } from '@mantine/core';

const TEXT_INPUT_STYLE = { flex: 7 };
const BUTTON_STYLE = { flex: 1 };

const Settings = () => {
  return (
    <Stack gap={'md'} style={{ height: '100%' }}>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput label="Mods Folder Path" placeholder="Select Elden Ring Executable" style={TEXT_INPUT_STYLE} />
        <Button style={BUTTON_STYLE}>Browse</Button>
      </Group>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput label="Mod Engine 2 Path" placeholder="Select Mod Engine 2 Executable" style={TEXT_INPUT_STYLE} />
        <Button style={BUTTON_STYLE}>Browse</Button>
      </Group>
    </Stack>
  );
};

export default Settings;

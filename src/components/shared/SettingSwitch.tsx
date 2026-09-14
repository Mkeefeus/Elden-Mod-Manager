import { Group, Stack, Switch, Text } from '@mantine/core';

type SettingSwitchProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

// Mantine's Switch normally wraps its label/description in the same clickable element as the
// track, so clicking the text toggles it too. Rendering the text separately, outside the Switch,
// keeps the track itself as the only clickable target.
const SettingSwitch = ({ label, description, checked, onChange }: SettingSwitchProps) => (
  <Group wrap="nowrap" align="flex-start" gap="sm">
    <Switch mt={2} checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
    <Stack gap={0} style={{ flex: 1 }}>
      <Text size="sm">{label}</Text>
      <Text size="xs" c="dimmed">
        {description}
      </Text>
    </Stack>
  </Group>
);

export default SettingSwitch;

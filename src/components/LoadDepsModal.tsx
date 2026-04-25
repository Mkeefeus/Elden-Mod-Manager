import { Button, Group, MultiSelect, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { Mod } from 'types';
import { useMods } from '../providers/ModsProvider';

interface LoadDepsModalProps {
  mod: Mod;
  hideModal: () => void;
}

const LoadDepsModal = ({ mod, hideModal }: LoadDepsModalProps) => {
  const { mods, saveMods } = useMods();
  const [loadBefore, setLoadBefore] = useState<string[]>(mod.loadBefore ?? []);
  const [loadAfter, setLoadAfter] = useState<string[]>(mod.loadAfter ?? []);

  // Other mods available as dependency targets
  const otherMods = mods
    .filter((m) => m.uuid !== mod.uuid)
    .map((m) => ({ value: m.uuid, label: m.name }));

  const handleSave = () => {
    const newMods = mods.map((m) =>
      m.uuid === mod.uuid ? { ...m, loadBefore, loadAfter } : m
    );
    void saveMods(newMods);
    hideModal();
  };

  return (
    <Stack>
      <Text fz="sm" c="dimmed">
        Configure the load order of <strong>{mod.name}</strong> relative to other mods.
        These map to ME3&apos;s <code>load_before</code> / <code>load_after</code> fields.
      </Text>
      <MultiSelect
        label="Load before"
        description="This mod loads before the selected mods"
        data={otherMods}
        value={loadBefore}
        onChange={setLoadBefore}
        searchable
        clearable
      />
      <MultiSelect
        label="Load after"
        description="This mod loads after the selected mods"
        data={otherMods}
        value={loadAfter}
        onChange={setLoadAfter}
        searchable
        clearable
      />
      <Group justify="flex-end" mt="sm">
        <Button variant="outline" onClick={hideModal}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </Group>
    </Stack>
  );
};

export default LoadDepsModal;

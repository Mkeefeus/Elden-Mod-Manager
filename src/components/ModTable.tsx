import ModTableHeader from './ModTableHeader';
import { Mod } from 'types';
import { Table, Checkbox, Center, ScrollArea } from '@mantine/core';
import ModTableMenu from './ModTableMenu';

const columns = [
  { label: 'Enabled', sortKey: 'enabled' },
  { label: 'Load order', sortKey: 'loadOrder' },
  { label: 'Mod name', sortKey: 'name' },
  { label: 'Install date', sortKey: 'installDate' },
  { label: 'Is DLL', sortKey: 'dllFile' },
];

type ModTableProps = {
  mods: Mod[];
  sort: { column: string; order: 'asc' | 'desc' };
  saveMods: (mods: Mod[]) => Promise<void>;
  loadMods: () => void;
  changeSort: (column: string) => void;
};

const ModTable = ({ mods, sort, saveMods, loadMods, changeSort }: ModTableProps) => {
  const handleCheckboxChange = (index: number) => {
    const newMods = [...mods];
    const mod = newMods[index];
    mod.enabled = !mod.enabled;
    saveMods(newMods).catch(console.error);
  };

  const handleOpenExe = (mod: Mod) => {
    window.electronAPI.launchModExe(mod);
  };

  const getSwapIndex = (mod: Mod, direction: 'up' | 'down') => {
    if (!mod.loadOrder) {
      console.error('swap mod has no load order YOU FOOL 🤬');
      return;
    }
    const swapLoadOrder = direction === 'up' ? mod.loadOrder - 1 : mod.loadOrder + 1;
    const swapIndex = mods.findIndex((m) => m.loadOrder === swapLoadOrder);
    return swapIndex;
  };

  const changePriority = (mod: Mod, direction: 'up' | 'down') => {
    const index = mods.findIndex((m) => m.uuid === mod.uuid);
    const swapIndex = getSwapIndex(mod, direction);
    if (swapIndex === undefined) {
      return;
    }
    // Check if swapIndex is within the valid range
    if (swapIndex < 0 || swapIndex >= mods.length) {
      return;
    }
    const newMods = [...mods];
    const temp = newMods[index].loadOrder;
    newMods[index].loadOrder = newMods[swapIndex].loadOrder;
    newMods[swapIndex].loadOrder = temp;
    saveMods(newMods).catch(console.error);
  };

  const handleDelete = async (mod: Mod) => {
    const deleted = await window.electronAPI.deleteMod(mod);
    if (!deleted) {
      console.error('Failed to delete mod');
    }
    loadMods();
  };

  const rows = mods.map((mod, index) => {
    return (
      <Table.Tr key={mod.uuid} bg={mod.enabled ? 'dark.8' : undefined}>
        <Table.Td>
          <Center>
            <Checkbox
              aria-label="Select row"
              checked={mod.enabled}
              onChange={() => {
                handleCheckboxChange(index);
              }}
            />
          </Center>
        </Table.Td>
        <Table.Td>{mod.loadOrder || '-'}</Table.Td>
        <Table.Td>{mod.name}</Table.Td>
        <Table.Td>
          {new Date(mod.installDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}
        </Table.Td>
        <Table.Td>{mod.dllFile ? '✓' : undefined}</Table.Td>
        <ModTableMenu
          canMove={{
            up: (mod.enabled && mod.loadOrder && mod.loadOrder > 1) || false,
            down: (mod.enabled && mod.loadOrder && mod.loadOrder < mods.filter((mod) => mod.enabled).length) || false,
          }}
          hasExe={mod.exe != undefined}
          handleDelete={() => handleDelete(mod)}
          changePriority={(direction: 'up' | 'down') => changePriority(mod, direction)}
          handleOpenExe={() => handleOpenExe(mod)}
        />
      </Table.Tr>
    );
  });
  return (
    <ScrollArea>
      <Table withRowBorders layout={'fixed'}>
        <Table.Thead>
          <Table.Tr>
            {columns.map(({ label, sortKey }) => (
              <ModTableHeader
                key={sortKey}
                sortedBy={sort.column === sortKey}
                label={label}
                sortIcon={sort.order || false}
                handleSort={() => changeSort(sortKey)}
              />
            ))}
            <Table.Th c="gray">More</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </ScrollArea>
  );
};

export default ModTable;

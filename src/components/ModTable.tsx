import ModTableHeader from './ModTableHeader';
import { Table, Checkbox, Center } from '@mantine/core';
import ModTableMenu from './ModTableMenu';
import { useMods } from '../providers/ModsProvider';

const columns = [
  { label: 'Enabled', sortKey: 'enabled' },
  { label: 'Load order', sortKey: 'loadOrder' },
  { label: 'Mod name', sortKey: 'name' },
  { label: 'Install date', sortKey: 'installDate' },
  { label: 'Is DLL', sortKey: 'dllFile' },
];

const ModTable = () => {
  const { mods, sort, saveMods, changeSort } = useMods();
  const handleCheckboxChange = (index: number) => {
    const newMods = [...mods];
    const mod = newMods[index];
    mod.enabled = !mod.enabled;
    saveMods(newMods);
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
        <ModTableMenu mod={mod} />
      </Table.Tr>
    );
  });
  return (
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
  );
};

export default ModTable;

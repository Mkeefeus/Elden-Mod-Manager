import ModTableHeader from './ModTableHeader';
import { Badge, Center, Checkbox, Table, Text, Tooltip } from '@mantine/core';
import ModTableMenu from './ModTableMenu';
import { useMods } from '../providers/ModsProvider';

// Fixed px widths for narrow columns; Name column has no width → takes remaining space.
const COLS = [
  { label: 'Enabled', sortKey: 'enabled', style: { width: 130 } },
  { label: 'Deps', sortKey: 'deps', style: { width: 100 } },
  { label: 'Mod name', sortKey: 'name', style: {} },
  { label: 'Date', sortKey: 'installDate', style: { width: 120 } },
  { label: 'DLL', sortKey: 'dllFile', style: { width: 100 } },
] as const;

const ModTable = () => {
  const { mods, sort, saveMods, changeSort } = useMods();

  const handleCheckboxChange = (index: number) => {
    const newMods = [...mods];
    newMods[index].enabled = !newMods[index].enabled;
    void saveMods(newMods);
  };

  const rows = mods.map((mod, index) => {
    const depCount = (mod.loadBefore?.length ?? 0) + (mod.loadAfter?.length ?? 0);
    return (
      <Table.Tr key={mod.uuid} style={{ opacity: mod.enabled ? 1 : 0.4, transition: 'opacity 0.15s ease' }}>
        <Table.Td>
          <Center>
            <Checkbox aria-label="Toggle mod" checked={mod.enabled} onChange={() => handleCheckboxChange(index)} />
          </Center>
        </Table.Td>
        <Table.Td>
          <Center>
            {depCount > 0 ? (
              <Badge size="sm" variant="light">
                {depCount}
              </Badge>
            ) : (
              <Text size="sm" c="dimmed">
                —
              </Text>
            )}
          </Center>
        </Table.Td>
        {/* maxWidth: 0 forces the fixed-layout cell to clip rather than expand */}
        <Table.Td style={{ maxWidth: 0, overflow: 'hidden' }}>
          <Tooltip label={mod.name} openDelay={500} withArrow>
            <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mod.name}
            </Text>
          </Tooltip>
        </Table.Td>
        <Table.Td>
          <Text size="sm">
            {new Date(mod.installDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </Text>
        </Table.Td>
        <Table.Td>
          <Center>
            {mod.dllFile ? (
              <Text size="sm" c="green" fw={600}>
                ✓
              </Text>
            ) : (
              <Text size="sm" c="dimmed">
                —
              </Text>
            )}
          </Center>
        </Table.Td>
        <ModTableMenu mod={mod} />
      </Table.Tr>
    );
  });

  return (
    <Table
      withRowBorders
      highlightOnHover
      layout="fixed"
      horizontalSpacing="xs"
      verticalSpacing="xs"
      style={{ width: '100%', minWidth: 520 }}
    >
      <Table.Thead>
        <Table.Tr>
          {COLS.map(({ label, sortKey, style }) => (
            <ModTableHeader
              key={sortKey}
              sortedBy={sort.column === sortKey}
              label={label}
              sortIcon={sort.order || false}
              handleSort={() => changeSort(sortKey)}
              style={style}
            />
          ))}
          <Table.Th c="dimmed" style={{ width: 90 }}>
            More
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};

export default ModTable;

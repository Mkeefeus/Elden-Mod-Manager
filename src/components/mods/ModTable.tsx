import { Center, Checkbox, Table, Text } from '@mantine/core';
import ModTableMenu from './ModTableMenu';
import { useMods } from '@providers/ModsProvider';
import SortableTableHeader from '../shared/SortableTableHeader';
import TruncatedNameCell from '../shared/TruncatedNameCell';
import DateCell from '../shared/DateCell';
import { useMemo, useState } from 'react';
import TableHeader from '../shared/TableHeader';

type ModSortColumn = 'enabled' | 'name' | 'version' | 'installDate' | 'dllFile';
type ModSortState = { column: ModSortColumn; order: 'asc' | 'desc' };

type ModColumn = {
  label: string;
  align: 'left' | 'center' | 'right';
  sortKey?: ModSortColumn;
  style?: React.CSSProperties;
  color?: string;
};

const COLS: readonly ModColumn[] = [
  { label: 'Enabled', sortKey: 'enabled', style: { width: 130 }, align: 'center' },
  { label: 'Mod name', sortKey: 'name', align: 'left' },
  { label: 'Version', sortKey: 'version', style: { width: 110 }, align: 'center' },
  { label: 'Install Date', sortKey: 'installDate', style: { width: 130 }, align: 'center' },
  { label: 'Mod Type', sortKey: 'dllFile', style: { width: 110 }, align: 'center' },
  { label: 'More', style: { width: 90 }, align: 'center', color: 'dimmed' },
];

const ModTable = () => {
  const { mods, saveMods } = useMods();
  const [sort, setSort] = useState<ModSortState>({ column: 'installDate', order: 'desc' });

  const sortedMods = useMemo(() => {
    const getComparable = (value: string | boolean | number | undefined) => {
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (value === undefined) return '';
      return value;
    };

    return [...mods].sort((a, b) => {
      const aValue = getComparable(a[sort.column]);
      const bValue = getComparable(b[sort.column]);

      if (aValue < bValue) return sort.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [mods, sort]);

  const handleSort = (column: ModSortColumn) => {
    setSort((current) => {
      if (current.column === column) {
        return { column, order: current.order === 'asc' ? 'desc' : 'asc' };
      }
      return { column, order: 'desc' };
    });
  };

  const handleCheckboxChange = (uuid: string) => {
    const newMods = mods.map((mod) => (mod.uuid === uuid ? { ...mod, enabled: !mod.enabled } : mod));
    void saveMods(newMods);
  };

  const rows = sortedMods.map((mod) => {
    return (
      <Table.Tr key={mod.uuid} style={{ opacity: mod.enabled ? 1 : 0.4, transition: 'opacity 0.15s ease' }}>
        <Table.Td>
          <Center>
            <Checkbox aria-label="Toggle mod" checked={mod.enabled} onChange={() => handleCheckboxChange(mod.uuid)} />
          </Center>
        </Table.Td>
        <TruncatedNameCell name={mod.name} />
        <Table.Td>
          <Text size="sm">
            {mod.version ?? (
              <Text size="sm" c="dimmed">
                —
              </Text>
            )}
          </Text>
        </Table.Td>
        <DateCell value={mod.installDate} />
        <Table.Td>
          <Center>{mod.dllFile ? <Text size="sm">Native</Text> : <Text size="sm">Package</Text>}</Center>
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
          {COLS.map(({ label, sortKey, style, align }) =>
            sortKey ? (
              <SortableTableHeader
                key={sortKey}
                sortedBy={sort.column === sortKey}
                label={label}
                sortOrder={sort.order || false}
                onSort={() => handleSort(sortKey)}
                style={style}
                align={align}
              />
            ) : (
              <TableHeader key={label} label={label} style={style} align={align} />
            )
          )}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};

export default ModTable;

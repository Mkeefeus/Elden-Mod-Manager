import { useEffect, useState } from 'react';
import { Table, Checkbox, Button } from '@mantine/core';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ModTableHeader from './ModTableHeader';

type Mod = {
  enabled: boolean;
  loadOrder?: number;
  name: string;
  installDate: number;
  isDll: boolean;
  isFileMod: boolean;
};

const debugMods: Mod[] = [
  {
    enabled: true,
    loadOrder: 2,
    name: 'Seemless Co-Op',
    installDate: 1621483200000,
    isDll: true,
    isFileMod: false,
  },
  {
    enabled: false,
    name: 'Item and Enemy Randomizer',
    installDate: 1600574400000,
    isDll: false,
    isFileMod: true,
  },
  {
    enabled: true,
    loadOrder: 1,
    name: 'Melania Big Tiddy Mod',
    installDate: 1665374400000,
    isDll: false,
    isFileMod: true,
  },
];

type SortObject = {
  column: string;
  order: 'asc' | 'desc';
};

const ModTable = () => {
  const [mods, setMods] = useState<Mod[]>(debugMods);
  const [sort, setSort] = useState<SortObject>({ column: 'enabled', order: 'asc' });

  const getComparable = (value: Date | boolean | number | string | undefined): number | string => {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value || '';
  };

  const loadOrderSorter = (a: Mod, b: Mod, order: 'asc' | 'desc'): number => {
    if (a.loadOrder && b.loadOrder) {
      return order === 'asc' ? a.loadOrder - b.loadOrder : b.loadOrder - a.loadOrder;
    }
    return 0;
  };

  const columnSorter = (a: Mod, b: Mod, column: keyof Mod, order: 'asc' | 'desc'): number => {
    const aValue = getComparable(a[column]);
    const bValue = getComparable(b[column]);

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  };

  useEffect(() => {
    if (sort.column === 'loadOrder') {
      const disabledMods = mods.filter((mod) => !mod.enabled);
      const enabledMods = [...mods].filter((mod) => mod.enabled).sort((a, b) => loadOrderSorter(a, b, sort.order));
      setMods([...enabledMods, ...disabledMods]);
    } else {
      setMods([...mods].sort((a, b) => columnSorter(a, b, sort.column as keyof Mod, sort.order)));
    }
  }, [sort]);

  const handleSort = (column: string) => {
    if (sort.column === column) {
      setSort({ column, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ column, order: 'asc' });
    }
  };

  const rows = mods.map((mod, index) => {
    return (
      <Table.Tr key={mod.name} bg={mod.enabled ? 'var(--mantine-color-blue-light)' : undefined}>
        <Table.Td>
          <Checkbox
            aria-label="Select row"
            checked={mod.enabled}
            onChange={() => {
              const newMods = [...mods];
              newMods[index].enabled = !newMods[index].enabled;
              setMods(newMods);
            }}
          />
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
        <Table.Td style={{ textAlign: 'center' }}>{mod.isDll ? '✓' : undefined}</Table.Td>
        <Table.Td style={{ textAlign: 'center' }}>{mod.isFileMod ? '✓' : undefined}</Table.Td>
        <Table.Td>
          <Button variant="transparent" color="gray">
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </Button>
        </Table.Td>
      </Table.Tr>
    );
  });
  return (
    <Table style={{ tableLayout: 'fixed', width: '100%' }}>
      <Table.Thead>
        <Table.Tr>
          <ModTableHeader
            label="Enabled"
            sortIcon={sort.column === 'enabled' ? sort.order : false}
            handleSort={() => handleSort('enabled')}
          />
          <ModTableHeader
            label="Load order"
            sortIcon={sort.column === 'loadOrder' ? sort.order : false}
            handleSort={() => handleSort('loadOrder')}
          />
          <ModTableHeader
            label="Mod name"
            sortIcon={sort.column === 'name' ? sort.order : false}
            handleSort={() => handleSort('name')}
          />
          <ModTableHeader
            label="Install date"
            sortIcon={sort.column === 'installDate' ? sort.order : false}
            handleSort={() => handleSort('installDate')}
          />
          <ModTableHeader
            label="Is DLL"
            sortIcon={sort.column === 'isDll' ? sort.order : false}
            handleSort={() => handleSort('isDll')}
          />
          <ModTableHeader
            label="Is File Mod"
            sortIcon={sort.column === 'isFileMod' ? sort.order : false}
            handleSort={() => handleSort('isFileMod')}
          />
          <Table.Th>More</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};

export default ModTable;

import ModTableHeader from '../components/ModTableHeader';
import { useEffect, useState } from 'react';
import { Table, Checkbox, Button, Flex, Center } from '@mantine/core';
import ModTableMenu from '../components/ModTableMenu';

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

const columns = [
  { label: 'Enabled', sortKey: 'enabled' },
  { label: 'Load order', sortKey: 'loadOrder' },
  { label: 'Mod name', sortKey: 'name' },
  { label: 'Install date', sortKey: 'installDate' },
  { label: 'Is DLL', sortKey: 'isDll' },
  { label: 'Is File Mod', sortKey: 'isFileMod' },
];

const Mods = () => {
  const [mods, setMods] = useState<Mod[]>(debugMods);
  const [sort, setSort] = useState<SortObject>({ column: 'installDate', order: 'desc' });

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

  useEffect(() => {
    console.log('Mods changed', mods);
  }, [mods]);

  const handleSort = (column: string) => {
    if (sort.column === column) {
      setSort({ column, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ column, order: 'asc' });
    }
  };

  const handleDelete = (mod: Mod) => {
    console.log('Delete', mod.name);
  };

  const handleMove = (mod: Mod, direction: 'up' | 'down') => {
    console.log('Move', mod.name, direction);
  };

  const rows = mods.map((mod, index) => {
    return (
      <Table.Tr key={mod.name} bg={mod.enabled ? 'var(--mantine-color-blue-light)' : undefined}>
        <Table.Td>
          <Center>
            <Checkbox
              aria-label="Select row"
              checked={mod.enabled}
              onChange={() => {
                const newMods = [...mods];
                newMods[index].enabled = !newMods[index].enabled;
                setMods(newMods);
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
        <Table.Td style={{ textAlign: 'center' }}>{mod.isDll ? '✓' : undefined}</Table.Td>
        <Table.Td style={{ textAlign: 'center' }}>{mod.isFileMod ? '✓' : undefined}</Table.Td>
        <ModTableMenu
          isEnabled={mod.enabled}
          handleDelete={() => handleDelete(mod)}
          handleMove={(direction: 'up' | 'down') => handleMove(mod, direction)}
        />
      </Table.Tr>
    );
  });
  return (
    <Flex gap="xl" direction={'column'} justify={'center'}>
      <Table style={{ tableLayout: 'fixed', width: '100%', textAlign: 'center' }}>
        <Table.Thead>
          <Table.Tr>
            {columns.map(({ label, sortKey }) => (
              <ModTableHeader
                key={sortKey}
                label={label}
                sortIcon={sort.column === sortKey ? sort.order : false}
                handleSort={() => handleSort(sortKey)}
              />
            ))}
            <Table.Th style={{ textAlign: 'center' }}>More</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
      <Flex gap={'md'}>
        <Button variant="outline" style={{ flex: 1 }}>
          Add Mod
        </Button>
        <Button variant="outline" style={{ flex: 1 }}>
          Launch Game
        </Button>
      </Flex>
    </Flex>
  );
};

export default Mods;

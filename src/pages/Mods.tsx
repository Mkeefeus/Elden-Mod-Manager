import ModTableHeader from '../components/ModTableHeader';
import { Mod } from 'types';
import { useEffect, useState } from 'react';
import { Table, Checkbox, Button, Flex, Center } from '@mantine/core';
import ModTableMenu from '../components/ModTableMenu';

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
  const [mods, setMods] = useState<Mod[]>([]);
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

  const sortMods = (unsortedMods: Mod[]) => {
    if (sort.column === 'loadOrder') {
      const disabledMods = unsortedMods.filter((mod) => !mod.enabled);
      const enabledMods = [...unsortedMods]
        .filter((mod) => mod.enabled)
        .sort((a, b) => loadOrderSorter(a, b, sort.order));
      // setMods([...enabledMods, ...disabledMods]);
      return [...enabledMods, ...disabledMods];
    } else {
      // setMods([...unsortedMods].sort((a, b) => columnSorter(a, b, sort.column as keyof Mod, sort.order)));
      return [...unsortedMods].sort((a, b) => columnSorter(a, b, sort.column as keyof Mod, sort.order));
    }
  };

  useEffect(() => {
    window.electronAPI
      .loadMods()
      .then((result) => {
        setMods(sortMods(result));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setMods(sortMods(mods));
  }, [sort]);

  const handleSortChange = (column: string) => {
    if (sort.column === column) {
      setSort({ column, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ column, order: 'desc' });
    }
  };

  const validateLoadOrder = (newMods: Mod[]) => {
    const enabledMods = newMods.filter((mod) => mod.enabled);

    // Sort enabled mods by their current load order
    const sortedMods = [...enabledMods].sort(
      (a, b) => (a.loadOrder || enabledMods.length) - (b.loadOrder || enabledMods.length)
    );

    // Assign new load orders
    sortedMods.forEach((mod, index) => {
      mod.loadOrder = index + 1;
    });

    const disabledMods = newMods.filter((mod) => !mod.enabled).map((mod) => ({ ...mod, loadOrder: undefined }));
    return [...sortedMods, ...disabledMods];
  };

  const saveMods = async (newMods: Mod[]) => {
    const sortedMods = sortMods(newMods);
    const validatedMods = validateLoadOrder(sortedMods);
    await Promise.resolve();
    // const [success, error] = await window.electronAPI.saveMods(validatedMods);
    // if (!success) {
    //   console.log('Unable to save mods: ', error?.message);
    //   return;
    // }
    setMods(validatedMods);
  };

  const handleCheckboxChange = (index: number) => {
    console.log('Checkbox change', mods[index].name);
    const newMods = [...mods];
    const mod = newMods[index];
    mod.enabled = !mod.enabled;
    saveMods(newMods).catch(console.error);
  };

  const handleDelete = (mod: Mod) => {
    console.log('Delete', mod.name);
    const newMods = mods.filter((m) => m.uuid !== mod.uuid);
    saveMods(newMods).catch(console.error);
  };

  const handleMove = (mod: Mod, direction: 'up' | 'down') => {
    console.log('Move', mod.name, direction);
    const index = mods.findIndex((m) => m.uuid === mod.uuid);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    console.log('Index', index, 'Swap index', swapIndex);
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

  const rows = mods.map((mod, index) => {
    return (
      <Table.Tr key={mod.uuid} bg={mod.enabled ? 'var(--mantine-color-blue-light)' : undefined}>
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
        <Table.Td style={{ textAlign: 'center' }}>{mod.isDll ? '✓' : undefined}</Table.Td>
        <Table.Td style={{ textAlign: 'center' }}>{mod.isFileMod ? '✓' : undefined}</Table.Td>
        <ModTableMenu
          canMove={{
            up: (mod.enabled && mod.loadOrder && mod.loadOrder > 1) || false,
            down: (mod.enabled && mod.loadOrder && mod.loadOrder < mods.filter((mod) => mod.enabled).length) || false,
          }}
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
                handleSort={() => handleSortChange(sortKey)}
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

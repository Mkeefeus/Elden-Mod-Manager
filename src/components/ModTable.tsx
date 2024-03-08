import ModTableHeader from '../components/ModTableHeader';
import { Mod } from 'types';
import { useEffect, useState } from 'react';
import { Table, Checkbox, Center } from '@mantine/core';
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

const ModTable = () => {
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
      return [...enabledMods, ...disabledMods];
    } else {
      return [...unsortedMods].sort((a, b) => columnSorter(a, b, sort.column as keyof Mod, sort.order));
    }
  };

  const fetchData = async () => {
    try {
      const dbMods = await window.electronAPI.loadMods();
      setMods(sortMods(dbMods));
    } catch (error) {
      console.warn(error);
    }
  };

  useEffect(() => {
    fetchData().catch(console.error);
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
    const validatedMods = validateLoadOrder(newMods);
    const sortedMods = sortMods(validatedMods);
    await Promise.resolve();
    // const [success, error] = await window.electronAPI.saveMods(validatedMods);
    // if (!success) {
    //   console.log('Unable to save mods: ', error?.message);
    //   return;
    // }
    setMods(sortedMods);
  };

  const handleCheckboxChange = (index: number) => {
    const newMods = [...mods];
    const mod = newMods[index];
    mod.enabled = !mod.enabled;
    saveMods(newMods).catch(console.error);
  };

  const handleDelete = (mod: Mod) => {
    const newMods = mods.filter((m) => m.uuid !== mod.uuid);
    saveMods(newMods).catch(console.error);
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
          changePriority={(direction: 'up' | 'down') => changePriority(mod, direction)}
        />
      </Table.Tr>
    );
  });
  return (
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
  );
};

export default ModTable;

import { Button, Group, Stack } from '@mantine/core';
import ModTable from '@components/ModTable';
import AddModModal from '@components/AddModModal';
import { useState, useEffect } from 'react';
import { Mod } from 'types';
import { useLocation } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';

type SortObject = {
  column: string;
  order: 'asc' | 'desc';
};

const Mods = () => {
  const location = useLocation();
  const [fromZip, setFromZip] = useState(false);
  const [mods, setMods] = useState<Mod[]>([]);
  const [sort, setSort] = useState<SortObject>({ column: 'installDate', order: 'desc' });
  const [opened, { open, close }] = useDisclosure();

  useEffect(() => {
    if (location.state) {
      const { opened, fromZip } = location.state as { opened: boolean; fromZip: boolean };
      if (opened) open();
      setFromZip(fromZip);
    }
  }, [location]);

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

  const loadMods = async () => {
    try {
      const dbMods = await window.electronAPI.loadMods();
      if (!dbMods) return;
      setMods(sortMods(dbMods));
    } catch (error) {
      console.warn(error);
    }
  };

  useEffect(() => {
    loadMods().catch(console.error);
  }, []);

  useEffect(() => {
    setMods(sortMods(mods));
  }, [sort]);

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
    const success = await window.electronAPI.saveMods(validatedMods);
    if (!success) return;
    setMods(sortedMods);
  };

  const handleSortChange = (column: string) => {
    if (sort.column === column) {
      setSort({ column, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ column, order: 'desc' });
    }
  };

  return (
    <Stack gap="xl" justify={'center'}>
      <ModTable mods={mods} sort={sort} saveMods={saveMods} loadMods={loadMods} changeSort={handleSortChange} />
      <Group gap={'md'}>
        <AddModModal
          fromZip={fromZip}
          loadMods={loadMods}
          namesInUse={mods.map((mod) => mod.name.toLowerCase())}
          disclosure={{ opened, close }}
        />
        <Button
          onClick={() => {
            setFromZip(true);
            open();
          }}
          variant="outline"
        >
          Add Mod From Zip
        </Button>
        <Button
          onClick={() => {
            setFromZip(false);
            open();
          }}
          variant="outline"
        >
          Add Mod From Folder
        </Button>
        <Button variant="outline" onClick={() => window.electronAPI.launchGame(true)}>
          Launch Game
        </Button>
      </Group>
    </Stack>
  );
};

export default Mods;

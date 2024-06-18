import { Button, Group, ScrollArea, Stack } from '@mantine/core';
import ModTable from '../components/ModTable';
import { useState, useEffect } from 'react';
import { Mod } from 'types';
import { useLocation } from 'react-router-dom';
import AddMod from '../components/AddMod';
import { sendLog } from '../utils/rendererLogger';
import { errToString } from '../utils/utilities';
import { useModal } from '../providers/ModalProvider';
import PromptModsFolderModal from '../components/PromptModsFolderModal';
import { useElementSize } from '@mantine/hooks';

type SortObject = {
  column: string;
  order: 'asc' | 'desc';
};

const Mods = () => {
  const location = useLocation();
  const [mods, setMods] = useState<Mod[]>([]);
  const [sort, setSort] = useState<SortObject>({ column: 'installDate', order: 'desc' });
  const { showModal, hideModal } = useModal();
  const pageSize = useElementSize();

  const handleModalClose = (fromZip: boolean) => {
    if (fromZip) {
      window.electronAPI.clearTemp();
    }
    hideModal();
  };

  const showAddModModal = (fromZip: boolean) => {
    showModal({
      title: 'Add Mod',
      content: (
        <AddMod
          close={() => handleModalClose(fromZip)}
          fromZip={fromZip}
          namesInUse={mods.map((mod) => mod.name.toLowerCase())}
          loadMods={loadMods}
        />
      ),
    });
  };

  const checkModsFolderPrompt = async () => {
    const prompted = await window.electronAPI.checkModsFolderPrompt();
    if (prompted) return;
    showModal({
      title: 'Select Mods Folder',
      content: <PromptModsFolderModal hideModal={hideModal} />,
    });
  };

  useEffect(() => {
    checkModsFolderPrompt();
  }, []);

  useEffect(() => {
    if (location.state) {
      const { opened, fromZip } = location.state as { opened: boolean; fromZip: boolean };
      if (!opened) return;
      showAddModModal(fromZip);
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
      if (!dbMods) {
        sendLog({
          level: 'error',
          message: 'Failed to load mods',
        });
        return;
      }
      setMods(sortMods(dbMods));
    } catch (error) {
      const message = `An error occured while loading mods: ${errToString(error)}`;
      sendLog({
        level: 'error',
        message: message,
        error,
      });
    }
  };

  useEffect(() => {
    loadMods();
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
    if (!success) {
      sendLog({
        level: 'error',
        message: 'Failed to save mods',
      });
      return;
    }
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
    <Stack gap="xl" flex={1} ref={pageSize.ref}>
      <ScrollArea.Autosize mah={pageSize.height * 0.8}>
        <ModTable mods={mods} sort={sort} saveMods={saveMods} loadMods={loadMods} changeSort={handleSortChange} />
      </ScrollArea.Autosize>
      <Group gap={'md'}>
        <Button
          onClick={() => {
            showAddModModal(false);
          }}
          variant="outline"
        >
          Add Mod From Folder
        </Button>
        <Button
          onClick={() => {
            showAddModModal(true);
          }}
          variant="outline"
        >
          Add Mod From Zip
        </Button>
        <Button variant="outline" onClick={() => window.electronAPI.launchGame(true)}>
          Launch Game
        </Button>
      </Group>
    </Stack>
  );
};

export default Mods;

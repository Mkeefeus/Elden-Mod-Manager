import { Button, Group, ScrollArea, Stack } from '@mantine/core';
import ModTable from '../components/ModTable';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AddMod from '../components/AddMod';
import { useModal } from '../providers/ModalProvider';
import PromptModsFolderModal from '../components/PromptModsFolderModal';
import { useElementSize } from '@mantine/hooks';
import { useMods } from '../providers/ModsProvider';

const Mods = () => {
  const location = useLocation();
  const { showModal, hideModal } = useModal();
  const { mods, loadMods } = useMods();
  const pageSize = useElementSize();

  const handleModalClose = () => {
    hideModal();
  };

  const showAddModModal = (fromZip: boolean) => {
    showModal({
      title: 'Add Mod',
      content: (
        <AddMod
          close={handleModalClose}
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

  return (
    <Stack gap="xl" flex={1} ref={pageSize.ref}>
      <ScrollArea.Autosize mah={pageSize.height * 0.8}>
        <ModTable />
      </ScrollArea.Autosize>
      <Group gap={'md'}>
        <Button
          onClick={() => {
            showAddModModal(false);
          }}
          variant="outline"
        >
          Add Mod from Folder
        </Button>
        <Button
          onClick={() => {
            showAddModModal(true);
          }}
          variant="outline"
        >
          Add Mod from Zip
        </Button>
        <Button variant="outline" onClick={() => window.electronAPI.launchGame(true)}>
          Launch Game
        </Button>
      </Group>
    </Stack>
  );
};

export default Mods;

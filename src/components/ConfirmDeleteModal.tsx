import { Button, Group, Text, Space } from '@mantine/core';
import { useModal } from '../providers/ModalProvider';
import { Mod } from 'types';
import { useState } from 'react';

interface ConfirmDeleteModalProps {
  mod: Mod;
  loadMods: () => void;
}

const ConfirmDeleteModal = ({ mod, loadMods }: ConfirmDeleteModalProps) => {
  const { hideModal } = useModal();
  const [spinner, setSpinner] = useState(false);

  const cleanupModal = () => {
    setSpinner(false);
    hideModal();
  };

  const handleDelete = async () => {
    setSpinner(true);
    await window.electronAPI.deleteMod(mod);
    hideModal();
    loadMods();
  };

  return (
    <>
      <Text>{`Are you sure you want to delete ${mod.name}?`}</Text>
      <Space h="md" />
      <Group justify="space-evenly" grow>
        <Button onClick={cleanupModal}>Cancel</Button>
        <Button onClick={handleDelete} color="red.8" variant="filled" loading={spinner}>
          Delete
        </Button>
      </Group>
    </>
  );
};
export default ConfirmDeleteModal;

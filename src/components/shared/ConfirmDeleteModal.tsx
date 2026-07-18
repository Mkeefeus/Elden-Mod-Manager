import { Button, Group, Text, Space } from '@mantine/core';
import { useModal } from '@providers/ModalProvider';
import { useState } from 'react';

interface ConfirmDeleteModalProps {
  title: string;
  onDelete: () => Promise<void> | void;
  afterDelete?: () => void;
}

const ConfirmDeleteModal = ({ title, onDelete, afterDelete }: ConfirmDeleteModalProps) => {
  const { hideModal } = useModal();
  const [spinner, setSpinner] = useState(false);

  const cleanupModal = () => {
    hideModal();
  };

  const handleDelete = async () => {
    setSpinner(true);
    try {
      await onDelete();
      cleanupModal();
      if (afterDelete) {
        afterDelete();
      }
    } catch {
      setSpinner(false);
    }
  };

  return (
    <>
      <Text>{`Are you sure you want to delete ${title}?`}</Text>
      <Space h="md" />
      <Group justify="space-evenly" grow>
        <Button onClick={cleanupModal}>Cancel</Button>
        <Button
          onClick={() => {
            void handleDelete();
          }}
          color="red"
          variant="filled"
          loading={spinner}
        >
          Delete
        </Button>
      </Group>
    </>
  );
};
export default ConfirmDeleteModal;

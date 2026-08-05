import { Button, Checkbox, Group, Space, Text } from '@mantine/core';
import { useModal } from '@providers/ModalProvider';
import { useState } from 'react';

interface ConfirmDeleteModalProps {
  title: string;
  onDelete: (deleteFiles: boolean) => Promise<void> | void;
  afterDelete?: () => void;
  showDeleteFilesOption?: boolean;
  deleteFilesLabel?: string;
  deleteFilesDescription?: string;
}

const ConfirmDeleteModal = ({
  title,
  onDelete,
  afterDelete,
  showDeleteFilesOption = false,
  deleteFilesLabel = 'Delete files from disk',
  deleteFilesDescription,
}: ConfirmDeleteModalProps) => {
  const { hideModal } = useModal();
  const [spinner, setSpinner] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);

  const cleanupModal = () => {
    hideModal();
  };

  const handleDelete = async () => {
    setSpinner(true);
    try {
      await onDelete(deleteFiles);
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
      {showDeleteFilesOption && (
        <>
          <Space h="sm" />
          <Checkbox
            checked={deleteFiles}
            onChange={(event) => setDeleteFiles(event.currentTarget.checked)}
            label={deleteFilesLabel}
            description={deleteFilesDescription}
          />
        </>
      )}
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

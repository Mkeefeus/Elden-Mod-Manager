import { Button, Group, Text } from '@mantine/core';
import { useModal } from '@providers/ModalProvider';
import { useState } from 'react';

interface UpdateAvailableModalProps {
  version: string;
  url: string;
}

const UpdateAvailableModal = ({ version, url }: UpdateAvailableModalProps) => {
  const { hideModal } = useModal();
  const [spinner, setSpinner] = useState(false);

  const handleUpdate = async () => {
    setSpinner(true);
    await window.electronAPI.installUpdate();
  };

  const handleGitHub = () => {
    window.electronAPI.openExternalLink(url);
    hideModal();
  };

  return (
    <>
      <Text>{`Version ${version} has been downloaded and is ready to install. Would you like to update now?`}</Text>
      <Group justify="space-evenly" grow mt="md">
        <Button onClick={hideModal} variant="default">
          Cancel
        </Button>
        <Button onClick={handleGitHub} variant="outline">
          Go to GitHub
        </Button>
        <Button
          onClick={() => {
            void handleUpdate();
          }}
          loading={spinner}
        >
          Update
        </Button>
      </Group>
    </>
  );
};

export default UpdateAvailableModal;

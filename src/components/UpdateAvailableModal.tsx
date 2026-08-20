import { Alert, Button, Group, Text } from '@mantine/core';
import { useModal } from '@providers/ModalProvider';
import { useState } from 'react';
import { type UpdateResult } from 'types';

interface UpdateAvailableModalProps {
  version: string;
  url: string;
}

const failureMessage = (result: UpdateResult) => {
  switch (result.reason) {
    case 'not-available':
      return 'The update service does not have a build for this version yet. You can download it from GitHub instead.';
    case 'timeout':
      return 'The download timed out. You can try again or download the update from GitHub.';
    default:
      return `The update could not be downloaded${result.message ? `: ${result.message}` : '.'}`;
  }
};

const UpdateAvailableModal = ({ version, url }: UpdateAvailableModalProps) => {
  const { hideModal } = useModal();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    setError(null);
    setDownloading(true);
    const result = await window.electronAPI.downloadAndInstallUpdate();
    // On success the app restarts immediately, so this only runs on failure.
    if (!result.ok) {
      setError(failureMessage(result));
      setDownloading(false);
    }
  };

  const handleGitHub = () => {
    window.electronAPI.openExternalLink(url);
    hideModal();
  };

  return (
    <>
      <Text>
        {downloading
          ? `Downloading version ${version}. The app will close and reopen once the update is installed.`
          : `Version ${version} is available. The update will be downloaded, then the app will close and reopen to install it.`}
      </Text>
      {error && (
        <Alert color="red" mt="md">
          {error}
        </Alert>
      )}
      <Group justify="flex-end" gap="sm" mt="lg" wrap="nowrap">
        <Button onClick={hideModal} variant="subtle" disabled={downloading}>
          Cancel
        </Button>
        <Button onClick={handleGitHub} variant="outline" disabled={downloading}>
          Go to GitHub
        </Button>
        <Button
          onClick={() => {
            void handleUpdate();
          }}
          loading={downloading}
          variant="filled"
        >
          {downloading ? 'Downloading' : 'Update'}
        </Button>
      </Group>
    </>
  );
};

export default UpdateAvailableModal;

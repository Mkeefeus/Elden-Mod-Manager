import { useState } from 'react';
import { Box, Button, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DownloadState } from 'types';

interface Props {
  type: 'archive' | 'folder';
  onAdded: (state: DownloadState) => void;
}

const AddFromLocalForm = ({ type, onAdded }: Props) => {
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBrowse = async () => {
    const selected = await window.electronAPI.browse(
      type === 'archive' ? 'archive' : 'directory',
      type === 'archive' ? 'Select Mod Archive' : 'Select Mod Folder'
    );
    if (selected) setPath(selected);
  };

  const handleAdd = async () => {
    if (!path) return;
    setLoading(true);
    try {
      let extractedPath: string;

      if (type === 'archive') {
        const result = await window.electronAPI.extractArchive(path);
        if (!result) {
          notifications.show({
            title: 'Invalid Archive',
            message: 'The archive does not appear to contain a valid Elden Ring mod.',
            color: 'red',
          });
          setLoading(false);
          return;
        }
        extractedPath = result;
      } else {
        extractedPath = path;
      }

      const id = crypto.randomUUID();
      const filename = path.split(/[/\\]/).pop() ?? path;
      const state = await window.electronAPI.addLocalDownload(id, filename, extractedPath);
      onAdded(state);
      setPath('');
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: String(err),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p="xl">
      <Stack gap="md" maw={600}>
        <Title order={4}>{type === 'archive' ? 'Add Mod from Archive' : 'Add Mod from Folder'}</Title>
        <Text size="sm" c="dimmed">
          {type === 'archive'
            ? 'Select an archive (.zip, .7z, .rar, .tar, etc.) containing an Elden Ring mod. It will be extracted and ready to configure.'
            : 'Select a folder containing an Elden Ring mod (must have valid mod subfolders or a .dll file).'}
        </Text>

        <Group gap="sm" align="flex-end">
          <TextInput
            label={type === 'archive' ? 'Archive File' : 'Mod Folder'}
            placeholder={type === 'archive' ? '/path/to/mod.zip' : '/path/to/mod-folder'}
            value={path}
            readOnly
            style={{ flex: 1 }}
          />
          <Button onClick={() => void handleBrowse()} variant="outline">
            Browse
          </Button>
        </Group>

        <Button disabled={!path} loading={loading} onClick={() => void handleAdd()}>
          {type === 'archive' ? 'Extract & Configure' : 'Configure'}
        </Button>
      </Stack>
    </Box>
  );
};

export default AddFromLocalForm;

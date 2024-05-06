import { Button, Checkbox, Group, Modal, Stack, TextInput } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useState } from 'react';

interface ZipFileModalProps {
  opened: boolean;
  close: () => void;
}

const ZipFileModal = ({ opened, close }: ZipFileModalProps) => {
  const [showSubmitLoader, setShowSubmitLoader] = useState(false);
  const [showExtractLoader, setShowExtractLoader] = useState(false);
  const [extractedPath, setExtractedPath] = useState<string | undefined>();
  const form = useForm({
    initialValues: {
      path: '',
      zipFile: '',
      modName: '',
      isDll: false,
      delete: false,
      hasExe: false,
      exePath: '',
    },

    validate: {
      zipFile: isNotEmpty('Path is required'),
    },
  });

  const cleanupModal = () => {
    setShowSubmitLoader(false);
    setExtractedPath(undefined);
    form.reset();
    close();
  };

  const handleSubmit = async () => {
    cleanupModal();
    console.log('submit');
  };

  const handleGetFilePath = async (field: 'zipFile' | 'exePath', title: string, startingDir?: string) => {
    const browseExe = field === 'exePath';
    let path = await window.electronAPI.browse(browseExe ? 'exe' : 'zip', title, startingDir);
    if (!path) {
      return;
    }
    if (browseExe) {
      const exe = path.split('\\').pop();
      if (!exe) {
        return;
      }
      path = exe;
    }
    form.setFieldValue(field, path);
    return path;
  };

  return (
    <Modal opened={opened} onClose={cleanupModal} title="Add Mod from Zip File" centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {!extractedPath && (
            <>
              <Group align="end">
                <TextInput withAsterisk label="Zip File" {...form.getInputProps('zipFile')} style={{ flex: '4' }} />
                <Button
                  loading={showExtractLoader}
                  onClick={async () => {
                    const zipPath = await handleGetFilePath('zipFile', 'Select zip file').catch(console.error);
                    if (!zipPath) return;
                    setShowExtractLoader(true);
                    const extracted = await window.electronAPI.extractZip(zipPath);
                    setShowExtractLoader(false);
                    if (!extracted) return;
                    setExtractedPath(extracted);
                  }}
                  style={{ flex: '1' }}
                >
                  Browse
                </Button>
              </Group>
            </>
          )}
          {extractedPath && (
            <>
              <TextInput withAsterisk label="Mod name" {...form.getInputProps('modName')} />
              <Checkbox mt="md" label="Is DLL?" {...form.getInputProps('isDll', { type: 'checkbox' })} />
              <Checkbox mt="md" label="Delete after import?" {...form.getInputProps('delete', { type: 'checkbox' })} />
              <Checkbox mt="md" label="Has exe?" {...form.getInputProps('hasExe', { type: 'checkbox' })} />
              {form.values.hasExe && (
                <Group align="end">
                  <TextInput
                    disabled={!form.values.hasExe}
                    withAsterisk
                    label="Executable file"
                    {...form.getInputProps('exePath')}
                    style={{ flex: '4' }}
                  />
                  <Button
                    disabled={!form.values.hasExe}
                    onClick={() => {
                      handleGetFilePath('exePath', 'Select mod executable', extractedPath).catch(console.error);
                      // console.log('click lmao');
                    }}
                    style={{ flex: '1' }}
                  >
                    Browse
                  </Button>
                </Group>
              )}
              <Group justify="flex-end" mt="md">
                <Button loading={showSubmitLoader} type="submit">
                  Submit
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </form>
    </Modal>
  );
};

export default ZipFileModal;

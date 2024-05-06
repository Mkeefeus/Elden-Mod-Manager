import { TextInput, Checkbox, Button, Group, Stack, Modal } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { sleep } from '../utils/utilities';
import { useState } from 'react';
import { AddModFormValues } from 'types';

interface AddModModalProps {
  loadMods: () => void;
  namesInUse: string[];
  opened: boolean;
  close: () => void;
}

const AddModModal = ({ loadMods, namesInUse, opened, close }: AddModModalProps) => {
  const [showLoader, setShowLoader] = useState(false);
  const nameNotInUse = (value: string) => {
    if (namesInUse.includes(value.toLowerCase())) {
      return 'Mod name is already in use';
    }
  };

  const form = useForm({
    initialValues: {
      modName: '',
      isDll: false,
      path: '',
      delete: false,
      hasExe: false,
      exePath: '',
    },

    validate: {
      modName: isNotEmpty('Mod name is required') && nameNotInUse,

      path: isNotEmpty('Path is required'),
    },
  });

  const cleanupModal = () => {
    setShowLoader(false);
    form.reset();
    close();
  };

  const handleSubmit = async (values: AddModFormValues) => {
    values.modName = values.modName.trim();
    form.isValid;
    setShowLoader(true);
    const success = await window.electronAPI.addMod(values);
    if (!success) {
      cleanupModal();
      return;
    }
    await sleep(1000);
    loadMods();
    cleanupModal();
  };

  const handleGetFilePath = async (field: 'path' | 'exePath', title: string, startingDir?: string) => {
    const browseExe = field === 'exePath';
    let path = await window.electronAPI.browse(browseExe ? 'exe' : 'directory', title, startingDir);
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
  };

  return (
    <Modal opened={opened} onClose={cleanupModal} title={`Add Mod`} centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput withAsterisk label="Mod name" {...form.getInputProps('modName')} />
          <Group align="end">
            <TextInput withAsterisk label="Path" {...form.getInputProps('path')} style={{ flex: '4' }} />
            <Button
              onClick={() => {
                handleGetFilePath('path', 'Select mod folder').catch(console.error);
              }}
              style={{ flex: '1' }}
            >
              Browse
            </Button>
          </Group>
          {form.values.path && (
            <>
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
                      handleGetFilePath('exePath', 'Select mod executable', form.values.path).catch(console.error);
                      console.log('click lmao');
                    }}
                    style={{ flex: '1' }}
                  >
                    Browse
                  </Button>
                </Group>
              )}
              <Group justify="flex-end" mt="md">
                <Button loading={showLoader} type="submit">
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

export default AddModModal;

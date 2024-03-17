import { TextInput, Checkbox, Button, Group, Stack, Modal } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useState } from 'react';
import { AddModFormValues } from 'types';

type ModalDisclosure = {
  opened: boolean;
  close: () => void;
};

interface AddModModalProps {
  fromZip: boolean;
  loadMods: () => void;
  namesInUse: string[];
  disclosure: ModalDisclosure;
}

const AddModModal = ({ fromZip, loadMods, namesInUse, disclosure }: AddModModalProps) => {
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
    },

    validate: {
      modName: isNotEmpty('Mod name is required') && nameNotInUse,

      path: isNotEmpty('Path is required'),
    },
  });

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleSubmit = async (values: AddModFormValues) => {
    values.modName = values.modName.trim();
    form.isValid;
    console.log(values);
    setShowLoader(true);
    const success = await window.electronAPI.addMod(values, fromZip);
    await sleep(1000);
    if (!success) return;
    setShowLoader(false);
    form.reset();
    loadMods();
    disclosure.close();
  };

  const handleGetFilePath = async (fromZip: boolean) => {
    const path = await window.electronAPI.browseForMod(fromZip);
    if (!path) {
      return;
    }
    form.setFieldValue('path', path);
  };

  return (
    <Modal
      opened={disclosure.opened}
      onClose={disclosure.close}
      title={`Add Mod From ${fromZip ? 'Zip' : 'Folder'}`}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput withAsterisk label="Mod name" {...form.getInputProps('modName')} />
          <Group align="end">
            <TextInput withAsterisk label="Path" {...form.getInputProps('path')} style={{ flex: '4' }} />
            <Button
              onClick={() => {
                handleGetFilePath(fromZip).catch(console.error);
              }}
              style={{ flex: '1' }}
            >
              Browse
            </Button>
          </Group>
          <Checkbox mt="md" label="Is DLL?" {...form.getInputProps('isDll', { type: 'checkbox' })} />
          <Checkbox mt="md" label="Delete after import?" {...form.getInputProps('delete', { type: 'checkbox' })} />
          <Group justify="flex-end" mt="md">
            <Button loading={showLoader} type="submit">
              Submit
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddModModal;

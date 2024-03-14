import { TextInput, Checkbox, Button, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { AddModFormValues } from 'types';

interface AddModModalProps {
  fromZip: boolean;
  loadMods: () => void;
  closeModal: () => void;
}

const AddModModal = ({ fromZip, loadMods, closeModal }: AddModModalProps) => {
  const form = useForm({
    initialValues: {
      modName: '',
      isDll: false,
      path: '',
    },
  });

  const handleSubmit = async (values: AddModFormValues) => {
    // Send form data to backend, have backend validate and save the mod, if the save was successful, close the modal and have the main window refresh the mod list using loadMods function
    console.log(values);
    const success = await window.electronAPI.addMod(values);
    if (!success) return;
    closeModal();
    form.reset();
    loadMods();
  };

  const handleGetFilePath = async (fromZip: boolean) => {
    const path = await window.electronAPI.browseForMod(fromZip);
    if (!path) {
      return;
    }
    form.setFieldValue('path', path);
  };

  return (
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
        <Checkbox mt="md" label="Is DLL" {...form.getInputProps('isDll', { type: 'checkbox' })} />
        <Group justify="flex-end" mt="md">
          <Button type="submit">Submit</Button>
        </Group>
      </Stack>
    </form>
  );
};

export default AddModModal;

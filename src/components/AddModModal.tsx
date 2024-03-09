import { TextInput, Checkbox, Button, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';

type FormValues = {
  modName: string;
  isDll: boolean;
  path: string;
};

interface AddModModalProps {
  fromZip: boolean;
  loadMods: () => void;
}

const AddModModal = ({ fromZip, loadMods }: AddModModalProps) => {
  const form = useForm({
    initialValues: {
      modName: '',
      isDll: false,
      path: '',
    },
  });

  const handleSubmit = (values: FormValues) => {
    // Send form data to backend, have backend validate and save the mod, if the save was successful, close the modal and have the main window refresh the mod list using loadMods function
    console.log(values);
    loadMods();
  };

  const handleGetFilePath = async (fromZip?: boolean) => {
    const path = fromZip ? await window.electronAPI.browseForModZip() : await window.electronAPI.browseForModPath();
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

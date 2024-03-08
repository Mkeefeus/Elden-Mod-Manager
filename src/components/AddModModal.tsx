import { TextInput, Checkbox, Button, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
const AddModModal = () => {
  const form = useForm({
    initialValues: {
      modName: '',
      isDll: false,
      path: '',
    },
  });

  const handleGetFilePath = async () => {
    console.log('get file path');
    const path = await window.electronAPI.getFilePath();
    if (!path) {
      return;
    }
    console.log(path);
    form.setFieldValue('path', path);
  };

  return (
    <form onSubmit={form.onSubmit((values) => console.log(values))}>
      <Stack gap="md">
        <TextInput withAsterisk label="Mod name" {...form.getInputProps('modName')} />
        <Group align="end">
          <TextInput withAsterisk label="Path" {...form.getInputProps('path')} style={{ flex: '4' }} />
          <Button
            onClick={() => {
              handleGetFilePath().catch(console.error);
            }}
            style={{ flex: '1' }}
          >
            Choose file
          </Button>
        </Group>

        <Checkbox mt="md" label="Is DLL" {...form.getInputProps('termsOfService', { type: 'checkbox' })} />

        <Group justify="flex-end" mt="md">
          <Button type="submit">Submit</Button>
        </Group>
      </Stack>
    </form>
  );
};

export default AddModModal;

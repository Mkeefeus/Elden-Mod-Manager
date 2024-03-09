import { TextInput, Checkbox, Button, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
const AddModModal = () => {
  const form = useForm({
    initialValues: {
      modName: '',
      isDll: false,
      path: '',
      zip: '',
    },
  });

  const handleGetFilePath = async (isZip?: boolean) => {
    console.log('get file path');
    const path = isZip ? await window.electronAPI.browseForModZip() : await window.electronAPI.browseForModZip();
    if (!path) {
      return;
    }
    console.log(path);
    form.setFieldValue('path', path);
  };
  console.log(form.values);
  return (
    <form onSubmit={form.onSubmit((values) => console.log(values))}>
      <Stack gap="md">
        <TextInput withAsterisk label="Mod name" {...form.getInputProps('modName')} />
        <Group align="end">
          <TextInput withAsterisk label="Zip File" {...form.getInputProps('zip')} style={{ flex: '4' }} />
          <Button
            onClick={() => {
              handleGetFilePath(true).catch(console.error);
            }}
            style={{ flex: '1' }}
          >
            Choose file
          </Button>
        </Group>
        Or
        <Group align="end">
          <TextInput
            withAsterisk
            label="Path"
            {...form.getInputProps('path')}
            style={{ flex: '4' }}
            disabled={!!form.values.zip}
          />
          <Button
            onClick={() => {
              handleGetFilePath().catch(console.error);
            }}
            style={{ flex: '1' }}
          >
            Browse
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

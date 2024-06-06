import { TextInput, Checkbox, Group, Button } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { AddModFormValues } from 'types';

interface AddModSettingsProps {
  form: UseFormReturnType<AddModFormValues>;
  showLoader: boolean;
}

const BROWSE_TEXT_STYLE = { flex: '4' };
const BROWSE_BUTTON_STYLE = { flex: '1' };

const AddModSettings = ({ form, showLoader }: AddModSettingsProps) => {
  return (
    <>
      <Checkbox mt="md" label="Is DLL?" {...form.getInputProps('isDll', { type: 'checkbox' })} />
      {form.values.isDll && (
        <Group align="end">
          <TextInput
            disabled={!form.values.isDll}
            withAsterisk
            label="Dll file"
            {...form.getInputProps('dllPath')}
            style={BROWSE_TEXT_STYLE}
          />
          <Button
            disabled={!form.values.isDll}
            onClick={async () => {
              const dllPath = await window.electronAPI.browse('dll', 'Select mod dll file', form.values.path);
              if (!dllPath) return;
              const dllFile = dllPath.split('\\').pop();
              if (!dllFile) return;
              form.setFieldValue('dllPath', dllFile);
            }}
            style={BROWSE_BUTTON_STYLE}
          >
            Browse
          </Button>
        </Group>
      )}
      <Checkbox mt="md" label="Delete after import?" {...form.getInputProps('delete', { type: 'checkbox' })} />
      <Checkbox mt="md" label="Has exe?" {...form.getInputProps('hasExe', { type: 'checkbox' })} />
      {form.values.hasExe && (
        <Group align="end">
          <TextInput
            disabled={!form.values.hasExe}
            withAsterisk
            label="Executable file"
            {...form.getInputProps('exePath')}
            style={BROWSE_TEXT_STYLE}
          />
          <Button
            disabled={!form.values.hasExe}
            onClick={async () => {
              const exePath = await window.electronAPI.browse('exe', 'Select mod executable', form.values.path);
              if (!exePath) return;
              const exeFile = exePath.split('\\').pop();
              if (!exeFile) return;
              form.setFieldValue('exePath', exeFile);
            }}
            style={BROWSE_BUTTON_STYLE}
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
  );
};

export default AddModSettings;

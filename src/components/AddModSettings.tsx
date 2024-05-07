import { TextInput, Checkbox, Group, Button } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import React from 'react';
import { AddModFormValues } from 'types';

interface AddModSettingsProps {
  form: UseFormReturnType<AddModFormValues>;
  showLoader: boolean;
}

const AddModSettings = ({ form, showLoader }: AddModSettingsProps) => {
  return (
    <>
      <TextInput withAsterisk label={'Path'} {...form.getInputProps('path')} disabled />
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
            onClick={async () => {
              // handleGetFilePath('exePath', 'Select mod executable', form.values.path).catch(console.error);
              const exe = await window.electronAPI.browse('exe', 'Select mod executable', form.values.path);
              if (!exe) return;
              form.setFieldValue('exePath', exe);
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
  );
};

export default AddModSettings;

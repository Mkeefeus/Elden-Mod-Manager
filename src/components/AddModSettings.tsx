import { TextInput, Checkbox, Group, Button } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import React from 'react';
import { AddModFormValues } from 'types';

interface AddModSettingsProps {
  form: UseFormReturnType<AddModFormValues>;
  showLoader: boolean;
  fromZip?: boolean;
}

const BROWSE_TEXT_STYLE = { flex: '4' };
const BROWSE_BUTTON_STYLE = { flex: '1' };

const AddModSettings = ({ form, showLoader, fromZip }: AddModSettingsProps) => {
  return (
    <>
      <Group align='end'>
        <TextInput
          withAsterisk
          label={'Path'}
          {...form.getInputProps('path')}
          disabled={!fromZip}
          style={BROWSE_TEXT_STYLE}
        />
        {fromZip && (
          <Button
            style={BROWSE_BUTTON_STYLE}
            onClick={async () => {
              const path = await window.electronAPI.browse('directory', 'Select mod directory', form.values.path);
              if (!path) return;
              form.setFieldValue('path', path);
            }}
          >
            Browse
          </Button>
        )}
      </Group>
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
            style={BROWSE_TEXT_STYLE}
          />
          <Button
            disabled={!form.values.hasExe}
            onClick={async () => {
              const exe = await window.electronAPI.browse('exe', 'Select mod executable', form.values.path);
              if (!exe) return;
              form.setFieldValue('exePath', exe);
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

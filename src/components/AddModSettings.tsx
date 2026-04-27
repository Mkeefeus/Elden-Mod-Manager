import { TextInput, Checkbox, Group, Button, Collapse, NumberInput, Select, Stack } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { useState } from 'react';
import { sendLog } from '../utils/rendererLogger';
import { AddModFormValues } from 'types';

interface AddModSettingsProps {
  form: UseFormReturnType<AddModFormValues>;
  showLoader: boolean;
}

const BROWSE_TEXT_STYLE = { flex: '4' };
const BROWSE_BUTTON_STYLE = { flex: '1' };

const INITIALIZER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'delay', label: 'Delay' },
  { value: 'function', label: 'Function' },
];

const AddModSettings = ({ form, showLoader }: AddModSettingsProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      <Checkbox
        mt="md"
        label="Is DLL mod?"
        {...form.getInputProps('isDll', { type: 'checkbox' })}
        onChange={(e) => {
          form.setFieldValue('isDll', e.currentTarget.checked);
          if (e.currentTarget.checked) {
            void (async () => {
              const found = await window.electronAPI.scanDir(form.values.path, 'dll');
              if (found) form.setFieldValue('dllPath', found);
            })();
          }
        }}
      />
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
            onClick={() => {
              void (async () => {
                const dllPath = await window.electronAPI.browse('dll', 'Select mod dll file', form.values.path);
                if (!dllPath) return;
                const dllFile = dllPath.split(/[/\\]/).pop();
                if (!dllFile) {
                  sendLog({
                    level: 'warning',
                    message: 'Failed to get dll file name',
                  });
                  return;
                }
                form.setFieldValue('dllPath', dllFile);
              })();
            }}
            style={BROWSE_BUTTON_STYLE}
          >
            Browse
          </Button>
        </Group>
      )}
      <Checkbox
        mt="md"
        label="Has application?"
        {...form.getInputProps('hasExe', { type: 'checkbox' })}
        onChange={(e) => {
          form.setFieldValue('hasExe', e.currentTarget.checked);
          if (e.currentTarget.checked) {
            void (async () => {
              const found = await window.electronAPI.scanDir(form.values.path, 'exe');
              if (found) form.setFieldValue('exePath', found);
            })();
          }
        }}
      />
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
            onClick={() => {
              void (async () => {
                const exePath = await window.electronAPI.browse('exe', 'Select mod executable', form.values.path);
                if (!exePath) return;
                const exeFile = exePath.split(/[/\\]/).pop();
                if (!exeFile) {
                  sendLog({
                    level: 'warning',
                    message: 'Failed to get exe file name',
                  });
                  return;
                }
                form.setFieldValue('exePath', exeFile);
              })();
            }}
            style={BROWSE_BUTTON_STYLE}
          >
            Browse
          </Button>
        </Group>
      )}
      <Checkbox mt="md" label="Delete after import?" {...form.getInputProps('delete', { type: 'checkbox' })} />
      {form.values.isDll && (
        <>
          <Button variant="subtle" mt="md" size="compact-sm" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
          </Button>
          <Collapse expanded={showAdvanced}>
            <Stack gap="sm" mt="xs">
              <Checkbox
                label="Load early"
                description="Load this DLL before the game has fully initialized"
                {...form.getInputProps('loadEarly', { type: 'checkbox' })}
              />
              <Checkbox
                label="Optional"
                description="If unchecked, failure to load this DLL is treated as a critical error"
                {...form.getInputProps('optional', { type: 'checkbox' })}
              />
              <TextInput
                label="Finalizer"
                description="Symbol name called when this DLL is queued for unload"
                placeholder="e.g. on_unload"
                {...form.getInputProps('finalizer')}
              />
              <Select
                label="Initializer"
                description="Action to perform after this DLL successfully loads"
                data={INITIALIZER_OPTIONS}
                {...form.getInputProps('initializerType')}
              />
              {form.values.initializerType === 'delay' && (
                <NumberInput
                  label="Delay (ms)"
                  description="Minimum delay in milliseconds before the initializer runs"
                  min={0}
                  {...form.getInputProps('initializerDelayMs')}
                />
              )}
              {form.values.initializerType === 'function' && (
                <TextInput
                  label="Initializer function"
                  description="Symbol name to call after this DLL loads"
                  placeholder="e.g. on_init"
                  {...form.getInputProps('initializerFunction')}
                />
              )}
            </Stack>
          </Collapse>
        </>
      )}
      <Group justify="flex-end" mt="md">
        <Button loading={showLoader} type="submit" variant="filled">
          Submit
        </Button>
      </Group>
    </>
  );
};

export default AddModSettings;

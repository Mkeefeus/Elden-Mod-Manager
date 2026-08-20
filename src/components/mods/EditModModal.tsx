import { Button, Checkbox, Group, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { EditModFormValues, Mod, Tool } from 'types';

interface EditModModalProps {
  mod: Mod;
  mods: Mod[];
  onSubmit: (values: EditModFormValues) => void | Promise<void>;
  close: () => void;
}

const getFilenameOnly = (pathOrName: string): string => pathOrName.split(/[/\\]/).pop() ?? pathOrName;

const EditModModal = ({ mod, mods, onSubmit, close }: EditModModalProps) => {
  const [modPath, setModPath] = useState<string>('');
  const [linkedTool, setLinkedTool] = useState<Tool | undefined>(undefined);

  useEffect(() => {
    void window.electronAPI.getModPath(mod).then(setModPath);
    if (mod.toolId) {
      void window.electronAPI.getTools().then((tools) => setLinkedTool(tools.find((t) => t.id === mod.toolId)));
    }
  }, [mod]);

  const form = useForm<EditModFormValues>({
    initialValues: {
      name: mod.name,
      version: mod.version ?? '',
      isDll: !!mod.dllFile,
      dllPath: '',
      hasTool: !!mod.toolId,
      toolName: '',
      toolVersion: '',
      exePath: '',
    },
    validate: {
      name: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return 'Mod name is required';
        const trimmedVersion = form.values.version?.trim() || '';
        const hasDuplicate = mods.some((m) => {
          if (m.uuid === mod.uuid) return false;
          return m.name.toLowerCase() === trimmed.toLowerCase() && (m.version || '') === trimmedVersion;
        });
        if (hasDuplicate) return 'A mod with this name and version already exists';
        return null;
      },
      dllPath: (value, values) => (values.isDll && !mod.dllFile && !value ? 'DLL file is required' : null),
      exePath: (value, values) => (values.hasTool && !mod.exe && !value ? 'Executable is required' : null),
      toolName: (value, values) =>
        values.hasTool && !value?.trim() && !linkedTool?.name ? 'Tool name is required' : null,
    },
  });

  // Prefill tool name/version once the linked tool loads, so the fields aren't blank when "Has tool" is already checked.
  useEffect(() => {
    if (!linkedTool) return;
    if (!form.values.toolName) form.setFieldValue('toolName', linkedTool.name);
    if (!form.values.toolVersion) form.setFieldValue('toolVersion', linkedTool.version ?? '');
  }, [linkedTool]);

  const handleIsDllChange = (checked: boolean) => {
    form.setFieldValue('isDll', checked);
    if (checked && modPath && !mod.dllFile) {
      void window.electronAPI.scanDir(modPath, 'dll').then((found) => {
        if (found) form.setFieldValue('dllPath', found);
      });
    }
  };

  const handleHasToolChange = (checked: boolean) => {
    form.setFieldValue('hasTool', checked);
    if (checked && modPath && !mod.exe) {
      void window.electronAPI.scanDir(modPath, 'exe').then((found) => {
        if (found) form.setFieldValue('exePath', found);
      });
    }
  };

  const handleBrowseDll = async () => {
    const selected = await window.electronAPI.browse('dll', 'Select DLL File', modPath);
    if (!selected) return;
    form.setFieldValue('dllPath', getFilenameOnly(selected));
  };

  const handleBrowseExe = async () => {
    const selected = await window.electronAPI.browse('exe', 'Select Executable', modPath);
    if (!selected) return;
    form.setFieldValue('exePath', getFilenameOnly(selected));
  };

  const handleSubmit = async (values: EditModFormValues) => {
    await onSubmit({
      name: values.name.trim(),
      version: values.version?.trim() || undefined,
      isDll: values.isDll,
      dllPath: values.dllPath || undefined,
      hasTool: values.hasTool,
      toolName: values.toolName?.trim() || undefined,
      toolVersion: values.toolVersion?.trim() || undefined,
      exePath: values.exePath || undefined,
    });
    close();
  };

  const dllDisplayValue = form.values.dllPath ? getFilenameOnly(form.values.dllPath) : mod.dllFile || '';
  const exeDisplayValue = form.values.exePath ? getFilenameOnly(form.values.exePath) : mod.exe || '';

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        void handleSubmit(values);
      })}
    >
      <Stack gap="sm">
        <TextInput label="Mod Name" placeholder="My Mod" {...form.getInputProps('name')} />
        <TextInput label="Mod Version" placeholder="e.g. 1.2.0" {...form.getInputProps('version')} />

        <Checkbox
          label="Is Native (has DLL)?"
          checked={form.values.isDll}
          onChange={(e) => handleIsDllChange(e.currentTarget.checked)}
        />
        {form.values.isDll && (
          <Group gap="sm" align="flex-end">
            <TextInput
              withAsterisk
              label="DLL File"
              readOnly
              style={{ flex: 1 }}
              value={dllDisplayValue}
              error={form.errors.dllPath}
            />
            <Button variant="outline" onClick={() => void handleBrowseDll()}>
              Browse
            </Button>
          </Group>
        )}

        <Checkbox
          label="Has tool?"
          checked={form.values.hasTool}
          onChange={(e) => handleHasToolChange(e.currentTarget.checked)}
        />
        {form.values.hasTool && (
          <>
            <TextInput
              withAsterisk
              label="Tool name"
              placeholder="e.g. Randomizer App"
              {...form.getInputProps('toolName')}
            />
            <TextInput label="Tool version" placeholder="e.g. 1.0.0" {...form.getInputProps('toolVersion')} />
            <Group gap="sm" align="flex-end">
              <TextInput
                withAsterisk
                label="Executable"
                readOnly
                style={{ flex: 1 }}
                value={exeDisplayValue}
                error={form.errors.exePath}
              />
              <Button variant="outline" onClick={() => void handleBrowseExe()}>
                Browse
              </Button>
            </Group>
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button type="submit" variant="filled">
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

export default EditModModal;

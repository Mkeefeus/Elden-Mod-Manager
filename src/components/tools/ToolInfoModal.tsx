import { Box, Stack, Group, TextInput, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Tool, ToolFormValues } from 'types';

type ToolInfoModalProps = {
  hideModal: () => void;
  toolNames: string[];
  onSubmit: (values: { path: string; name: string; version: string }) => void | Promise<void>;
  submitText?: string;
  tool?: Tool;
};

const ToolInfoModal = ({ hideModal, toolNames, onSubmit, submitText, tool }: ToolInfoModalProps) => {
  const isWindows = window.electronAPI.platform === 'win32';

  const form = useForm<ToolFormValues>({
    initialValues: {
      path: tool?.executablePath || '',
      name: tool?.name || '',
      version: tool?.version || '',
    },
    validate: {
      name: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return 'Tool name is required';
        if (tool && tool.name.toLowerCase() === trimmed.toLowerCase()) return null;
        if (toolNames.some((toolName) => toolName.toLowerCase() === trimmed.toLowerCase())) {
          return 'A tool with this name already exists';
        }
        return null;
      },
      path: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return 'Tool path is required';
        if (isWindows && !trimmed.toLowerCase().endsWith('.exe')) return 'Path must point to an .exe file';
        if (!isWindows && !trimmed.match(/.+\.(app|sh|bin|AppImage|exe)$/)) {
          return 'Path must point to an executable file';
        }
        return null;
      },
    },
  });

  const inferNameFromPath = (selectedPath: string) => {
    const fileName = selectedPath.split(/[\\/]/).pop() ?? '';
    return fileName.replace(/\.[^.]+$/, '');
  };

  const inferVersionFromPath = (selectedPath: string) => {
    return selectedPath.match(/v?\d+\.\d+(?:\.\d+)?/)?.[0] ?? '';
  };

  const handleBrowse = async () => {
    const selected = await window.electronAPI.browse('exe', 'Select Tool Executable');
    if (!selected) return;

    form.setValues({
      path: selected,
      name: form.values.name || inferNameFromPath(selected),
      version: form.values.version || inferVersionFromPath(selected),
    });
    form.validateField('path');
    form.validateField('name');
  };

  return (
    <Box p="xl">
      <form
        onSubmit={form.onSubmit(async (values) => {
          await onSubmit(values);
          hideModal();
        })}
      >
        <Stack gap="md" maw={600}>
          <Group gap="sm" align="flex-end">
            <TextInput
              label="Tool Path"
              placeholder={isWindows ? 'C:\\Path\\To\\Tool.exe' : '/path/to/tool'}
              readOnly
              style={{ flex: 1 }}
              {...form.getInputProps('path')}
            />
            <Button variant="outline" onClick={() => void handleBrowse()}>
              Browse
            </Button>
          </Group>
          {form.values.path && (
            <>
              <TextInput label="Tool Name" placeholder="My Utility" {...form.getInputProps('name')} />

              <TextInput label="Tool Version" placeholder="e.g. 1.2.0" {...form.getInputProps('version')} />

              <Button type="submit" disabled={!form.values.path}>
                {submitText || 'Submit'}
              </Button>
            </>
          )}
        </Stack>
      </form>
    </Box>
  );
};

export default ToolInfoModal;

import { Box, Stack, Group, TextInput, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import { sendLog } from '~/utils/rendererLogger';

type AddToolModalProps = {
  hideModal: () => void;
  toolNames: string[];
};

type ToolFormValues = {
  path: string;
  name: string;
  version: string;
};

const AddToolModal = ({ hideModal, toolNames }: AddToolModalProps) => {
  const isWindows = window.electronAPI.platform === 'win32';

  const form = useForm<ToolFormValues>({
    initialValues: {
      path: '',
      name: '',
      version: '',
    },
    validate: {
      name: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return 'Tool name is required';
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

  const handleAddTool = async (values: ToolFormValues) => {
    // Placeholder for adding the tool - would save to state and persist
    hideModal();
    const sanitizedValues = {
      name: values.name.trim(),
      version: values.version.trim(),
      path: values.path.trim(),
    };
    const success = await window.electronAPI.addTool(
      sanitizedValues.name,
      sanitizedValues.version,
      sanitizedValues.path
    );
    if (!success) {
      return;
    }
    sendLog({
      level: 'info',
      message: `Added tool: ${sanitizedValues.name} ${sanitizedValues.version ? `(${sanitizedValues.version}) ` : ''}at path: ${sanitizedValues.path} (placeholder, not actually saved)`,
    });
  };

  return (
    <Box p="xl">
      <form onSubmit={form.onSubmit(handleAddTool)}>
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
                Add Tool (placeholder)
              </Button>
            </>
          )}
        </Stack>
      </form>
    </Box>
  );
};

export default AddToolModal;

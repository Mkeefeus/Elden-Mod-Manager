import { Box, Stack, Group, TextInput, Button, Checkbox, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { Tool, ToolFormValues } from 'types';

type ToolInfoModalProps = {
  hideModal: () => void;
  tools: Tool[];
  onSubmit: (values: ToolFormValues) => void | Promise<void>;
  type: 'archive' | 'file';
  submitText?: string;
  tool?: Tool;
};

const ToolInfoModal = ({ hideModal, tools, onSubmit, submitText, tool, type }: ToolInfoModalProps) => {
  const isWindows = window.electronAPI.platform === 'win32';
  const [isExtractingArchive, setIsExtractingArchive] = useState(false);

  const form = useForm<ToolFormValues>({
    initialValues: {
      path: tool?.executablePath || '',
      name: tool?.name || '',
      version: tool?.version || '',
      copy: true,
      deleteSource: true,
      cleanupPath: '',
    },
    validate: {
      name: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return 'Tool name is required';
        const trimmedVersion = form.values.version.trim();
        const hasDuplicate = tools.some((t) => {
          if (tool && t.id === tool.id) return false;
          return t.name.toLowerCase() === trimmed.toLowerCase() && (t.version || '') === trimmedVersion;
        });
        if (hasDuplicate) return 'A tool with this name and version already exists';
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
    if (type === 'archive') {
      const archivePath = await window.electronAPI.browse('archive', 'Select Tool Archive');
      if (!archivePath) return;

      try {
        setIsExtractingArchive(true);
        const extractedPath = await window.electronAPI.extractArchive(archivePath);
        if (!extractedPath) {
          notifications.show({
            title: 'Invalid archive',
            message: 'Could not extract the selected archive.',
            color: 'red',
          });
          return;
        }

        const selectedExecutable = await window.electronAPI.browse(
          'exe',
          'Select Tool Executable from Extracted Archive',
          extractedPath
        );
        if (!selectedExecutable) return;

        form.setValues({
          path: selectedExecutable,
          cleanupPath: extractedPath,
          name: form.values.name || inferNameFromPath(selectedExecutable),
          version: form.values.version || inferVersionFromPath(selectedExecutable),
          copy: true,
        });
      } catch (err) {
        notifications.show({
          title: 'Archive extraction failed',
          message: String(err),
          color: 'red',
        });
      } finally {
        setIsExtractingArchive(false);
      }
    } else {
      const selected = await window.electronAPI.browse('exe', 'Select Tool Executable');
      if (!selected) return;

      form.setValues({
        path: selected,
        cleanupPath: '',
        name: form.values.name || inferNameFromPath(selected),
        version: form.values.version || inferVersionFromPath(selected),
      });
    }

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
          {type === 'archive' && (
            <Text size="sm" c="dimmed">
              Select an archive, then choose the executable from the extracted files.
            </Text>
          )}
          <Group gap="sm" align="flex-end">
            <TextInput
              label="Tool Path"
              placeholder={isWindows ? 'C:\\Path\\To\\Tool.exe' : '/path/to/tool'}
              readOnly
              style={{ flex: 1 }}
              {...form.getInputProps('path')}
            />
            <Button variant="outline" onClick={() => void handleBrowse()} loading={isExtractingArchive}>
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
              {type === 'file' && (
                <>
                  <Checkbox
                    label="Copy to data directory"
                    description="Copy the tool to the app's tools directory"
                    {...form.getInputProps('copy', { type: 'checkbox' })}
                  ></Checkbox>
                  {form.values.copy && (
                    <Checkbox
                      label="Delete source"
                      description="Delete the original tool file after copying"
                      {...form.getInputProps('deleteSource', { type: 'checkbox' })}
                    ></Checkbox>
                  )}
                </>
              )}
            </>
          )}
        </Stack>
      </form>
    </Box>
  );
};

export default ToolInfoModal;

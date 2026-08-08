import { useEffect } from 'react';
import { Button, Checkbox, Group, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { EditModFormValues, Mod, Tool } from 'types';
import { useMods } from '@providers/ModsProvider';
import { sendLog } from '@utils/rendererLogger';

type EditModModalProps = {
  mod: Mod;
  close: () => void;
};

const EditModModal = ({ mod, close }: EditModModalProps) => {
  const { loadMods, mods } = useMods();
  const queryClient = useQueryClient();

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => window.electronAPI.getTools(),
  });
  const linkedTool = tools.find((tool: Tool) => tool.id === mod.toolId);

  const form = useForm<EditModFormValues>({
    initialValues: {
      modName: mod.name,
      modVersion: mod.version ?? '',
      hasTool: !!mod.toolId,
      toolName: linkedTool?.name ?? '',
      toolVersion: linkedTool?.version ?? '',
      toolPath: linkedTool?.executablePath ?? '',
    },
    validate: {
      modName: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return 'Mod name is required';
        const duplicate = mods.some(
          (m) =>
            m.uuid !== mod.uuid &&
            m.name.trim().toLowerCase() === trimmed.toLowerCase() &&
            (m.version ?? '').trim().toLowerCase() === (form.values.modVersion ?? '').trim().toLowerCase()
        );
        if (duplicate) return 'A mod with this name and version already exists';
        return null;
      },
      toolPath: (value, values) => (values.hasTool && !value ? 'Executable is required' : null),
    },
  });

  useEffect(() => {
    if (!linkedTool) return;
    form.setValues({
      toolName: linkedTool.name,
      toolVersion: linkedTool.version ?? '',
      toolPath: linkedTool.executablePath,
    });
  }, [linkedTool?.id]);

  const handleBrowseTool = async () => {
    const selected = await window.electronAPI.browse('exe', 'Select Tool Executable');
    if (!selected) return;
    form.setFieldValue('toolPath', selected);
  };

  const handleSubmit = async (values: EditModFormValues) => {
    const success = await window.electronAPI.editMod(mod.uuid, {
      modName: values.modName.trim(),
      modVersion: values.modVersion?.trim() || undefined,
      hasTool: values.hasTool,
      toolName: values.toolName?.trim() || undefined,
      toolVersion: values.toolVersion?.trim() || undefined,
      toolPath: values.toolPath?.trim() || undefined,
    });
    if (!success) {
      notifications.show({
        title: 'Failed to edit mod',
        message: 'The mod could not be updated. Check the logs for more details.',
        color: 'red',
      });
      return;
    }
    sendLog({ level: 'info', message: `Mod "${values.modName}" updated successfully`, hideDisplay: true });
    await loadMods();
    await queryClient.invalidateQueries({ queryKey: ['tools'] });
    close();
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        void handleSubmit(values);
      })}
    >
      <Stack gap="sm">
        <TextInput label="Mod Name" withAsterisk {...form.getInputProps('modName')} />
        <TextInput label="Version" placeholder="e.g. 1.0.0" {...form.getInputProps('modVersion')} />

        <Checkbox label="Has associated tool/executable" {...form.getInputProps('hasTool', { type: 'checkbox' })} />

        {form.values.hasTool && (
          <>
            <Group align="flex-end">
              <TextInput
                withAsterisk
                label="Tool Executable"
                readOnly
                style={{ flex: 4 }}
                {...form.getInputProps('toolPath')}
              />
              <Button style={{ flex: 1 }} onClick={() => void handleBrowseTool()}>
                Browse
              </Button>
            </Group>
            <TextInput label="Tool Name" {...form.getInputProps('toolName')} />
            <TextInput label="Tool Version" {...form.getInputProps('toolVersion')} />
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

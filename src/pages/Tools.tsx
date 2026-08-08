import { Button, Divider, Group, Menu, ScrollArea, Stack } from '@mantine/core';
import ToolTable from '@components/tools/ToolTable';
import { useModal } from '~/providers/ModalProvider';
import ToolInfoModal from '~/components/tools/ToolInfoModal';
import { Tool, ToolFormValues } from 'types';
import { useQuery } from '@tanstack/react-query';
import { sendLog } from '~/utils/rendererLogger';
import { useQueryClient } from '@tanstack/react-query';

const Tools = () => {
  const { showModal, hideModal } = useModal();
  // const [tools] = useState<Tool[]>(PLACEHOLDER_TOOLS); // Placeholder state - would be loaded from DB via useQuery
  const queryClient = useQueryClient();

  type AddToolSource = 'archive' | 'file';

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: async () => {
      const dbTools = await window.electronAPI.getTools();
      if (!dbTools) {
        sendLog({ level: 'error', message: 'Failed to load tools' });
        return [] as Tool[];
      }
      return [...dbTools]; // Add placeholder tools for now
    },
    staleTime: 30_000, // or Infinity if you rely solely on invalidation
  });

  const handleAddTool = async (values: ToolFormValues) => {
    const cleanupPathValue = (values as ToolFormValues & { cleanupPath?: string }).cleanupPath;
    const cleanupPath = typeof cleanupPathValue === 'string' ? cleanupPathValue.trim() : undefined;

    // Placeholder for adding the tool - would save to state and persist
    const sanitizedValues: ToolFormValues = {
      name: values.name.trim(),
      version: values.version.trim(),
      path: values.path.trim(),
      copy: values.copy,
      deleteSource: values.deleteSource,
      ...(cleanupPath ? { cleanupPath } : {}),
    };
    await window.electronAPI.addTool(sanitizedValues);
    void queryClient.invalidateQueries({ queryKey: ['tools'] });
    hideModal();
  };

  const showToolInfoModal = (source: AddToolSource) => {
    const sourceLabel = source === 'archive' ? 'Archive' : 'File';

    showModal({
      title: `Add Tool from ${sourceLabel}`,
      content: (
        <ToolInfoModal
          hideModal={hideModal}
          tools={tools}
          type={source}
          onSubmit={handleAddTool}
          submitText={`Add Tool from ${sourceLabel}`}
        />
      ),
    });
  };

  return (
    <Stack gap="sm" flex={1} style={{ minHeight: 0, overflow: 'hidden' }}>
      <ScrollArea style={{ flex: '1 1 0', minHeight: 0 }}>
        <ToolTable tools={tools} />
      </ScrollArea>
      <Stack gap="xs" style={{ flexShrink: 0 }}>
        <Divider />
        <Group gap="sm">
          <Menu shadow="md" width={220}>
            <Menu.Target>
              <Button variant="filled">Add Tool</Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Add Tool</Menu.Label>
              <Menu.Item onClick={() => showToolInfoModal('archive')}>From Archive</Menu.Item>
              <Menu.Item onClick={() => showToolInfoModal('file')}>From File</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Stack>
    </Stack>
  );
};

export default Tools;

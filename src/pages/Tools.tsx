import { Button, Divider, Group, ScrollArea, Stack } from '@mantine/core';
import ToolTable from '@components/tools/ToolTable';
import { useModal } from '~/providers/ModalProvider';
import ToolInfoModal from '~/components/tools/ToolInfoModal';
import { Tool, ToolFormValues } from 'types';
import { useQuery } from '@tanstack/react-query';
import { sendLog } from '~/utils/rendererLogger';
import { useQueryClient } from '@tanstack/react-query';

const PLACEHOLDER_TOOLS: Tool[] = [
  {
    id: 'tool-1',
    name: 'Regulation Viewer',
    version: '0.1.0',
    installDate: 1762923600000,
    executablePath: '/path/to/regulation-viewer.exe',
  },
  {
    id: 'tool-2',
    name: 'Param Diff Helper',
    version: '0.0.4',
    installDate: 1762923600000,
    executablePath: '/path/to/param-diff-helper.exe',
  },
  {
    id: 'tool-3',
    name: 'Save Archive Utility',
    version: '0.2.0',
    installDate: 1762923600000,
    executablePath: '/path/to/save-archive-utility.exe',
  },
];

const Tools = () => {
  const { showModal, hideModal } = useModal();
  // const [tools] = useState<Tool[]>(PLACEHOLDER_TOOLS); // Placeholder state - would be loaded from DB via useQuery
  const queryClient = useQueryClient();

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: async () => {
      const dbTools = await window.electronAPI.getTools();
      if (!dbTools) {
        sendLog({ level: 'error', message: 'Failed to load tools' });
        return [] as Tool[];
      }
      return [...dbTools, ...PLACEHOLDER_TOOLS]; // Add placeholder tools for now
    },
    staleTime: 30_000, // or Infinity if you rely solely on invalidation
  });

  const handleAddTool = async (values: ToolFormValues) => {
    // Placeholder for adding the tool - would save to state and persist
    const sanitizedValues: Partial<Tool> = {
      name: values.name.trim(),
      version: values.version.trim(),
      executablePath: values.path.trim(),
    };
    await window.electronAPI.addTool(sanitizedValues);
    void queryClient.invalidateQueries({ queryKey: ['tools'] });
    hideModal();
  };

  const showToolInfoModal = () => {
    showModal({
      title: 'Add Tool',
      content: (
        <ToolInfoModal
          hideModal={hideModal}
          toolNames={tools.map((tool) => tool.name)}
          onSubmit={handleAddTool}
          submitText="Add Tool"
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
          <Button variant="filled" onClick={showToolInfoModal}>
            Add Tool
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
};

export default Tools;

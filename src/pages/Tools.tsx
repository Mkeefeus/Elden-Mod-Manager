import { Button, Divider, Group, ScrollArea, Stack } from '@mantine/core';
import ToolTable from '@components/tools/ToolTable';
import { useModal } from '~/providers/ModalProvider';
import AddToolModal from '~/components/tools/AddToolModal';
import { Tool } from 'types';
import { useState } from 'react';

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
  const [tools] = useState<Tool[]>(PLACEHOLDER_TOOLS); // Placeholder state - would be loaded from DB via useQuery
  const showAddToolModal = () => {
    showModal({
      title: 'Add Tool',
      content: <AddToolModal hideModal={hideModal} toolNames={tools.map((tool) => tool.name)} />,
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
          <Button variant="filled" onClick={showAddToolModal}>
            Add Tool
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
};

export default Tools;

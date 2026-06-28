import { Menu, Table } from '@mantine/core';
import MoreMenuTrigger from '../shared/MoreMenuTrigger';
import { Tool } from 'types';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal';
import { useModal } from '@providers/ModalProvider';
import ToolInfoModal from './ToolInfoModal';

const ToolTableMenu = ({ tool, toolNames }: { tool: Tool; toolNames: string[] }) => {
  const queryClient = useQueryClient();
  const { showModal, hideModal } = useModal();
  const handleOpenToolFolder = () => {
    window.electronAPI.openToolFolder(tool.executablePath);
  };

  const handleUpdateTool = () => {
    // Placeholder for update/reinstall behavior.
    const onSubmit = async (values: { path: string; name: string; version: string }) => {
      const sanitizedValues: Partial<Tool> = {
        name: values.name.trim(),
        version: values.version.trim(),
        executablePath: values.path.trim(),
      };
      await window.electronAPI.editTool(tool.id, sanitizedValues);
      void queryClient.invalidateQueries({ queryKey: ['tools'] });
    };

    showModal({
      title: 'Edit Tool',
      content: (
        <ToolInfoModal
          hideModal={hideModal}
          toolNames={toolNames}
          onSubmit={onSubmit}
          submitText="Update Tool"
          tool={tool}
        />
      ),
    });
    void tool;
  };

  const handleRemoveTool = () => {
    const onDelete = async () => {
      // Placeholder for delete/uninstall confirmation flow.
      await window.electronAPI.deleteTool(tool.id);
      // invalidate the tools query to refresh the list after deletion
      void queryClient.invalidateQueries({ queryKey: ['tools'] });
    };
    showModal({
      title: 'Remove Tool',
      content: <ConfirmDeleteModal title={tool.name} onDelete={onDelete} />,
    });
  };

  return (
    <Table.Td>
      <Menu shadow="md" width={220}>
        <Menu.Target>
          <MoreMenuTrigger ariaLabel={`Open actions for ${tool.name}`} />
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item color="blue" onClick={handleUpdateTool}>
            Edit Tool
          </Menu.Item>
          <Menu.Item onClick={handleOpenToolFolder}>Open Containing Folder</Menu.Item>
          <Menu.Item color="red" onClick={() => void handleRemoveTool()}>
            Remove Tool
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Table.Td>
  );
};

export default ToolTableMenu;

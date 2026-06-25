import { Menu, Table } from '@mantine/core';
import MoreMenuTrigger from '../shared/MoreMenuTrigger';
import { Tool } from 'types';

const ToolTableMenu = ({ tool }: { tool: Tool }) => {
  const handleConfigureTool = () => {
    // Placeholder for tool-specific settings modal/action.
    void tool;
  };

  const handleOpenToolFolder = () => {
    // Placeholder for opening this tool's install folder.
    void tool;
  };

  const handleUpdateTool = () => {
    // Placeholder for update/reinstall behavior.
    void tool;
  };

  const handleRemoveTool = () => {
    // Placeholder for delete/uninstall confirmation flow.
    void tool;
  };

  return (
    <Table.Td>
      <Menu shadow="md" width={220}>
        <Menu.Target>
          <MoreMenuTrigger ariaLabel={`Open actions for ${tool.name}`} />
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item onClick={handleConfigureTool}>Configure Tool</Menu.Item>
          <Menu.Item onClick={handleOpenToolFolder}>Open Tool Folder</Menu.Item>
          <Menu.Item color="blue" onClick={handleUpdateTool}>
            Check for Updates
          </Menu.Item>
          <Menu.Item color="red" onClick={handleRemoveTool}>
            Remove Tool
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Table.Td>
  );
};

export default ToolTableMenu;

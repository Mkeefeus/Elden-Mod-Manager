import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Button, Center, Menu, Table } from '@mantine/core';

type ModTableMenuProps = {
  canMove: { up: boolean; down: boolean };
  hasExe?: boolean;
  changePriority: (direction: 'up' | 'down') => void;
  handleDelete: () => void;
  handleOpenExe: () => void;
};

const ModTableMenu = ({ canMove, hasExe, changePriority, handleDelete, handleOpenExe }: ModTableMenuProps) => {
  return (
    <Table.Td>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Center>
            <Button variant="transparent" color="gray">
              <FontAwesomeIcon icon={faEllipsisVertical} />
            </Button>
          </Center>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item disabled={!canMove.up} onClick={() => changePriority('up')}>
            Increase Priority
          </Menu.Item>
          <Menu.Item disabled={!canMove.down} onClick={() => changePriority('down')}>
            Decrease Priority
          </Menu.Item>
          {hasExe && (
            <Menu.Item color="blue" onClick={handleOpenExe}>
              Open Exe
            </Menu.Item>
          )}
          <Menu.Item color="red" onClick={handleDelete}>
            Delete Mod
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Table.Td>
  );
};

export default ModTableMenu;

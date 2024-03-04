import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Button, Center, Menu, Table } from '@mantine/core';

type ModTableMenuProps = {
  canMove: { up: boolean; down: boolean };
  handleMove: (direction: 'up' | 'down') => void;
  handleDelete: () => void;
};

const ModTableMenu = ({ canMove, handleMove, handleDelete }: ModTableMenuProps) => {
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
          <Menu.Item disabled={!canMove.up} onClick={() => handleMove('up')}>
            Move Up
          </Menu.Item>
          <Menu.Item disabled={!canMove.down} onClick={() => handleMove('down')}>
            Move Down
          </Menu.Item>
          <Menu.Item color="red" onClick={handleDelete}>
            Delete Mod
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Table.Td>
  );
};

export default ModTableMenu;

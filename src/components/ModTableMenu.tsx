import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Button, Center, Menu, Table } from '@mantine/core';
import { Mod } from 'types';
import { useModal } from '../providers/ModalProvider';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { useMods } from '../providers/ModsProvider';

type ModTableMenuProps = {
  mod: Mod;
};

const ModTableMenu = ({ mod }: ModTableMenuProps) => {
  const { loadMods } = useMods();
  const { showModal } = useModal();

  const handleDelete = () => {
    showModal({
      title: 'Delete mod',
      content: <ConfirmDeleteModal mod={mod} loadMods={() => { void loadMods(); }} />,
    });
  };

  const handleOpenExe = () => {
    window.electronAPI.launchModExe(mod);
  };

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
          {mod.exe && (
            <Menu.Item color="blue" onClick={() => handleOpenExe()}>
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

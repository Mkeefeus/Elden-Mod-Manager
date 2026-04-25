import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Button, Center, Menu, Table } from '@mantine/core';
import { Mod } from 'types';
import { useModal } from '../providers/ModalProvider';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import LoadDepsModal from './LoadDepsModal';
import { useMods } from '../providers/ModsProvider';

type ModTableMenuProps = {
  mod: Mod;
};

const ModTableMenu = ({ mod }: ModTableMenuProps) => {
  const { loadMods } = useMods();
  const { showModal, hideModal } = useModal();

  const handleDelete = () => {
    showModal({
      title: 'Delete mod',
      content: <ConfirmDeleteModal mod={mod} loadMods={() => { void loadMods(); }} />,
    });
  };

  const handleOpenExe = () => {
    window.electronAPI.launchModExe(mod);
  };

  const handleEditDeps = () => {
    showModal({
      title: 'Edit load dependencies',
      content: <LoadDepsModal mod={mod} hideModal={hideModal} />,
    });
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
          <Menu.Item onClick={handleEditDeps}>Edit load dependencies</Menu.Item>
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

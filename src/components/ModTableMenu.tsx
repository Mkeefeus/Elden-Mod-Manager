import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Button, Center, Menu, Table } from '@mantine/core';
import { Mod } from 'types';
import { useModal } from '../providers/ModalProvider';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import EditNativeModModal from './EditNativeModModal';
import IniEditorModal from './IniEditorModal';
import { useMods } from '../providers/ModsProvider';

type ModTableMenuProps = {
  mod: Mod;
};

const ModTableMenu = ({ mod }: ModTableMenuProps) => {
  const { loadMods } = useMods();
  const { showModal, hideModal } = useModal();
  const [hasIniFiles, setHasIniFiles] = useState(false);

  useEffect(() => {
    const check = async () => {
      const files = await window.electronAPI.listIniFiles(mod);
      setHasIniFiles(files.length > 0);
    };
    void check();
  }, [mod.uuid, mod.name, mod.version]);

  const handleDelete = () => {
    showModal({
      title: 'Delete mod',
      content: (
        <ConfirmDeleteModal
          mod={mod}
          loadMods={() => {
            void loadMods();
          }}
        />
      ),
    });
  };

  const handleOpenExe = () => {
    window.electronAPI.launchModExe(mod);
  };

  const handleOpenFolder = () => {
    window.electronAPI.openModFolder(mod);
  };

  const handleEditProperties = () => {
    showModal({
      title: `Edit Properties — ${mod.name}`,
      content: <EditNativeModModal mod={mod} close={hideModal} />,
    });
  };

  const handleEditIniFiles = () => {
    showModal({
      title: `INI Files — ${mod.name}`,
      content: <IniEditorModal mod={mod} close={hideModal} />,
      size: 'xl',
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
          {mod.dllFile && <Menu.Item onClick={handleEditProperties}>Edit Properties</Menu.Item>}
          {hasIniFiles && <Menu.Item onClick={handleEditIniFiles}>Edit INI Files</Menu.Item>}
          {mod.exe && (
            <Menu.Item color="blue" onClick={() => handleOpenExe()}>
              Open Exe
            </Menu.Item>
          )}
          <Menu.Item onClick={handleOpenFolder}>Open Folder</Menu.Item>
          <Menu.Item color="red" onClick={handleDelete}>
            Delete Mod
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Table.Td>
  );
};

export default ModTableMenu;

import { useEffect, useState } from 'react';
import { Menu, Table } from '@mantine/core';
import { Mod } from 'types';
import { useModal } from '@providers/ModalProvider';
import ConfirmDeleteModal from '@components/shared/ConfirmDeleteModal';
import EditNativeModModal from './EditNativeModModal';
import IniEditorModal from './IniEditorModal';
import { useMods } from '@providers/ModsProvider';
import MoreMenuTrigger from '../shared/MoreMenuTrigger';
import { sendLog } from '~/utils/rendererLogger';

type TableMod = Mod & { enabled: boolean };

type ModTableMenuProps = {
  mod: TableMod;
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
  }, [mod.uuid]);

  const handleDelete = () => {
    const onDelete = async () => {
      await window.electronAPI.deleteMod(mod);
      sendLog({
        level: 'info',
        message: `Deleted mod ${mod.name}`,
      });
    };
    const afterDelete = () => {
      void loadMods();
    };
    showModal({
      title: 'Delete mod',
      content: <ConfirmDeleteModal title={mod.name} onDelete={onDelete} afterDelete={afterDelete} />,
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
      title: `Profile Settings — ${mod.name}`,
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
          <MoreMenuTrigger ariaLabel={`Open actions for ${mod.name}`} />
        </Menu.Target>
        <Menu.Dropdown>
          {mod.dllFile && (
            <Menu.Item onClick={handleEditProperties} disabled={!mod.enabled}>
              Edit Profile Settings
            </Menu.Item>
          )}
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

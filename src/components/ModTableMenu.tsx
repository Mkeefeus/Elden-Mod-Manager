import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Button, Center, Menu, Table } from '@mantine/core';
import { Mod } from 'types';
import { useMods } from '../providers/ModsProvider';
import { sendLog } from '../utils/rendererLogger';
import { useModal } from '../providers/ModalProvider';
import ConfirmDeleteModal from './ConfirmDeleteModal';

type ModTableMenuProps = {
  mod: Mod;
};

const ModTableMenu = ({ mod }: ModTableMenuProps) => {
  const { mods, saveMods, loadMods } = useMods();
  const { showModal } = useModal();
  const handleDelete = () => {
    showModal({
      title: 'Delete mod',
      content: <ConfirmDeleteModal mod={mod} loadMods={loadMods} />,
    });
  };
  const handleOpenExe = () => {
    window.electronAPI.launchModExe(mod);
  };

  const getSwapIndex = (mod: Mod, direction: 'up' | 'down') => {
    if (!mod.loadOrder) {
      sendLog({
        level: 'error',
        message: `Mod ${mod.name} does not have load order`,
      });
      return;
    }
    const swapLoadOrder = direction === 'up' ? mod.loadOrder - 1 : mod.loadOrder + 1;
    const swapIndex = mods.findIndex((m) => m.loadOrder === swapLoadOrder);
    return swapIndex;
  };

  const changePriority = (direction: 'up' | 'down') => {
    const index = mods.findIndex((m) => m.uuid === mod.uuid);
    const swapIndex = getSwapIndex(mod, direction);
    if (swapIndex === undefined) {
      sendLog({
        level: 'error',
        message: `Failed to get swap index for ${mod.name}`,
      });
      return;
    }
    // Check if swapIndex is within the valid range
    if (swapIndex < 0 || swapIndex >= mods.length) {
      sendLog({
        level: 'error',
        message: `Invalid swap index for ${mod.name}`,
      });
      return;
    }
    const newMods = [...mods];
    const temp = newMods[index].loadOrder;
    newMods[index].loadOrder = newMods[swapIndex].loadOrder;
    newMods[swapIndex].loadOrder = temp;
    saveMods(newMods);
  };
  const canMove = {
    up: (mod.enabled && mod.loadOrder && mod.loadOrder > 1) || false,
    down: (mod.enabled && mod.loadOrder && mod.loadOrder < mods.filter((mod) => mod.enabled).length) || false,
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
          <Menu.Item disabled={!canMove.up} onClick={() => changePriority('up')}>
            Increase Priority
          </Menu.Item>
          <Menu.Item disabled={!canMove.down} onClick={() => changePriority('down')}>
            Decrease Priority
          </Menu.Item>
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

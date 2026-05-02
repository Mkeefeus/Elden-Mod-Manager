import { Button, Collapse, Divider, Group, ScrollArea, Stack, Switch, Text, TextInput } from '@mantine/core';
import ModTable from '../components/ModTable';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AddMod from '../components/AddMod';
import { useModal } from '../providers/ModalProvider';
import PromptModsFolderModal from '../components/PromptModsFolderModal';
import { useMods } from '../providers/ModsProvider';
import ProfileSelector from '../components/ProfileSelector';
import LoadOrderModal from '../components/LoadOrderModal';

const Mods = () => {
  const location = useLocation();
  const { showModal, hideModal } = useModal();
  const { mods, loadMods } = useMods();
  const [startOnline, setStartOnlineState] = useState<boolean>(false);
  const [savefile, setSavefileState] = useState<string>('');
  const [useCustomSavefile, setUseCustomSavefile] = useState<boolean>(false);
  const [disableArxan, setDisableArxanState] = useState<boolean>(false);
  const [noMemPatch, setNoMemPatchState] = useState<boolean>(false);
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);

  const refreshProfileSettings = () => {
    void window.electronAPI.getActiveProfile().then((profile) => {
      if (!profile) return;
      setStartOnlineState(profile.startOnline);
      setSavefileState(profile.savefile);
      setUseCustomSavefile(!!profile.savefile);
      setDisableArxanState(profile.disableArxan);
      setNoMemPatchState(profile.noMemPatch);
    });
  };

  useEffect(() => {
    refreshProfileSettings();
  }, []);

  const handleStartOnlineChange = (value: boolean) => {
    setStartOnlineState(value);
    window.electronAPI.updateActiveProfileSettings({ startOnline: value });
  };

  const handleCustomSavefileToggle = (enabled: boolean) => {
    setUseCustomSavefile(enabled);
    if (!enabled) {
      setSavefileState('');
      window.electronAPI.updateActiveProfileSettings({ savefile: '' });
    }
  };

  const handleSavefileChange = (value: string) => {
    setSavefileState(value);
    window.electronAPI.updateActiveProfileSettings({ savefile: value });
  };

  const handleDisableArxanChange = (value: boolean) => {
    setDisableArxanState(value);
    window.electronAPI.updateActiveProfileSettings({ disableArxan: value });
  };

  const handleNoMemPatchChange = (value: boolean) => {
    setNoMemPatchState(value);
    window.electronAPI.updateActiveProfileSettings({ noMemPatch: value });
  };

  const handleModalClose = () => {
    hideModal();
  };

  const showLoadOrderModal = () => {
    showModal({
      title: 'Load Order',
      content: <LoadOrderModal hideModal={hideModal} />,
    });
  };

  const showAddModModal = (fromZip: boolean) => {
    showModal({
      title: 'Add Mod',
      content: (
        <AddMod
          close={handleModalClose}
          fromZip={fromZip}
          namesInUse={mods.map((mod) => mod.name.toLowerCase())}
          loadMods={() => {
            void loadMods();
          }}
        />
      ),
    });
  };

  const checkModsFolderPrompt = async () => {
    const prompted = await window.electronAPI.checkModsFolderPrompt();
    if (prompted) return;
    showModal({
      title: 'Select Mods Folder',
      content: <PromptModsFolderModal hideModal={hideModal} />,
    });
  };

  useEffect(() => {
    void checkModsFolderPrompt();
  }, []);

  useEffect(() => {
    if (location.state) {
      const { opened, fromZip } = location.state as { opened: boolean; fromZip: boolean };
      if (!opened) return;
      showAddModModal(fromZip);
    }
  }, [location]);

  return (
    <Stack gap="sm" flex={1} style={{ minHeight: 0, overflow: 'hidden' }}>
      {/* Scrollable mod table — grows to fill space */}
      <ScrollArea style={{ flex: '1 1 0', minHeight: 0 }}>
        <ModTable />
      </ScrollArea>

      {/* Fixed bottom toolbar section */}
      <Stack gap="xs" style={{ flexShrink: 0 }}>
        <Divider />

        {/* Row 1: Add mod actions (left) + profile controls (right) */}
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            <Button variant="outline" onClick={() => showAddModModal(true)}>
              Add Mod from Zip
            </Button>
            <Button variant="outline" onClick={() => showAddModModal(false)}>
              Add Mod from Folder
            </Button>
            <Button variant="outline" onClick={showLoadOrderModal}>
              Load Order
            </Button>
          </Group>
          <Group gap="sm">
            <ProfileSelector onApply={refreshProfileSettings} />
          </Group>
        </Group>

        {/* Row 2: Primary launch action */}
        <Button variant="filled" size="md" onClick={() => window.electronAPI.launchGame(true)}>
          Launch Game
        </Button>

        {/* Row 3: Advanced settings toggle */}
        <Group gap="xs">
          <Button variant="subtle" size="xs" onClick={() => setAdvancedOpen((o) => !o)}>
            {advancedOpen ? '▲ Hide Advanced' : '▼ Show Advanced'}
          </Button>
        </Group>

        <Collapse expanded={advancedOpen}>
          <Stack gap="xs" pt="xs">
            <Text size="sm" fw={500} c="dimmed">
              Advanced Settings
            </Text>
            <Switch
              label="Custom Save File Name"
              description="Override the default save file name (default: off)"
              checked={useCustomSavefile}
              onChange={(e) => handleCustomSavefileToggle(e.currentTarget.checked)}
            />
            {useCustomSavefile && (
              <TextInput
                description="Override the default save file name, e.g. MyModdedSave.sl2"
                placeholder="Leave blank to use the default save"
                value={savefile}
                onChange={(e) => handleSavefileChange(e.currentTarget.value)}
                style={{ maxWidth: 400 }}
              />
            )}
            <Switch
              label="Start Online"
              description="Launch the game in online mode (default: off)"
              checked={startOnline}
              onChange={(e) => handleStartOnlineChange(e.currentTarget.checked)}
            />
            <Switch
              label="Disable Arxan"
              description="Neutralize Arxan/GuardIT code protection (default: off)"
              checked={disableArxan}
              onChange={(e) => handleDisableArxanChange(e.currentTarget.checked)}
            />
            <Switch
              label="Skip Memory Patch"
              description="Do not increase memory limits — may affect game stability (default: off)"
              checked={noMemPatch}
              onChange={(e) => handleNoMemPatchChange(e.currentTarget.checked)}
            />
          </Stack>
        </Collapse>
      </Stack>
    </Stack>
  );
};

export default Mods;

import { Button, Collapse, Divider, Group, ScrollArea, Stack, Switch, Text, TextInput } from '@mantine/core';
import ModTable from '../components/ModTable';
import { useEffect, useState } from 'react';
import { ModProfile } from 'types';
import { useModal } from '../providers/ModalProvider';
import PromptModsFolderModal from '../components/PromptModsFolderModal';
import ProfileSelector from '../components/ProfileSelector';
import LoadOrderModal from '../components/LoadOrderModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Mods = () => {
  const { showModal, hideModal } = useModal();
  const queryClient = useQueryClient();
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [useCustomSavefile, setUseCustomSavefile] = useState<boolean>(false);

  const { data: activeProfile } = useQuery({
    queryKey: ['active-profile'],
    queryFn: () => window.electronAPI.getActiveProfile(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (activeProfile?.savefile) setUseCustomSavefile(true);
  }, [activeProfile]);

  const updateActiveProfile = (patch: Partial<ModProfile>) => {
    queryClient.setQueryData(['active-profile'], { ...activeProfile!, ...patch });
    window.electronAPI.updateActiveProfileSettings(patch);
  };

  const handleCustomSavefileToggle = (enabled: boolean) => {
    setUseCustomSavefile(enabled);
    if (!enabled) {
      updateActiveProfile({ savefile: '' });
    } else {
      updateActiveProfile({
        savefile: activeProfile && activeProfile.savefile ? activeProfile.savefile : 'ModdedSave.sl2',
      });
    }
  };

  const showLoadOrderModal = () => {
    showModal({
      title: 'Load Order',
      content: <LoadOrderModal hideModal={hideModal} />,
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
            <Button variant="filled" onClick={() => window.electronAPI.openGetModsWindow()}>
              Get Mods
            </Button>
            <Button variant="outline" onClick={showLoadOrderModal}>
              Load Order
            </Button>
          </Group>
          <Group gap="sm">
            <ProfileSelector onApply={() => void queryClient.invalidateQueries({ queryKey: ['active-profile'] })} />
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
                value={activeProfile?.savefile ?? ''}
                onChange={(e) => updateActiveProfile({ savefile: e.currentTarget.value })}
                style={{ maxWidth: 400 }}
              />
            )}
            <Switch
              label="Start Online"
              description="Launch the game in online mode (default: off)"
              checked={activeProfile?.startOnline ?? false}
              onChange={(e) => updateActiveProfile({ startOnline: e.currentTarget.checked })}
            />
            <Switch
              label="Disable Arxan"
              description="Neutralize Arxan/GuardIT code protection (default: off)"
              checked={activeProfile?.disableArxan ?? false}
              onChange={(e) => updateActiveProfile({ disableArxan: e.currentTarget.checked })}
            />
            <Switch
              label="Skip Memory Patch"
              description="Do not increase memory limits — may affect game stability (default: off)"
              checked={activeProfile?.noMemPatch ?? false}
              onChange={(e) => updateActiveProfile({ noMemPatch: e.currentTarget.checked })}
            />
          </Stack>
        </Collapse>
      </Stack>
    </Stack>
  );
};

export default Mods;

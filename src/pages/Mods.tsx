import { Button, Collapse, Divider, Group, ScrollArea, Stack, Switch, Text, TextInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import ModTable from '@components/mods/ModTable';
import { useEffect, useState } from 'react';
import { ModProfile } from 'types';
import { useModal } from '@providers/ModalProvider';
import PromptModsFolderModal from '@components/PromptModsFolderModal';
import ProfileSelector from '@components/mods/ProfileSelector';
import LoadOrderModal from '@components/LoadOrderModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Mods = () => {
  const { showModal, hideModal } = useModal();
  const queryClient = useQueryClient();
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [useCustomSavefile, setUseCustomSavefile] = useState<boolean>(false);
  // Local copy of the save file name so typing isn't driven by the (async) query cache
  const [savefileInput, setSavefileInput] = useState<string>('');

  const { data: activeProfile } = useQuery({
    queryKey: ['active-profile'],
    queryFn: () => window.electronAPI.getActiveProfile(),
    staleTime: Infinity,
  });

  const updateActiveProfile = (patch: Partial<ModProfile>) => {
    queryClient.setQueryData<ModProfile>(['active-profile'], (prev) => prev && { ...prev, ...patch });
    window.electronAPI.updateActiveProfileSettings(patch);
  };

  const persistSavefile = useDebouncedCallback((savefile: string) => updateActiveProfile({ savefile }), {
    delay: 300,
    flushOnUnmount: true,
  });

  useEffect(() => {
    setUseCustomSavefile(!!activeProfile?.savefile);
  }, [activeProfile?.uuid]);

  useEffect(() => {
    // Don't clobber in-progress typing with a value that's about to be overwritten
    if (!persistSavefile.isPending()) setSavefileInput(activeProfile?.savefile ?? '');
  }, [activeProfile?.savefile]);

  const handleCustomSavefileToggle = (enabled: boolean) => {
    persistSavefile.cancel();
    setUseCustomSavefile(enabled);
    if (!enabled) {
      updateActiveProfile({ savefile: '' });
    } else {
      updateActiveProfile({
        savefile:
          activeProfile && activeProfile.savefile
            ? activeProfile.savefile
            : activeProfile
              ? `emm-${activeProfile.name.replace(/\s+/g, '-').toLowerCase()}.sl2`
              : 'ModdedSave.sl2',
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
                value={savefileInput}
                onChange={(e) => {
                  const input = e.currentTarget;
                  const value = input.value.replace(/\s/g, '-');
                  if (value !== input.value) {
                    // Swap in place (same length) so the cursor doesn't jump to the end
                    const cursor = input.selectionStart;
                    input.value = value;
                    input.setSelectionRange(cursor, cursor);
                  }
                  setSavefileInput(value);
                  persistSavefile(value);
                }}
                onBlur={() => {
                  if (savefileInput && !savefileInput.toLowerCase().endsWith('.sl2')) {
                    const value = `${savefileInput}.sl2`;
                    setSavefileInput(value);
                    persistSavefile(value);
                  }
                  persistSavefile.flush();
                }}
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
            {window.electronAPI.platform === 'linux' && (
              <Switch
                label="Override Proton Verb"
                description="Use 'proton run' rather than 'proton waitforexitandrun'. Use this when you need to run an app alongside the game (default: off)"
                checked={activeProfile?.overrideProtonVerb ?? false}
                onChange={(e) => updateActiveProfile({ overrideProtonVerb: e.currentTarget.checked })}
              />
            )}
          </Stack>
        </Collapse>
      </Stack>
    </Stack>
  );
};

export default Mods;

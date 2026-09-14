import { Button, Collapse, Divider, Group, ScrollArea, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import ModTable from '@components/mods/ModTable';
import { useEffect, useState } from 'react';
import { ModProfile } from 'types';
import { useModal } from '@providers/ModalProvider';
import PromptModsFolderModal from '@components/PromptModsFolderModal';
import ProfileSelector from '@components/mods/ProfileSelector';
import LoadOrderModal from '@components/LoadOrderModal';
import SettingSwitch from '@components/shared/SettingSwitch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sendLog } from '@utils/rendererLogger';

const OVERRIDE_EXE_TEXT_INPUT_STYLE = { flex: 7 };
const OVERRIDE_EXE_BUTTON_STYLE = { flex: 1 };

const Mods = () => {
  const { showModal, hideModal } = useModal();
  const queryClient = useQueryClient();
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [useCustomSavefile, setUseCustomSavefile] = useState<boolean>(false);
  // Local copy of the save file name so typing isn't driven by the (async) query cache
  const [savefileInput, setSavefileInput] = useState<string>('');
  const [overrideExe, setOverrideExe] = useState<boolean>(false);

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
  }, [activeProfile?.uuid, activeProfile?.savefile]);

  useEffect(() => {
    // Don't clobber in-progress typing with a value that's about to be overwritten
    if (!persistSavefile.isPending()) setSavefileInput(activeProfile?.savefile ?? '');
  }, [activeProfile?.savefile]);

  useEffect(() => {
    setOverrideExe(activeProfile?.overrideExe !== undefined);
  }, [activeProfile?.uuid, activeProfile?.overrideExe]);

  const handleCustomSavefileToggle = (enabled: boolean) => {
    persistSavefile.cancel();
    setUseCustomSavefile(enabled);
    if (!enabled) {
      updateActiveProfile({ savefile: undefined });
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

  const handleOverrideExeToggle = (enabled: boolean) => {
    setOverrideExe(enabled);
    if (!enabled) {
      updateActiveProfile({ overrideExe: undefined });
    }
  };

  const handleBrowseOverrideExe = async () => {
    const path = await window.electronAPI.browse('exe', 'Select Elden Ring Executable');
    if (!path) {
      sendLog({ level: 'warning', message: 'No path selected' });
      return;
    }
    updateActiveProfile({ overrideExe: path });
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
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" verticalSpacing="xs">
              {/* Left column: profile launch behavior */}
              <Stack gap="xs">
                <SettingSwitch
                  label="Custom Save File Name"
                  description="Override the default save file name (default: off)"
                  checked={useCustomSavefile}
                  onChange={handleCustomSavefileToggle}
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
                  />
                )}
                <SettingSwitch
                  label="Start Online"
                  description="Launch the game in online mode (default: off)"
                  checked={activeProfile?.startOnline ?? false}
                  onChange={(checked) => updateActiveProfile({ startOnline: checked })}
                />
                <SettingSwitch
                  label="Disable Arxan"
                  description="Neutralize Arxan/GuardIT code protection (default: off)"
                  checked={activeProfile?.disableArxan ?? false}
                  onChange={(checked) => updateActiveProfile({ disableArxan: checked })}
                />
                <SettingSwitch
                  label="Skip Memory Patch"
                  description="Do not increase memory limits — may affect game stability (default: off)"
                  checked={activeProfile?.noMemPatch ?? false}
                  onChange={(checked) => updateActiveProfile({ noMemPatch: checked })}
                />
                {window.electronAPI.platform === 'linux' && (
                  <SettingSwitch
                    label="Override Proton Verb"
                    description="Use 'proton run' rather than 'proton waitforexitandrun'. Use this when you need to run an app alongside the game (default: off)"
                    checked={activeProfile?.overrideProtonVerb ?? false}
                    onChange={(checked) => updateActiveProfile({ overrideProtonVerb: checked })}
                  />
                )}
              </Stack>

              {/* Right column: launcher settings */}
              <Stack gap="xs">
                <SettingSwitch
                  label="Disable Boot Boost"
                  description="Don't cache decrypted BHD files — increases startup time (default: off)"
                  checked={activeProfile?.noBootBoost ?? false}
                  onChange={(checked) => updateActiveProfile({ noBootBoost: checked })}
                />
                <SettingSwitch
                  label="Show Intro Logos"
                  description="Show game intro logos on launch (default: off)"
                  checked={activeProfile?.showLogos ?? false}
                  onChange={(checked) => updateActiveProfile({ showLogos: checked })}
                />
                <SettingSwitch
                  label="Skip Steam Init"
                  description="Skip initializing Steam within the launcher (default: off)"
                  checked={activeProfile?.skipSteamInit ?? false}
                  onChange={(checked) => updateActiveProfile({ skipSteamInit: checked })}
                />
                <SettingSwitch
                  label="Override Elden Ring Executable"
                  description="Use a different eldenring.exe then the normal one in the steam directory. Useful for downpatching"
                  checked={overrideExe}
                  onChange={handleOverrideExeToggle}
                />
                {overrideExe && (
                  <Group align={'flex-end'} justify={'space-between'} wrap="nowrap">
                    <TextInput
                      label="Override Elden Ring Executable Path"
                      placeholder="Select Elden Ring Executable"
                      style={OVERRIDE_EXE_TEXT_INPUT_STYLE}
                      value={activeProfile?.overrideExe ?? ''}
                      disabled
                    />
                    <Button
                      style={OVERRIDE_EXE_BUTTON_STYLE}
                      onClick={() => {
                        void handleBrowseOverrideExe();
                      }}
                    >
                      Browse
                    </Button>
                  </Group>
                )}
              </Stack>
            </SimpleGrid>
          </Stack>
        </Collapse>
      </Stack>
    </Stack>
  );
};

export default Mods;

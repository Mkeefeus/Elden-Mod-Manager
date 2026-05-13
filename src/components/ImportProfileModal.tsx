import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Box, Button, Divider, Group, ScrollArea, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconFileImport, IconPackageImport, IconQuestionMark } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { ImportModResult, ProfileImportAnalysis } from 'types';
import { useMods } from '../providers/ModsProvider';
import { sendLog } from '../utils/rendererLogger';

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: ImportModResult['status'] }) => {
  if (status === 'installed')
    return (
      <Badge color="teal" size="xs" leftSection={<IconCheck size={10} />}>
        Installed
      </Badge>
    );
  if (status === 'needs_install')
    return (
      <Badge color="yellow" size="xs" leftSection={<IconAlertCircle size={10} />}>
        Not Installed
      </Badge>
    );
  return (
    <Badge color="gray" size="xs" leftSection={<IconQuestionMark size={10} />}>
      No Nexus Info
    </Badge>
  );
};

const getImportSessionIndexes = (mods: ImportModResult[]): number[] => {
  return mods.flatMap((mod, index) => (mod.status === 'installed' ? [] : [index]));
};

const getImportQueueForIndexes = (mods: ImportModResult[], indexes: number[]): ImportModResult[] => {
  return indexes.map((index) => mods[index]).filter((mod): mod is ImportModResult => !!mod);
};

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

interface ImportProfileModalProps {
  onClose: () => void;
  onImported: (activeProfileId: string) => void;
}

const ImportProfileModal = ({ onClose, onImported }: ImportProfileModalProps) => {
  const queryClient = useQueryClient();
  const { mods: installedMods } = useMods();

  const [analysis, setAnalysis] = useState<ProfileImportAnalysis | null>(null);
  const [srcPath, setSrcPath] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [manualMatches, setManualMatches] = useState<Record<number, string>>({});
  const [importSessionIndexes, setImportSessionIndexes] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closingRef = useRef(false);

  const installedModOptions = installedMods.map((mod) => ({
    value: mod.uuid,
    label: mod.version ? `${mod.name} (${mod.version})` : mod.name,
  }));

  const handleClose = () => {
    closingRef.current = true;
    setImportSessionIndexes(null);
    window.electronAPI.updateImportQueue([]);
    onClose();
  };

  // ── Auto-reanalyze when mods change ──────────────────────────────────────

  useEffect(() => {
    const refresh = () => {
      if (!srcPath || closingRef.current) return;
      // Silent re-analysis — preserve manual matches and profile name
      window.electronAPI
        .analyzeProfileImport(srcPath)
        .then((result) => {
          if (closingRef.current) return;
          setAnalysis(result);
          if (importSessionIndexes?.length) {
            window.electronAPI.updateImportQueue(getImportQueueForIndexes(result.mods, importSessionIndexes));
          }
        })
        .catch(() => {
          // Silently ignore: the modal is open and the user will see stale state
        });
    };
    window.electronAPI.onModsChanged(refresh);
    return () => {
      window.electronAPI.offModsChanged(refresh);
    };
  }, [srcPath, importSessionIndexes]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const runAnalysis = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.analyzeProfileImport(path);
      setAnalysis(result);
      setSrcPath(path);
      setProfileName(result.profileName);
      setManualMatches({});
      if (importSessionIndexes?.length) {
        window.electronAPI.updateImportQueue(getImportQueueForIndexes(result.mods, importSessionIndexes));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowse = async () => {
    const path = await window.electronAPI.browse('profile', 'Import Profile');
    if (!path) return;
    await runAnalysis(path);
  };

  const handleReanalyze = async () => {
    if (!srcPath) return;
    await runAnalysis(srcPath);
  };

  const handleOpenInGetMods = () => {
    if (!analysis) return;

    const sessionIndexes = importSessionIndexes ?? getImportSessionIndexes(analysis.mods);
    const queue = getImportQueueForIndexes(analysis.mods, sessionIndexes);
    if (queue.length === 0) return;

    setImportSessionIndexes(sessionIndexes);
    window.electronAPI.openGetModsWithQueue(queue);
  };

  const handleComplete = async () => {
    if (!analysis) return;
    if (!profileName.trim()) {
      setError('Profile name cannot be empty.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const profile = await window.electronAPI.completeProfileImport(analysis, manualMatches, profileName.trim());
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      await queryClient.invalidateQueries({ queryKey: ['active-profile-id'] });
      sendLog({ level: 'info', message: `Profile "${profile.name}" imported successfully.` });
      onImported(profile.uuid);
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const installedCount = analysis?.mods.filter((m) => m.status === 'installed').length ?? 0;
  const needsInstallCount = analysis?.mods.filter((m) => m.status === 'needs_install').length ?? 0;
  const noInfoCount = analysis?.mods.filter((m) => m.status === 'no_nexus_info').length ?? 0;
  const missingCount = needsInstallCount + noInfoCount;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!analysis) {
    return (
      <Stack gap="md" align="center" py="xl">
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" w="100%">
            {error}
          </Alert>
        )}
        <Text c="dimmed" size="sm" ta="center">
          Select an exported profile file (.json) to begin.
        </Text>
        <Button leftSection={<IconFileImport size={16} />} onClick={() => void handleBrowse()} loading={loading}>
          Browse for Profile File
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      {/* Profile name */}
      <TextInput
        label="Profile Name"
        value={profileName}
        onChange={(e) => setProfileName(e.currentTarget.value)}
        required
      />

      {/* Summary */}
      <Group gap="xs">
        <Badge color="teal">{installedCount} installed</Badge>
        <Badge color="yellow">{needsInstallCount} not installed</Badge>
        <Badge color="gray">{noInfoCount} no Nexus info</Badge>
      </Group>

      {missingCount > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="sm">
              {missingCount} mod{missingCount !== 1 ? 's' : ''} still need attention. Open Get Mods to install them, or
              match them to an existing mod below, before completing the import.
            </Text>
            <Button
              size="xs"
              variant="filled"
              color="dark"
              leftSection={<IconPackageImport size={14} />}
              onClick={handleOpenInGetMods}
              style={{ flexShrink: 0 }}
            >
              Get Mods
            </Button>
          </Group>
        </Alert>
      )}

      {/* Mod list */}
      <ScrollArea.Autosize mah={340}>
        <Stack gap={6}>
          {analysis.mods.map((mod, index) => (
            <Box
              key={index}
              p="xs"
              style={{
                borderRadius: 'var(--mantine-radius-sm)',
                background: 'var(--mantine-color-dark-6)',
                border: '1px solid var(--mantine-color-dark-4)',
              }}
            >
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    size="sm"
                    fw={500}
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {mod.name}
                  </Text>
                  <StatusBadge status={mod.status} />
                </Stack>

                {(mod.status === 'needs_install' || mod.status === 'no_nexus_info') && (
                  <Select
                    size="xs"
                    placeholder={
                      mod.status === 'needs_install' ? 'Override with installed…' : 'Match to installed mod…'
                    }
                    data={installedModOptions}
                    value={manualMatches[index] ?? null}
                    onChange={(uuid) => {
                      setManualMatches((prev) => {
                        const next = { ...prev };
                        if (uuid) next[index] = uuid;
                        else delete next[index];
                        return next;
                      });
                    }}
                    searchable
                    clearable
                    style={{ width: 220, flexShrink: 0 }}
                  />
                )}
              </Group>
            </Box>
          ))}
        </Stack>
      </ScrollArea.Autosize>

      <Divider />

      <Group justify="space-between">
        <Button variant="subtle" onClick={() => void handleReanalyze()} loading={loading} disabled={!srcPath}>
          Re-analyze
        </Button>
        <Group gap="xs">
          <Button variant="default" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button leftSection={<IconFileImport size={14} />} onClick={() => void handleComplete()} loading={loading}>
            Complete Import
          </Button>
        </Group>
      </Group>
    </Stack>
  );
};

export default ImportProfileModal;

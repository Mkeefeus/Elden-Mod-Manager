import { Badge, Button, Collapse, Divider, Group, MultiSelect, Stack, Text } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import { Dependent, Mod } from 'types';
import { useMods } from '../providers/ModsProvider';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type ModLoadState = {
  uuid: string;
  loadBefore?: Dependent[];
  loadAfter?: Dependent[];
};

type LoadOrderMod = Mod & {
  enabled: boolean;
  loadBefore?: Dependent[];
  loadAfter?: Dependent[];
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const getModSortId = (mod: LoadOrderMod) => mod.uuid;

// ──────────────────────────────────────────────────────────────────────────────
// AdvancedDepsPanel — fine-grained load_before / load_after editor for one mod
// ──────────────────────────────────────────────────────────────────────────────

interface AdvancedDepsPanelProps {
  mod: LoadOrderMod;
  peers: LoadOrderMod[]; // same-type mods (already filtered)
  state: ModLoadState;
  onChange: (updated: Partial<ModLoadState>) => void;
}

const AdvancedDepsPanel = ({ mod, peers, state, onChange }: AdvancedDepsPanelProps) => {
  const options = peers.filter((p) => p.uuid !== mod.uuid).map((p) => ({ value: getModSortId(p), label: p.name }));

  const requiredBefore = (state.loadBefore ?? []).filter((d) => !d.optional).map((d) => d.id);
  const optionalBefore = (state.loadBefore ?? []).filter((d) => d.optional).map((d) => d.id);
  const requiredAfter = (state.loadAfter ?? []).filter((d) => !d.optional).map((d) => d.id);
  const optionalAfter = (state.loadAfter ?? []).filter((d) => d.optional).map((d) => d.id);

  const buildDeps = (required: string[], optional: string[]): Dependent[] => [
    ...required.map((id) => ({ id, optional: false })),
    ...optional.map((id) => ({ id, optional: true })),
  ];

  const setRequiredBefore = (ids: string[]) => onChange({ loadBefore: buildDeps(ids, optionalBefore) });
  const setOptionalBefore = (ids: string[]) => onChange({ loadBefore: buildDeps(requiredBefore, ids) });
  const setRequiredAfter = (ids: string[]) => onChange({ loadAfter: buildDeps(ids, optionalAfter) });
  const setOptionalAfter = (ids: string[]) => onChange({ loadAfter: buildDeps(requiredAfter, ids) });

  if (options.length === 0) {
    return (
      <Text size="xs" c="dimmed" mt={4}>
        No other {mod.dllFile ? 'DLL' : 'package'} mods to configure ordering against.
      </Text>
    );
  }

  return (
    <Stack gap="xs" mt="xs" pl="xs" style={{ borderLeft: '2px solid var(--mantine-color-default-border)' }}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        Load before
      </Text>
      <MultiSelect
        size="xs"
        label="Required"
        description="Fail if these mods are absent"
        data={options}
        value={requiredBefore}
        onChange={setRequiredBefore}
        searchable
        clearable
      />
      <MultiSelect
        size="xs"
        label="Optional"
        description="Skip ordering hint if these mods are absent"
        data={options}
        value={optionalBefore}
        onChange={setOptionalBefore}
        searchable
        clearable
      />
      <Divider />
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        Load after
      </Text>
      <MultiSelect
        size="xs"
        label="Required"
        description="Fail if these mods are absent"
        data={options}
        value={requiredAfter}
        onChange={setRequiredAfter}
        searchable
        clearable
      />
      <MultiSelect
        size="xs"
        label="Optional"
        description="Skip ordering hint if these mods are absent"
        data={options}
        value={optionalAfter}
        onChange={setOptionalAfter}
        searchable
        clearable
      />
    </Stack>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// ModOrderRow — one row per mod
// ──────────────────────────────────────────────────────────────────────────────

interface ModOrderRowProps {
  mod: LoadOrderMod;
  peers: LoadOrderMod[];
  state: ModLoadState;
  onChange: (updated: Partial<ModLoadState>) => void;
  startExpanded: boolean;
}

const ModOrderRow = ({ mod, peers, state, onChange, startExpanded }: ModOrderRowProps) => {
  const [advancedOpen, setAdvancedOpen] = useState(startExpanded);
  const depCount = (state.loadBefore?.length ?? 0) + (state.loadAfter?.length ?? 0);

  return (
    <Stack gap={4}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mod.name}
          </Text>
          {depCount > 0 && (
            <Badge size="xs" variant="light">
              {depCount} dep{depCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </Group>
        <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setAdvancedOpen((value) => !value)}>
          <FontAwesomeIcon icon={advancedOpen ? faChevronDown : faChevronRight} size="xs" />
        </Button>
      </Group>
      <Collapse expanded={advancedOpen}>
        <AdvancedDepsPanel mod={mod} peers={peers} state={state} onChange={onChange} />
      </Collapse>
    </Stack>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// ModGroupSection — DLL mods or Package mods section
// ──────────────────────────────────────────────────────────────────────────────

interface ModGroupSectionProps {
  title: string;
  mods: LoadOrderMod[];
  states: Map<string, ModLoadState>;
  onChange: (uuid: string, updated: Partial<ModLoadState>) => void;
  focusedModUuid?: string;
}

const ModGroupSection = ({ title, mods, states, onChange, focusedModUuid }: ModGroupSectionProps) => {
  if (mods.length === 0) return null;

  return (
    <Stack gap="xs">
      <Text size="sm" fw={600} c="dimmed" tt="uppercase">
        {title}
      </Text>
      {mods.map((mod) => (
        <ModOrderRow
          key={mod.uuid}
          mod={mod}
          peers={mods} // same-type peers only
          state={states.get(mod.uuid)!}
          onChange={(updated) => onChange(mod.uuid, updated)}
          startExpanded={mod.uuid === focusedModUuid}
        />
      ))}
    </Stack>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// LoadOrderModal — top-level
// ──────────────────────────────────────────────────────────────────────────────

interface LoadOrderModalProps {
  hideModal: () => void;
  /** If set, the row for this mod's advanced panel starts expanded */
  focusedModUuid?: string;
}

const LoadOrderModal = ({ hideModal, focusedModUuid }: LoadOrderModalProps) => {
  const { mods, saveMods } = useMods();
  const profileMods = mods as LoadOrderMod[];

  // Local draft state — map from uuid → load order fields
  const [states, setStates] = useState<Map<string, ModLoadState>>(() => {
    const map = new Map<string, ModLoadState>();
    for (const mod of profileMods) {
      map.set(mod.uuid, {
        uuid: mod.uuid,
        loadBefore: mod.loadBefore,
        loadAfter: mod.loadAfter,
      });
    }
    return map;
  });

  const updateState = (uuid: string, updated: Partial<ModLoadState>) => {
    setStates((prev) => {
      const next = new Map(prev);
      next.set(uuid, { ...next.get(uuid)!, ...updated });
      return next;
    });
  };

  const dllMods = profileMods.filter((mod) => !!mod.dllFile && mod.enabled);
  const packageMods = profileMods.filter((mod) => !mod.dllFile && mod.enabled);
  const enabledMods = [...dllMods, ...packageMods];

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const updated = profileMods.map((mod) => {
      const s = states.get(mod.uuid)!;
      return {
        ...mod,
        loadBefore: s.loadBefore?.length ? s.loadBefore : undefined,
        loadAfter: s.loadAfter?.length ? s.loadAfter : undefined,
      };
    });
    void saveMods(updated);
    hideModal();
  };

  if (profileMods.length === 0) {
    return (
      <Stack>
        <Text size="sm" c="dimmed">
          No mods installed. Add mods first.
        </Text>
        <Group justify="flex-end">
          <Button variant="outline" onClick={hideModal}>
            Close
          </Button>
        </Group>
      </Stack>
    );
  }

  if (enabledMods.length === 0) {
    return (
      <Stack>
        <Text size="sm" c="dimmed">
          No mods are enabled in the active profile. Enable at least one mod before editing load order.
        </Text>
        <Group justify="flex-end">
          <Button variant="outline" onClick={hideModal}>
            Close
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Use <FontAwesomeIcon icon={faChevronRight} /> for profile-specific ordering against specific mods. DLL mods and
        package mods are ordered independently.
      </Text>

      <ModGroupSection
        title="DLL mods"
        mods={dllMods}
        states={states}
        onChange={updateState}
        focusedModUuid={focusedModUuid}
      />

      {dllMods.length > 0 && packageMods.length > 0 && <Divider />}

      <ModGroupSection
        title="Package mods"
        mods={packageMods}
        states={states}
        onChange={updateState}
        focusedModUuid={focusedModUuid}
      />

      <Group justify="flex-end" mt="sm">
        <Button variant="outline" onClick={hideModal}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </Group>
    </Stack>
  );
};

export default LoadOrderModal;

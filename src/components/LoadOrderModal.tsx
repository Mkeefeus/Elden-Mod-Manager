import { ActionIcon, Badge, Button, Collapse, Divider, Group, MultiSelect, Stack, Text, Tooltip } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAnglesDown, faAnglesUp, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import { Dependent, Mod } from 'types';
import { useMods } from '../providers/ModsProvider';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type ModLoadState = Pick<Mod, 'uuid' | 'loadFirst' | 'loadLast' | 'loadBefore' | 'loadAfter'>;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** The ID me3 uses to reference this mod in load_before/load_after */
const getModSortId = (mod: Mod) => (mod.dllFile ? mod.dllFile : mod.uuid);

// ──────────────────────────────────────────────────────────────────────────────
// AdvancedDepsPanel — fine-grained load_before / load_after editor for one mod
// ──────────────────────────────────────────────────────────────────────────────

interface AdvancedDepsPanelProps {
  mod: Mod;
  peers: Mod[]; // same-type mods (already filtered)
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
  mod: Mod;
  peers: Mod[];
  state: ModLoadState;
  onChange: (updated: Partial<ModLoadState>) => void;
  onSetFirst: () => void; // caller handles exclusivity & confirmation
  onSetLast: () => void;
  startExpanded: boolean;
}

const ModOrderRow = ({ mod, peers, state, onChange, onSetFirst, onSetLast, startExpanded }: ModOrderRowProps) => {
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
        <Group gap={4} wrap="nowrap">
          <Tooltip label={state.loadFirst ? 'Remove Load First' : 'Load First'} withArrow>
            <ActionIcon
              size="sm"
              variant={state.loadFirst ? 'filled' : 'subtle'}
              color={state.loadFirst ? 'yellow' : 'gray'}
              onClick={onSetFirst}
              aria-label="Load first"
            >
              <FontAwesomeIcon icon={faAnglesUp} size="xs" />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={state.loadLast ? 'Remove Load Last' : 'Load Last'} withArrow>
            <ActionIcon
              size="sm"
              variant={state.loadLast ? 'filled' : 'subtle'}
              color={state.loadLast ? 'blue' : 'gray'}
              onClick={onSetLast}
              aria-label="Load last"
            >
              <FontAwesomeIcon icon={faAnglesDown} size="xs" />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={advancedOpen ? 'Hide advanced' : 'Advanced ordering'} withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-label="Advanced ordering"
            >
              <FontAwesomeIcon icon={advancedOpen ? faChevronDown : faChevronRight} size="xs" />
            </ActionIcon>
          </Tooltip>
        </Group>
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
  mods: Mod[];
  allMods: Mod[]; // full list for peer filtering
  states: Map<string, ModLoadState>;
  onChange: (uuid: string, updated: Partial<ModLoadState>) => void;
  onSetFirst: (uuid: string) => void;
  onSetLast: (uuid: string) => void;
  focusedModUuid?: string;
}

const ModGroupSection = ({
  title,
  mods,
  states,
  onChange,
  onSetFirst,
  onSetLast,
  focusedModUuid,
}: ModGroupSectionProps) => {
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
          onSetFirst={() => onSetFirst(mod.uuid)}
          onSetLast={() => onSetLast(mod.uuid)}
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

  // Local draft state — map from uuid → load order fields
  const [states, setStates] = useState<Map<string, ModLoadState>>(() => {
    const map = new Map<string, ModLoadState>();
    for (const mod of mods) {
      map.set(mod.uuid, {
        uuid: mod.uuid,
        loadFirst: mod.loadFirst,
        loadLast: mod.loadLast,
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

  const dllMods = mods.filter((m) => !!m.dllFile);
  const packageMods = mods.filter((m) => !m.dllFile);

  // ── Load First/Last helpers ─────────────────────────────────────────────────

  const applyExclusiveFlag = (uuid: string, flag: 'loadFirst' | 'loadLast', group: Mod[]) => {
    const current = states.get(uuid)!;
    const opposite = flag === 'loadFirst' ? 'loadLast' : 'loadFirst';
    // Toggle off if already set
    if (current[flag]) {
      updateState(uuid, { [flag]: false });
      return;
    }
    // Clear the flag from all other mods in the group, then enable on this one.
    // Also clear the opposite flag on this mod (can't be both first and last).
    setStates((prev) => {
      const next = new Map(prev);
      for (const mod of group) {
        if (mod.uuid !== uuid && next.get(mod.uuid)?.[flag]) {
          next.set(mod.uuid, { ...next.get(mod.uuid)!, [flag]: false });
        }
      }
      next.set(uuid, { ...next.get(uuid)!, [flag]: true, [opposite]: false });
      return next;
    });
  };

  const handleSetFirst = (uuid: string) => {
    const isDll = !!mods.find((m) => m.uuid === uuid)?.dllFile;
    applyExclusiveFlag(uuid, 'loadFirst', isDll ? dllMods : packageMods);
  };

  const handleSetLast = (uuid: string) => {
    const isDll = !!mods.find((m) => m.uuid === uuid)?.dllFile;
    applyExclusiveFlag(uuid, 'loadLast', isDll ? dllMods : packageMods);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const updated = mods.map((mod) => {
      const s = states.get(mod.uuid)!;
      return {
        ...mod,
        loadFirst: s.loadFirst || undefined,
        loadLast: s.loadLast || undefined,
        loadBefore: s.loadBefore?.length ? s.loadBefore : undefined,
        loadAfter: s.loadAfter?.length ? s.loadAfter : undefined,
      };
    });
    void saveMods(updated);
    hideModal();
  };

  if (mods.length === 0) {
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

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Use <FontAwesomeIcon icon={faAnglesUp} /> / <FontAwesomeIcon icon={faAnglesDown} /> to pin a mod to load first
        or last within its group. Use <FontAwesomeIcon icon={faChevronRight} /> for fine-grained ordering against
        specific mods. DLL mods and package mods are ordered independently.
      </Text>

      <ModGroupSection
        title="DLL mods"
        mods={dllMods}
        allMods={mods}
        states={states}
        onChange={updateState}
        onSetFirst={handleSetFirst}
        onSetLast={handleSetLast}
        focusedModUuid={focusedModUuid}
      />

      {dllMods.length > 0 && packageMods.length > 0 && <Divider />}

      <ModGroupSection
        title="Package mods"
        mods={packageMods}
        allMods={mods}
        states={states}
        onChange={updateState}
        onSetFirst={handleSetFirst}
        onSetLast={handleSetLast}
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

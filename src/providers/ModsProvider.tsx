import { ReactNode, createContext, useContext, useMemo, useState, useEffect } from 'react';
import { sendLog } from '../utils/rendererLogger';
import { Mod } from 'types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type ModWithEnabled = Mod & { enabled: boolean };

interface Sort {
  column: string;
  order: 'asc' | 'desc';
}

interface ModsCtxValue {
  mods: ModWithEnabled[];
  sort: Sort;
  saveMods: (mods: ModWithEnabled[]) => Promise<void>;
  loadMods: () => Promise<void>;
  changeSort: (column: string) => void;
}

const ModsContext = createContext<ModsCtxValue | null>(null);

const ModsProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<Sort>({ column: 'installDate', order: 'desc' });

  const getComparable = (value: Date | boolean | number | string | undefined): number | string => {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value || '';
  };

  const columnSorter = (
    a: ModWithEnabled,
    b: ModWithEnabled,
    column: keyof ModWithEnabled,
    order: 'asc' | 'desc'
  ): number => {
    const aValue = getComparable(a[column] as Date | boolean | number | string | undefined);
    const bValue = getComparable(b[column] as Date | boolean | number | string | undefined);

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  };

  const sortMods = (unsortedMods: ModWithEnabled[]) => {
    return [...unsortedMods].sort((a, b) => columnSorter(a, b, sort.column as keyof ModWithEnabled, sort.order));
  };

  const { data: rawMods = [] } = useQuery({
    queryKey: ['mods'],
    queryFn: async () => {
      const dbMods = await window.electronAPI.loadMods();
      if (!dbMods) {
        sendLog({ level: 'error', message: 'Failed to load mods' });
        return [] as Mod[];
      }
      return dbMods;
    },
  });

  const { data: activeProfile } = useQuery({
    queryKey: ['active-profile'],
    queryFn: () => window.electronAPI.getActiveProfile(),
  });

  const mods = useMemo(() => {
    const enabledModIds = new Set(activeProfile?.mods ?? []);
    const joined: ModWithEnabled[] = rawMods.map((m) => ({ ...m, enabled: enabledModIds.has(m.uuid) }));
    return sortMods(joined);
  }, [rawMods, activeProfile, sort]);

  const loadMods = async () => {
    await queryClient.invalidateQueries({ queryKey: ['mods'] });
    await queryClient.invalidateQueries({ queryKey: ['active-profile'] });
  };

  useEffect(() => {
    window.electronAPI.onModsChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['mods'] }).catch(console.error);
    });
  }, []);

  const saveMods = async (newMods: ModWithEnabled[]) => {
    const metaMods: Mod[] = newMods.map((mod) => {
      const { enabled, ...rest } = mod;
      void enabled;
      return rest;
    });
    const enabledModIds = newMods.filter((mod) => mod.enabled).map((mod) => mod.uuid);
    const success = await window.electronAPI.saveMods(metaMods);
    if (!success) {
      sendLog({ level: 'error', message: 'Failed to save mods' });
      return;
    }
    await window.electronAPI.saveProfileRefs(enabledModIds);
    await queryClient.invalidateQueries({ queryKey: ['mods'] });
    await queryClient.invalidateQueries({ queryKey: ['active-profile'] });
  };

  const changeSort = (column: string) => {
    if (sort.column === column) {
      setSort({ column, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ column, order: 'desc' });
    }
  };

  return <ModsContext.Provider value={{ mods, sort, saveMods, loadMods, changeSort }}>{children}</ModsContext.Provider>;
};

export default ModsProvider;

export const useMods = () => useContext<ModsCtxValue>(ModsContext as React.Context<ModsCtxValue>);

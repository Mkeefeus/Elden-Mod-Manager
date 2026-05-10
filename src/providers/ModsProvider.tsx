import { ReactNode, createContext, useContext, useMemo, useState, useEffect } from 'react';
import { sendLog } from '../utils/rendererLogger';
import { Mod, ProfileModRef } from 'types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type ModWithProfileState = Mod &
  Pick<ProfileModRef, 'loadBefore' | 'loadAfter'> & {
    enabled: boolean;
  };

interface Sort {
  column: string;
  order: 'asc' | 'desc';
}

interface ModsCtxValue {
  mods: ModWithProfileState[];
  sort: Sort;
  saveMods: (mods: ModWithProfileState[]) => Promise<void>;
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
    a: ModWithProfileState,
    b: ModWithProfileState,
    column: keyof ModWithProfileState,
    order: 'asc' | 'desc'
  ): number => {
    const aValue = getComparable(a[column] as Date | boolean | number | string | undefined);
    const bValue = getComparable(b[column] as Date | boolean | number | string | undefined);

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  };

  const sortMods = (unsortedMods: ModWithProfileState[]) => {
    return [...unsortedMods].sort((a, b) => columnSorter(a, b, sort.column as keyof ModWithProfileState, sort.order));
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
    const profileMods = new Map((activeProfile?.mods ?? []).map((profileMod) => [profileMod.modUuid, profileMod]));
    const joined: ModWithProfileState[] = rawMods.map((mod) => {
      const profileMod = profileMods.get(mod.uuid);
      return {
        ...mod,
        enabled: !!profileMod,
        loadBefore: profileMod?.loadBefore,
        loadAfter: profileMod?.loadAfter,
      };
    });
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

  const saveMods = async (newMods: ModWithProfileState[]) => {
    const metaMods: Mod[] = newMods.map((mod) => {
      const { enabled, loadBefore, loadAfter, ...rest } = mod;
      void enabled;
      void loadBefore;
      void loadAfter;
      return rest;
    });
    const profileMods: ProfileModRef[] = newMods
      .filter((mod) => mod.enabled)
      .map((mod) => ({
        modUuid: mod.uuid,
        loadBefore: mod.loadBefore?.length ? mod.loadBefore : undefined,
        loadAfter: mod.loadAfter?.length ? mod.loadAfter : undefined,
      }));
    const success = await window.electronAPI.saveMods(metaMods);
    if (!success) {
      sendLog({ level: 'error', message: 'Failed to save mods' });
      return;
    }
    await window.electronAPI.saveProfileMods(profileMods);
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

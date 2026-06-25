import { ReactNode, createContext, useContext, useMemo, useEffect } from 'react';
import { sendLog } from '../utils/rendererLogger';
import { Mod, ProfileModRef } from 'types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type ModWithProfileState = Mod &
  Pick<ProfileModRef, 'loadBefore' | 'loadAfter'> & {
    enabled: boolean;
  };

interface ModsCtxValue {
  mods: ModWithProfileState[];
  saveMods: (mods: ModWithProfileState[]) => Promise<void>;
  loadMods: () => Promise<void>;
}

const ModsContext = createContext<ModsCtxValue | null>(null);

const ModsProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

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
    staleTime: 30_000, // or Infinity if you rely solely on invalidation
  });

  const { data: activeProfile } = useQuery({
    queryKey: ['active-profile'],
    queryFn: () => window.electronAPI.getActiveProfile(),
    staleTime: Infinity, // already manually invalidated via loadMods/saveMods
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
    return joined;
  }, [rawMods, activeProfile]);

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

  return <ModsContext.Provider value={{ mods, saveMods, loadMods }}>{children}</ModsContext.Provider>;
};

export default ModsProvider;

export const useMods = () => useContext<ModsCtxValue>(ModsContext as React.Context<ModsCtxValue>);

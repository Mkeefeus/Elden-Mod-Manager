import { ReactNode, createContext, useContext, useMemo, useState, useEffect } from 'react';
import { sendLog } from '../utils/rendererLogger';
import { Mod } from 'types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Sort {
  column: string;
  order: 'asc' | 'desc';
}

interface ModsCtxValue {
  mods: Mod[];
  sort: Sort;
  saveMods: (mods: Mod[]) => Promise<void>;
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

  const columnSorter = (a: Mod, b: Mod, column: keyof Mod, order: 'asc' | 'desc'): number => {
    const aValue = getComparable(a[column] as Date | boolean | number | string | undefined);
    const bValue = getComparable(b[column] as Date | boolean | number | string | undefined);

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  };

  const sortMods = (unsortedMods: Mod[]) => {
    return [...unsortedMods].sort((a, b) => columnSorter(a, b, sort.column as keyof Mod, sort.order));
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

  const mods = useMemo(() => sortMods(rawMods), [rawMods, sort]);

  const loadMods = () => queryClient.invalidateQueries({ queryKey: ['mods'] });

  useEffect(() => {
    window.electronAPI.onModsChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['mods'] }).catch(console.error);
    });
  }, []);

  const saveMods = async (newMods: Mod[]) => {
    const success = await window.electronAPI.saveMods(newMods);
    if (!success) {
      sendLog({ level: 'error', message: 'Failed to save mods' });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['mods'] });
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

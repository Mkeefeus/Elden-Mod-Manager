import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { sendLog } from '../utils/rendererLogger';
import { errToString } from '../utils/utilities';
import { Mod } from 'types';

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
  const [mods, setMods] = useState<Mod[]>([]);
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

  const loadMods = async () => {
    try {
      const dbMods = await window.electronAPI.loadMods();
      if (!dbMods) {
        sendLog({
          level: 'error',
          message: 'Failed to load mods',
        });
        return;
      }
      setMods(sortMods(dbMods));
    } catch (error) {
      const message = `An error occured while loading mods: ${errToString(error)}`;
      sendLog({
        level: 'error',
        message: message,
        error,
      });
    }
  };

  useEffect(() => {
    void loadMods();
  }, []);

  useEffect(() => {
    setMods(sortMods(mods));
  }, [sort]);

  const saveMods = async (newMods: Mod[]) => {
    const sortedMods = sortMods(newMods);
    await Promise.resolve();
    const success = await window.electronAPI.saveMods(newMods);
    if (!success) {
      sendLog({
        level: 'error',
        message: 'Failed to save mods',
      });
      return;
    }
    setMods(sortedMods);
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

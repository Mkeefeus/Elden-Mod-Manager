import Store from 'electron-store';
import schema, { DBSchema } from './schema';

const store = new Store<DBSchema>({ schema });

// Initialize the store with the default values for dev perposes
// store.set('mods', schema.mods.default);

export default store;

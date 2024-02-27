import Store from 'electron-store';
import schema, { ModSchema } from './schema';

const store = new Store<ModSchema>({ schema });

export default store;

import Store from 'electron-store';
import schema, { DBSchema } from './schema';

const store = new Store<DBSchema>({ schema, watch: true });

export default store;

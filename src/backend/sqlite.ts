// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const sqlite3 = require('sqlite3').verbose();

export const connectToDB = () => {
  const db = new sqlite3.Database(
    './test.db',
    [sqlite3.OPEN_READWRITE, sqlite3.CREATE],
    (err: Error) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Connected to the test database.');
    }
    );
    
    db.run(
      'CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER NOT NULL)',
      (err: Error) => {
        if (err) {
        console.error(err.message);
      }
      console.log('Created table test.');
    }
  );
};

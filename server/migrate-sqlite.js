import { getDbPath, importJsonDataIfEmpty } from './db.js';

const result = importJsonDataIfEmpty();
console.log(JSON.stringify({ dbPath: getDbPath(), ...result }, null, 2));

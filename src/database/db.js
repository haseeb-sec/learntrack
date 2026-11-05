const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const databasePath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/learntrack.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const db = new Database(databasePath);

db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

console.log('Database connected and schema initialized.');

module.exports = db;

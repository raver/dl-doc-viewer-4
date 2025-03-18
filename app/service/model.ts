import Database from "better-sqlite3";
import path from 'path';
// import path from "path";

import { fileURLToPath } from "url";

// Convert import.meta.url to a file path
const filename = fileURLToPath(import.meta.url);
const theDirname = path.dirname(filename);

// Resolve the path to the database file
// const databasePath = path.resolve(theDirname, "../../db/main.db");
// Temparary fix for the path issue on Netlify
const dbDir = path.join(process.cwd(), "public")
const dbPath = path.join(dbDir, "documents.db")
// const databasePath = path.resolve(theDirname, "../../db/main.db");
console.log(`Database path: ${dbDir}`);

const database = new Database(dbPath, {
  verbose: console.log,
  fileMustExist: true,
  timeout: 10000,
});
database.pragma("journal_mode = WAL");

// Resolve the path to the simple.dll file
const simpleDllPath = path.resolve(
  theDirname,
  "../../plugin/libsimple-windows-x64/simple.dll"
);
database.loadExtension(simpleDllPath);
// Test simple_query
const row: any = database.prepare("select simple_query('pinyin') as query").get();
console.log(row.query);

// Set the jieba dict file path
const jiebaDictPath = path.resolve(
  theDirname,
  "../../plugin/libsimple-windows-x64/dict"
);
database.prepare("select jieba_dict(?)").run(jiebaDictPath);

// database
//   .prepare("select jieba_dict(?)")
//   .run("../db/libsimple-windows-x64/dict");

export default database;

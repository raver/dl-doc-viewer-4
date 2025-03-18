import Database from "better-sqlite3"
import fs from "fs/promises"
import { copyFileSync, mkdirSync, readFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url";

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  console.log("Running in production mode");
} else {
  console.log("Running in development mode");
}


const simpleDllPath = isProduction ? path.resolve(
  __dirname,
  "../plugin/libsimple-linux-ubuntu-latest/libsimple.so"
) : path.resolve(
  __dirname,
  "../plugin/libsimple-windows-x64/simple"
);

console.log(`simpleDllPath: ${simpleDllPath}`);

const jiebaDictPath = isProduction ? path.resolve(
  __dirname,
  "../plugin/libsimple-linux-ubuntu-latest/dict"
) : path.resolve(
  __dirname,
  "../plugin/libsimple-windows-x64/dict"
);

console.log(`jiebaDictPath: ${jiebaDictPath}`);

async function buildDatabase() {
  console.log("Starting database build process...")

  // Create database directory if it doesn't exist
  const dbDir = path.join(process.cwd(), "public")
  try {
    await fs.mkdir(dbDir, { recursive: true })
  } catch (err) {
    console.log("Database directory already exists or could not be created")
  }

  const dbPath = path.join(dbDir, "documents.db")
  console.log(`Creating database at: ${dbPath}`)

  // Remove existing database if it exists
  try {
    await fs.unlink(dbPath)
    console.log("Removed existing database")
  } catch (err) {
    console.log("No existing database found or could not be removed")
  }

  // Create new database
  const db = new Database(dbPath, {
    verbose: console.log,
    timeout: 10000,
  })
  console.log("Database created successfully")
  db.pragma("journal_mode = WAL")



  // Load simple dll and test simple_query
  db.loadExtension(simpleDllPath);
  const row: any = db.prepare("select simple_query('pinyin') as query").get();
  console.log(row.query);

  // Set the jieba dict file path
  db.prepare("select jieba_dict(?)").run(jiebaDictPath);


  // Create documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("Documents table created")

  // Create full-text search index
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      title, 
      content, 
      content=documents, 
      content_rowid = id,
      tokenize='simple'
    )
  `)

  // Create triggers to keep FTS index updated
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
      INSERT INTO documents_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
    END;
  `)

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
    END;
  `)

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
      INSERT INTO documents_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
    END;
  `)
  console.log("Full-text search index created")



  // Read markdown files from the md directory
  const mdDir = path.join(process.cwd(), "md")
  console.log(`Reading markdown files from: ${mdDir}`)

  try {
    const files = await fs.readdir(mdDir)
    const mdFiles = files.filter((file) => file.endsWith(".md"))
    console.log(`Found ${mdFiles.length} markdown files`)

    // Prepare insert statement
    const insertStmt = db.prepare("INSERT INTO documents (title, content) VALUES (?, ?)")

    // Begin transaction
    const transaction = db.transaction((files) => {
      for (const file of files) {
        const title = path.basename(file, ".md")
        const filePath = path.join(mdDir, file)
        const content = readFileSync(filePath, "utf-8")
        // const content = fs.readFileSync(path.join(mdDir, file), "utf-8")
        insertStmt.run(title, content)
      }
    })

    // Execute transaction
    transaction(mdFiles)
    console.log(`Inserted ${mdFiles.length} documents into the database`)
  } catch (err) {
    console.error("Error reading markdown files:", err)
  }

  // Close database
  db.close()
  console.log("Database build completed successfully")

  // Move the generated documents.db to the build/client folder
  const sourcePath = dbPath;
  const destinationPath = path.resolve(__dirname, '../build/client/documents.db');

  mkdirSync(path.dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);

  console.log('documents.db has been moved to build/client');
}

// Execute the function
buildDatabase().catch((err) => {
  console.error("Database build failed:", err)
  process.exit(1)
})


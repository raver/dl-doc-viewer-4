import Database from "better-sqlite3"
import fs from "fs/promises"
import { copyFileSync, mkdirSync, readFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url";

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const db = new Database(dbPath)
  console.log("Database created successfully")

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
      content='documents', 
      tokenize='porter'
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


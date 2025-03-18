import database from "./model";

export interface Document {
  id: number;
  title: string;
  content: string;
}

// const createDocument = database.prepare(`
//   INSERT INTO documents (document_id, title, content)
//   VALUES (?, ?, ?)
//   RETURNING document_id, title, content
// `);

// const getDocumentById = database.prepare(`
//   SELECT * FROM documents WHERE document_id = ?
// `);
// SELECT CAST(blob_column AS TEXT) FROM table_name;
// SELECT _id as id, title,  content FROM doc WHERE _id = ?

const getDocumentById = (id: string) => {
  console.log(`getDocumentById: ${id}`);
  return database
    .prepare(
      `
    SELECT _id as id, title,  content FROM doc WHERE _id = ?
  `
    )
    .get(id) as Document;
};

const getDocuments = () => {
  const p = database.prepare(
    `SELECT _id as id, title, content FROM doc ORDER BY _id ASC`
  );
  return p.all() as Document[];
};

const searchDocuments = async (qWord: string) => {
  // await new Promise(resolve => setTimeout(resolve, 3000))
  console.log(`searchDocuments: ${qWord}`);
  return database
    .prepare(
      `
    select rowid as id from doc_fts where doc_fts match jieba_query(?)
  `
    )
    .get(qWord) as string;
};

// select rowid as id, simple_highlight(doc_fts, 1, '[', ']')  from doc_fts where doc_fts match jieba_query('大师');
const getSearchHighlights = (qWord: string) => {
  return database
    .prepare(
      `
    select rowid as id, title, simple_highlight(documents_fts, 1, '<mark>', '</mark>') as content  from documents_fts where documents_fts match jieba_query(?)
  `
    )
    .all(qWord) as Document[];
};

const getSearchHighlightsForDoc = (qWord: string, id: string) => {
  return database
    .prepare(
      `
    select rowid as id, title, simple_highlight(doc_fts, 1, '<mark>', '</mark>') as content  from doc_fts where doc_fts match jieba_query(?)
      and id = ?
  `
    )
    .get(qWord, id) as Document;
};

// select rowid as id, simple_snippet(doc_fts, 1, '[', ']', '...', 10) from doc_fts where doc_fts match simple_query('山', '1');
const getSearchSnippets = async (qWord: string) => {
  // await new Promise(resolve => setTimeout(resolve, 3000))
  console.log(`getSearchSnippets: ${qWord}`);
  let rows = undefined;
  try {
    rows = database
      .prepare(
        `
    select rowid as id, title, simple_snippet(doc_fts, 1, '<mark>', '</mark>','...', 40) as content  from doc_fts where doc_fts match jieba_query(?)
  `
      )
      .all(qWord);
  } catch (error) {
    console.log(error);
  }
  // rows = database
  //   .prepare(
  //     `
  //   select rowid as id, title, simple_snippet(doc_fts, 1, '<mark>', '</mark>','...', 40) as content  from doc_fts where doc_fts match jieba_query(?)
  // `
  //   )
  //   .all(qWord);

  if (rows) {
    return rows as Document[];
  } else {
    return undefined;
  }

};

// const createUser = database.prepare(`
//   INSERT INTO users (user_id, username, password, created_at)
//   VALUES (?, ?, ?, ?)
//   RETURNING user_id, username, created_at
// `);

// const getUserByUsername = database.prepare(`
//   SELECT * FROM users WHERE username = ?
// `);

// const getUserById = database.prepare(`
//   SELECT * FROM users WHERE user_id = ?
// `);

// const createTodo = database.prepare(`
//   INSERT INTO todos (todo_id, todo_owner, title, created_at)
//   VALUES (?, ?, ?, ?)
//   RETURNING todo_id, title, checked, created_at
// `);

// const getTodosByUserId = database.prepare(`
//   SELECT * FROM todos WHERE todo_owner = ?
// `);

// const getTodoById = database.prepare(`
//   SELECT * FROM todos WHERE todo_id = ?
// `);

// const updateTodoCheckById = database.prepare(`
//   UPDATE todos SET checked = ?, checked_at = ? WHERE todo_owner = ? AND todo_id = ? 
//   RETURNING todo_id, title, checked_at, created_at
// `);

// const deleteTodo = database.prepare(`
//   DELETE from todos WHERE todo_id = ? AND todo_owner = ?  
// `);

export {
  // createDocument,
  getDocumentById,
  getDocuments,
  searchDocuments,
  getSearchHighlights,
  getSearchHighlightsForDoc,
  getSearchSnippets,
  // createUser,
  // getUserByUsername,
  // getUserById,
  // createTodo,
  // getTodosByUserId,
  // getTodoById,
  // updateTodoCheckById,
  // deleteTodo,
};

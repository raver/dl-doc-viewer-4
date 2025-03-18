import type { Route } from "./+types/document";
import Database from "better-sqlite3"
import path from "path"
import { getSearchHighlights } from '~/service/query';
import type { Document } from '~/service/query';


// type Document = {
//   id: number
//   title: string
//   content: string
// }

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}


export async function loader({ params }: Route.LoaderArgs) {
  // const searchParams = request.nextUrl.searchParams  
  const query = params.query || ""
  // const query = null

  // const dbPath = path.join(process.cwd(), "public", "documents.db")
  // const db = new Database(dbPath, { readonly: true })

  let documents: Document[] = []

  if (query) {
    // Search using FTS
    // documents = db
    //   .prepare(`
    //     SELECT rowid as id, title, snippet(documents_fts, 1, '<mark>', '</mark>', '...', 64) as content
    //     FROM documents_fts
    //     WHERE documents_fts MATCH jieba_query(?)
    //     ORDER BY rank
    //     LIMIT 20
    //   `)
    //   .all(query) as Document[]

    documents = getSearchHighlights(query)
  }
  //  else {
  //   // Get all documents
  //   documents = db
  //     .prepare(`
  //       SELECT id, title, substr(content, 1, 200) || '...' as content
  //       FROM documents
  //       ORDER BY title
  //       LIMIT 100
  //     `)
  //     .all() as Document[]
  // }

  // db.close()

  return { documents, query }
}

export default function Document({ loaderData }: Route.ComponentProps) {
  const { documents, query } = loaderData;
  return (<>
    <p>Searching {query}, results:</p>
    {documents.map((document) => (
      <div key={document.id} className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">{document.title}</h2>
        <p className="text-sm text-gray-500">{document.content}</p>
      </div>
    ))}
  </>);
}

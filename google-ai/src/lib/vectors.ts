import { sql } from "./db";
import { embed } from "./google";

// Vector store backed by pgvector on the Neon DB we already run. Embeddings come from Google's
// text-embedding-004 (768-dim). This is the "Google-powered vector DB" product, Vercel-native.

export async function upsertVector(installationId: string, namespace: string, id: string, content: string): Promise<void> {
  const v = await embed(content);
  const lit = `[${v.join(",")}]`;
  await sql`
    insert into vectors (installation_id, namespace, id, content, embedding)
    values (${installationId}, ${namespace}, ${id}, ${content}, ${lit}::vector)
    on conflict (installation_id, namespace, id)
    do update set content = excluded.content, embedding = excluded.embedding
  `;
}

export async function queryVectors(
  installationId: string,
  namespace: string,
  text: string,
  k: number,
): Promise<{ id: string; content: string; score: number }[]> {
  const v = await embed(text);
  const lit = `[${v.join(",")}]`;
  const rows = (await sql`
    select id, content, 1 - (embedding <=> ${lit}::vector) as score
    from vectors
    where installation_id = ${installationId} and namespace = ${namespace}
    order by embedding <=> ${lit}::vector
    limit ${k}
  `) as { id: string; content: string; score: number }[];
  return rows;
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, supabaseConfigured } from "./config.js";

/**
 * Conversation persistence backed by Supabase.
 *
 * When Supabase is not configured the agent still works — it simply runs
 * statelessly: every request starts a fresh conversation and nothing is
 * written. This keeps local development and smoke tests friction-free.
 *
 * Run `supabase/schema.sql` against your project to create the tables.
 */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })
  : null;

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
}

/** Returns an existing conversation id, or creates a new conversation. */
export async function ensureConversation(id?: string): Promise<string> {
  if (!supabase) return id ?? crypto.randomUUID();
  if (id) return id;
  const { data, error } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();
  if (error) {
    throw new Error(`Supabase: failed to create conversation: ${error.message}`);
  }
  return data.id as string;
}

/** Loads the prior turns of a conversation in chronological order. */
export async function loadHistory(conversationId: string): Promise<StoredMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Supabase: failed to load history: ${error.message}`);
  }
  return (data ?? []) as StoredMessage[];
}

/** Appends a single message to a conversation. */
export async function saveMessage(
  conversationId: string,
  msg: StoredMessage,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: msg.role,
    content: msg.content,
  });
  if (error) {
    throw new Error(`Supabase: failed to save message: ${error.message}`);
  }
}

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const FOLDERS = ['plans', 'items', 'loans'] as const;
const PAGE = 1000;

/**
 * Borra todas las fotos del grupo en Storage (`<group>/<plans|items|loans>/…`).
 * Hay que llamarla siendo aún admin del grupo: photos_delete lo exige. Devuelve false si algo falla.
 */
export async function removeGroupPhotos(supabase: SupabaseClient<Database>, groupId: string): Promise<boolean> {
  const bucket = supabase.storage.from('photos');
  const paths: string[] = [];
  for (const folder of FOLDERS) {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await bucket.list(`${groupId}/${folder}`, { limit: PAGE, offset });
      if (error) return false;
      for (const f of data ?? []) if (f.id) paths.push(`${groupId}/${folder}/${f.name}`);
      if (!data || data.length < PAGE) break;
    }
  }
  for (let i = 0; i < paths.length; i += PAGE) {
    const { error } = await bucket.remove(paths.slice(i, i + PAGE));
    if (error) return false;
  }
  return true;
}

import { supabase } from './supabase';

// O Supabase devolve no máximo 1000 linhas por requisição: paginamos.
export async function fetchAll(table, cols = '*') {
  const out = []; const step = 1000; let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(cols).order('created_at', { ascending: true }).order('id').range(from, from + step - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < step) break;
    from += step;
  }
  return out;
}

export async function uploadImage(file) {
  const { data: { user } } = await supabase.auth.getUser();
  const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error } = await supabase.storage.from('imagens').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('imagens').getPublicUrl(path).data.publicUrl;
}

export const plain = (t) => (t || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '[imagem]').replace(/[#*_`>$\\]/g, '').replace(/\s+/g, ' ').trim();

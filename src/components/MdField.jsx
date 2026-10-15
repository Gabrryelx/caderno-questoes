'use client';
import { useRef, useState } from 'react';
import Md from './Md';
import { uploadImage } from '@/lib/data';

// Campo Markdown/LaTeX com pré-visualização e upload de imagem
export default function MdField({ label, value, onChange, rows = 5 }) {
  const ref = useRef(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      const url = await uploadImage(f);
      const el = ref.current;
      const a = el?.selectionStart ?? value.length, b = el?.selectionEnd ?? a;
      onChange(value.slice(0, a) + `\n![imagem](${url})\n` + value.slice(b));
    } catch (err) { alert('Falha no upload: ' + err.message + '\n(Confira se o bucket "imagens" foi criado — veja o README.)'); }
    setBusy(false);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="label !mb-0">{label}</label>
        <div className="flex gap-2 text-xs">
          <button type="button" className="underline" onClick={() => setPreview((p) => !p)}>{preview ? 'Editar' : 'Pré-visualizar'}</button>
          <label className="cursor-pointer underline">{busy ? 'enviando…' : 'Inserir imagem'}<input type="file" accept="image/*" hidden onChange={onFile} /></label>
        </div>
      </div>
      {preview
        ? <div className="min-h-[5rem] rounded-lg border border-line bg-white p-3"><Md>{value}</Md></div>
        : <textarea ref={ref} className="input font-mono" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Markdown, $inline$, $$display$$ e ![alt](url)" />}
    </div>
  );
}

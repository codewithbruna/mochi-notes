import { Clock3, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Note, NoteRevision } from "../types";

interface Props {
  note: Note;
  onClose: () => void;
  onRestored: (note: Note) => void;
}

export function RevisionHistoryPanel({ note, onClose, onRestored }: Props) {
  const [revisions, setRevisions] = useState<NoteRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    window.mochi.getNoteRevisions(note.id).then(setRevisions).finally(() => setLoading(false));
  }, [note.id]);

  const restore = async (revision: NoteRevision) => {
    if (!confirm("Restaurar esta versão? A versão atual também será guardada no histórico.")) return;
    setRestoringId(revision.id);
    try {
      onRestored(await window.mochi.restoreNoteRevision(revision.id));
      onClose();
    } finally {
      setRestoringId(null);
    }
  };

  return <div className="modal-backdrop revision-backdrop" onMouseDown={onClose}>
    <section className="revision-panel" role="dialog" aria-modal="true" aria-labelledby="revision-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>VERSÕES</span><h2 id="revision-title">Histórico da nota</h2><p>{note.title || "Sem título"}</p></div><button className="icon-button ghost" onClick={onClose} aria-label="Fechar histórico"><X size={18} /></button></header>
      <div className="revision-list">
        {loading ? <p className="revision-empty">Carregando versões...</p> : revisions.length === 0 ? <p className="revision-empty">Esta nota ainda não possui versões anteriores.</p> : revisions.map((revision) => <article className="revision-item" key={revision.id}><div className="revision-item-meta"><Clock3 size={16} /><div><strong>{new Date(revision.createdAt).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</strong><p>{revision.title || "Sem título"}</p></div></div><p className="revision-preview">{revision.content.trim().replace(/\s+/g, " ") || "Nota sem conteúdo."}</p><button className="settings-secondary-button" disabled={restoringId === revision.id} onClick={() => restore(revision)}><RotateCcw size={15} /> {restoringId === revision.id ? "Restaurando..." : "Restaurar"}</button></article>)}
      </div>
    </section>
  </div>;
}

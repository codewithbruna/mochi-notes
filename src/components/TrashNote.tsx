import { FileText, RotateCcw, Trash2 } from "lucide-react";
import type { Note } from "../types";

interface Props {
  note: Note;
  onRestore: (id: string) => Promise<void>;
  onPermanentlyDelete: (id: string) => Promise<void>;
}

export function TrashNote({ note, onRestore, onPermanentlyDelete }: Props) {
  const restore = () => onRestore(note.id);
  const remove = async () => {
    if (!confirm("Apagar esta nota e seus anexos definitivamente? Esta ação não pode ser desfeita.")) return;
    await onPermanentlyDelete(note.id);
  };

  return <article className="trash-note">
    <span className="trash-note-icon"><FileText size={24} /></span>
    <p className="trash-note-label">LIXEIRA</p>
    <h2>{note.title || "Sem título"}</h2>
    <p className="trash-note-content">{note.content.trim() || "Esta nota não tinha conteúdo."}</p>
    <p className="trash-note-date">Movida para a Lixeira em {note.deletedAt ? new Date(note.deletedAt).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "data desconhecida"}.</p>
    <div className="trash-note-actions"><button className="settings-primary-button" onClick={restore}><RotateCcw size={16} /> Restaurar nota</button><button className="trash-delete-button" onClick={remove}><Trash2 size={16} /> Apagar definitivamente</button></div>
  </article>;
}

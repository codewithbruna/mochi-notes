import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import type { Category, Note, ViewMode } from "../types";
import { NoteCard } from "./NoteCard";

interface Props {
  notes: Note[];
  categories: Category[];
  selectedId: string | null;
  view: ViewMode;
  query: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreateNote: () => void;
  onOpenTrash: () => void;
  onLeaveTrash: () => void;
}

export function NoteList({ notes, categories, selectedId, view, query, loading, onSelect, onCreateNote, onOpenTrash, onLeaveTrash }: Props) {
  const isTrash = view === "trash";
  const isArchived = view === "archived";
  const emptyTitle = query ? "Nenhuma nota encontrada." : isTrash ? "A Lixeira está vazia." : isArchived ? "Nenhuma nota arquivada." : view === "favorites" ? "Ainda não há favoritos ♡" : "Seu cantinho está vazio ♡";

  return (
    <section className="notes-pane">
      <div className="pane-heading">
        <div>
          <p>{isTrash ? "RECUPERAÇÃO" : isArchived ? "ARQUIVO" : "NOTAS"}</p>
          <h1>{isTrash ? "Lixeira" : isArchived ? "Arquivadas" : view === "favorites" ? "Favoritos" : view === "tasks" ? "Tasks" : view === "quick" ? "Notas rápidas" : "Todas as notas"}</h1>
        </div>
        <div className="note-list-actions">
          {isTrash || isArchived ? <button className="icon-button ghost" onClick={onLeaveTrash} title="Voltar para notas" aria-label="Voltar para notas"><ArrowLeft size={18} /></button> : <><button className="icon-button ghost" onClick={onOpenTrash} title="Abrir Lixeira" aria-label="Abrir Lixeira"><Trash2 size={17} /></button><button className="icon-button" onClick={onCreateNote} title="Nova nota" aria-label="Nova nota"><Plus size={18} /></button></>}
        </div>
      </div>

      <div className="notes-scroll">
        {loading ? (
          <div className="soft-empty">Loading your notes...</div>
        ) : notes.length === 0 ? (
          <div className="soft-empty">
            <div>♡</div>
            <h2>{emptyTitle}</h2>
            {!query && !isTrash && (
              <button className="secondary-button" onClick={onCreateNote}>
                <Plus size={16} /> Criar primeira nota
              </button>
            )}
          </div>
        ) : (
          notes.map((note) => <NoteCard key={note.id} note={note} categories={categories} active={note.id === selectedId} onSelect={onSelect} />)
        )}
      </div>
    </section>
  );
}

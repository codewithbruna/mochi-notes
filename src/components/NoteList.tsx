import { Plus } from "lucide-react";
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
}

export function NoteList({ notes, categories, selectedId, view, query, loading, onSelect, onCreateNote }: Props) {
  const emptyTitle = query ? "No notes found..." : view === "favorites" ? "No favorites yet ♡" : "Your little space is empty ♡";

  return (
    <section className="notes-pane">
      <div className="pane-heading">
        <div>
          <p>Notes</p>
          <h1>{view === "favorites" ? "Favorites" : view === "tasks" ? "Tasks" : view === "quick" ? "Notas rápidas" : "All notes"}</h1>
        </div>
        <button className="icon-button" onClick={onCreateNote} title="New note">
          <Plus size={18} />
        </button>
      </div>

      <div className="notes-scroll">
        {loading ? (
          <div className="soft-empty">Loading your notes...</div>
        ) : notes.length === 0 ? (
          <div className="soft-empty">
            <div>♡</div>
            <h2>{emptyTitle}</h2>
            {!query && (
              <button className="secondary-button" onClick={onCreateNote}>
                <Plus size={16} /> Create your first note
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

import { Heart } from "lucide-react";
import type { Category, Note } from "../types";
import { checklistProgress, formatDate, getCategory, plainPreview } from "../utils";
import { CategoryBadge } from "./CategoryBadge";
import { ProgressBar } from "./ProgressBar";

interface Props {
  note: Note;
  categories: Category[];
  active: boolean;
  onSelect: (id: string) => void;
}

export function NoteCard({ note, categories, active, onSelect }: Props) {
  const category = getCategory(categories, note.categoryId);
  const progress = checklistProgress(note);

  return (
    <button className={`note-card ${active ? "active" : ""}`} onClick={() => onSelect(note.id)}>
      <div className="note-card-title">
        <span>{note.favorite ? "♥" : "♡"} {note.title || "Untitled note"}</span>
        {note.favorite && <Heart size={15} fill="currentColor" />}
      </div>
      <p>{plainPreview(note)}</p>
      {progress && <ProgressBar {...progress} />}
      <footer>
        <CategoryBadge category={category} />
        <time>{formatDate(note.updatedAt)}</time>
      </footer>
    </button>
  );
}

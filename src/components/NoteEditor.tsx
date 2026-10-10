import { Heart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Category, Note } from "../types";
import { checklistProgress, getCategory } from "../utils";
import { Attachments } from "./Attachments";
import { CategoryBadge } from "./CategoryBadge";
import { Checklist } from "./Checklist";
import { ProgressBar } from "./ProgressBar";
import { useDebouncedEffect } from "../hooks/useDebouncedEffect";

interface Props {
  note: Note;
  categories: Category[];
  onUpdate: (note: Note) => void;
  onRefresh: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function NoteEditor({ note, categories, onUpdate, onRefresh, onDelete }: Props) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [categoryId, setCategoryId] = useState(note.categoryId ?? "");
  const [saving, setSaving] = useState(false);
  const category = getCategory(categories, note.categoryId);
  const progress = useMemo(() => checklistProgress(note), [note]);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setCategoryId(note.categoryId ?? "");
  }, [note.id]);

  useDebouncedEffect(
    () => {
      const changed = title !== note.title || content !== note.content || (categoryId || null) !== note.categoryId;
      if (!changed) return;
      setSaving(true);
      window.mochi
        .updateNote({ id: note.id, title, content, categoryId: categoryId || null })
        .then(onUpdate)
        .finally(() => setSaving(false));
    },
    [title, content, categoryId, note.id],
    500
  );

  const toggleFavorite = async () => {
    const updated = await window.mochi.updateNote({ id: note.id, favorite: !note.favorite });
    onUpdate(updated);
  };

  return (
    <article className="note-editor">
      <div className="editor-toolbar">
        <div className="editor-meta">
          <CategoryBadge category={category} />
          <span>{saving ? "Saving..." : "Saved"}</span>
        </div>
        <div className="toolbar-actions">
          <button className={`icon-button ghost favorite ${note.favorite ? "active" : ""}`} onClick={toggleFavorite} title="Favorite">
            <Heart size={18} fill={note.favorite ? "currentColor" : "none"} />
          </button>
          <button className="icon-button ghost danger" onClick={() => onDelete(note.id)} title="Delete note">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <input className="title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled note" />

      <div className="category-select-row">
        <span>Category</span>
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">No category</option>
          {categories.map((categoryOption) => (
            <option value={categoryOption.id} key={categoryOption.id}>
              {categoryOption.name}
            </option>
          ))}
        </select>
      </div>

      <textarea className="content-input" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write something soft and useful..." />

      {progress && <ProgressBar {...progress} />}

      <Checklist note={note} onRefresh={onRefresh} />
      <Attachments note={note} onRefresh={onRefresh} />
    </article>
  );
}

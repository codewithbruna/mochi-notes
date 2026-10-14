import { Archive, ArchiveRestore, Heart, History, ListTodo, Plus, Tag as TagIcon, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Folder, Note, Tag } from "../types";
import { checklistProgress, getCategory } from "../utils";
import { Attachments } from "./Attachments";
import { CategoryBadge } from "./CategoryBadge";
import { Checklist } from "./Checklist";
import { ProgressBar } from "./ProgressBar";
import { useDebouncedEffect } from "../hooks/useDebouncedEffect";

interface Props {
  note: Note;
  categories: Category[];
  folders: Folder[];
  tags: Tag[];
  onUpdate: (note: Note) => void;
  onRefresh: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenHistory: (note: Note) => void;
  onTransformToTask: (note: Note) => Promise<void>;
  onArchive: (note: Note) => Promise<void>;
}

export function NoteEditor({ note, categories, folders, tags, onUpdate, onRefresh, onDelete, onOpenHistory, onTransformToTask, onArchive }: Props) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [categoryId, setCategoryId] = useState(note.categoryId ?? "");
  const [folderId, setFolderId] = useState(note.folderId ?? "");
  const [newTagName, setNewTagName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveSequenceRef = useRef(0);
  const category = getCategory(categories, note.categoryId);
  const progress = useMemo(() => checklistProgress(note), [note]);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setCategoryId(note.categoryId ?? "");
    setFolderId(note.folderId ?? "");
    setSaveError(null);
    window.setTimeout(() => titleInputRef.current?.focus(), 0);
  }, [note.id]);

  const saveNow = async () => {
    const changed = title !== note.title || content !== note.content || (categoryId || null) !== note.categoryId || (folderId || null) !== note.folderId;
    if (!changed) return;
    const sequence = ++saveSequenceRef.current;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await window.mochi.updateNote({ id: note.id, title, content, categoryId: categoryId || null, folderId: folderId || null });
      if (sequence === saveSequenceRef.current) onUpdate(updated);
    } catch {
      if (sequence === saveSequenceRef.current) setSaveError("Não foi possível salvar esta nota. Tente novamente.");
    } finally {
      if (sequence === saveSequenceRef.current) setSaving(false);
    }
  };

  useDebouncedEffect(
    () => {
      void saveNow();
    },
    [title, content, categoryId, folderId, note.id],
    500
  );

  const toggleFavorite = async () => {
    const updated = await window.mochi.updateNote({ id: note.id, favorite: !note.favorite });
    onUpdate(updated);
  };

  const setTagIds = async (tagIds: string[]) => {
    const updated = await window.mochi.updateNote({ id: note.id, tagIds });
    onUpdate(updated);
  };

  const addTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    const existing = tags.find((tag) => tag.name.localeCompare(name, "pt-BR", { sensitivity: "accent" }) === 0);
    const tag = existing ?? await window.mochi.createTag({ name, color: "#55cfa9" });
    if (!note.tags.some((item) => item.id === tag.id)) await setTagIds([...note.tags.map((item) => item.id), tag.id]);
    setNewTagName("");
  };

  return (
    <article className="note-editor">
      <div className="editor-toolbar">
        <div className="editor-meta">
          <CategoryBadge category={category} />
          <span>{saving ? "Salvando..." : saveError ? "Erro ao salvar" : "Salvo"}</span>
        </div>
        <div className="toolbar-actions">
          <button className="icon-button ghost" onClick={() => onOpenHistory(note)} title="Histórico de versões" aria-label="Histórico de versões">
            <History size={18} />
          </button>
          <button className="icon-button ghost" onClick={() => void onTransformToTask(note)} title="Transformar em tarefa" aria-label="Transformar em tarefa">
            <ListTodo size={18} />
          </button>
          <button className="icon-button ghost" onClick={() => void onArchive(note)} title={note.archivedAt ? "Restaurar nota" : "Arquivar nota"} aria-label={note.archivedAt ? "Restaurar nota" : "Arquivar nota"}>
            {note.archivedAt ? <ArchiveRestore size={18} /> : <Archive size={18} />}
          </button>
          <button className={`icon-button ghost favorite ${note.favorite ? "active" : ""}`} onClick={toggleFavorite} title={note.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-label={note.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
            <Heart size={18} fill={note.favorite ? "currentColor" : "none"} />
          </button>
          <button className="icon-button ghost danger" onClick={() => onDelete(note.id)} title="Mover para a Lixeira" aria-label="Mover para a Lixeira">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <input ref={titleInputRef} className="title-input" value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => void saveNow()} placeholder="Sem título" />

      <div className="category-select-row">
        <span>Categoria</span>
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Sem categoria</option>
          {categories.map((categoryOption) => (
            <option value={categoryOption.id} key={categoryOption.id}>
              {categoryOption.name}
            </option>
          ))}
        </select>
      </div>

      <div className="category-select-row">
        <span>Pasta</span>
        <select value={folderId} onChange={(event) => setFolderId(event.target.value)}>
          <option value="">Sem pasta</option>
          {folders.map((folder) => (
            <option value={folder.id} key={folder.id}>{folder.name}</option>
          ))}
        </select>
      </div>

      <section className="editor-tags" aria-label="Etiquetas">
        <div className="editor-section-title"><TagIcon size={14} /> Etiquetas</div>
        <div className="tag-list">{note.tags.map((tag) => <button key={tag.id} className="note-tag" onClick={() => void setTagIds(note.tags.filter((item) => item.id !== tag.id).map((item) => item.id))} title={`Remover etiqueta ${tag.name}`}><i style={{ background: tag.color }} />{tag.name}<X size={12} /></button>)}</div>
        <form className="tag-add-form" onSubmit={(event) => { event.preventDefault(); void addTag(); }}><input value={newTagName} onChange={(event) => setNewTagName(event.target.value)} placeholder="Adicionar etiqueta" /><button title="Criar etiqueta" aria-label="Criar etiqueta"><Plus size={15} /></button></form>
      </section>

      <textarea className="content-input" value={content} onChange={(event) => setContent(event.target.value)} onBlur={() => void saveNow()} placeholder="Comece a escrever..." />

      {progress && <ProgressBar {...progress} />}

      <Checklist note={note} onRefresh={onRefresh} />
      <Attachments note={note} onRefresh={onRefresh} />
    </article>
  );
}

import { Archive, ChevronDown, Clock3, Columns2, Folder, FolderPlus, Grid2X2, Heart, Library, List, NotebookPen, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Search, Tag as TagIcon, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AppSettings, Category, Folder as NoteFolder, Note, NotesViewMode, Tag } from "../types";
import { formatDate, getCategory, plainPreview } from "../utils";
import { NoteCard } from "./NoteCard";
import { NoteEditor } from "./NoteEditor";

type NavigatorFilter = "all" | "favorites" | "recent" | `folder:${string}` | `tag:${string}`;
type LibraryStyle = "grid" | "list";
export type NoteTemplate = "project" | "meeting" | "weekly" | "classNotes" | "journal" | "technical";

interface Props {
  notes: Note[];
  categories: Category[];
  folders: NoteFolder[];
  tags: Tag[];
  settings: AppSettings;
  selectedNote: Note | null;
  query: string;
  creatingNote: boolean;
  creationError: string | null;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onCreateNote: () => void;
  onCreateFromTemplate: (template: NoteTemplate) => Promise<void>;
  onOpenTrash: () => void;
  onOpenArchived: () => void;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onUpdateNote: (note: Note) => void;
  onRefresh: () => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onOpenHistory: (note: Note) => void;
  onTransformToTask: (note: Note) => Promise<void>;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onRenameFolder: (folder: NoteFolder, name: string) => Promise<void>;
  onDeleteFolder: (folder: NoteFolder) => Promise<void>;
  onArchive: (note: Note) => Promise<void>;
}

const modes: Array<{ id: NotesViewMode; label: string; icon: typeof Columns2 }> = [
  { id: "split", label: "Dividido", icon: Columns2 },
  { id: "library", label: "Biblioteca", icon: Library },
  { id: "focus", label: "Foco", icon: NotebookPen }
];

export function NotesWorkspace({ notes, categories, folders, tags, settings, selectedNote, query, creatingNote, creationError, onQueryChange, onSelect, onCreateNote, onCreateFromTemplate, onOpenTrash, onOpenArchived, onUpdateSettings, onUpdateNote, onRefresh, onDeleteNote, onOpenHistory, onTransformToTask, onCreateFolder, onRenameFolder, onDeleteFolder, onArchive }: Props) {
  const [navigatorFilter, setNavigatorFilter] = useState<NavigatorFilter>("all");
  const [libraryStyle, setLibraryStyle] = useState<LibraryStyle>("grid");
  const [sort, setSort] = useState<"updated" | "title">("updated");
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [compactLayout, setCompactLayout] = useState(false);
  const [compactPanel, setCompactPanel] = useState<"library" | "editor">("editor");
  const mode = settings.notesView ?? "split";
  const libraryVisible = !libraryCollapsed && (!compactLayout || compactPanel === "library");
  const editorVisible = !compactLayout || compactPanel === "editor";

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1080px)");
    const update = () => {
      setCompactLayout(media.matches);
      if (!media.matches) setCompactPanel("editor");
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const visibleNotes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = notes.filter((note) => {
      const matchesQuery = !normalized || note.title.toLocaleLowerCase("pt-BR").includes(normalized) || note.content.toLocaleLowerCase("pt-BR").includes(normalized);
      if (!matchesQuery) return false;
      if (navigatorFilter === "favorites") return note.favorite;
      if (navigatorFilter.startsWith("folder:")) return note.folderId === navigatorFilter.slice("folder:".length);
      if (navigatorFilter.startsWith("tag:")) return note.tags.some((tag) => tag.id === navigatorFilter.slice("tag:".length));
      return true;
    });
    return [...filtered].sort((left, right) => sort === "title" ? left.title.localeCompare(right.title, "pt-BR") : right.updatedAt.localeCompare(left.updatedAt));
  }, [navigatorFilter, notes, query, sort]);

  const switchMode = async (next: NotesViewMode) => {
    await onUpdateSettings({ notesView: next });
  };

  const openFromLibrary = async (id: string) => {
    onSelect(id);
    await switchMode("split");
  };

  const chooseTemplate = async (template: NoteTemplate) => { setTemplateGalleryOpen(false); await onCreateFromTemplate(template); };
  return <section className={`notes-workspace notes-mode-${mode}`}>
    <header className="notes-workspace-header">
      <div><span>MEU ESPAÇO</span><h1>Minhas notas</h1><p>Um lugar tranquilo para guardar o que importa.</p></div>
      <div className="notes-workspace-actions"><div className="notes-mode-switcher" role="tablist" aria-label="Visualização de notas">{modes.map(({ id, label, icon: Icon }) => <button key={id} className={mode === id ? "active" : ""} onClick={() => void switchMode(id)} role="tab" aria-selected={mode === id}><Icon size={15} /><span>{label}</span></button>)}</div><div className="notes-template-wrap"><button className="notes-new-button" onClick={() => void onCreateNote()} disabled={creatingNote}><Plus size={17} /> {creatingNote ? "Criando..." : "Nova nota"}</button><button className="notes-template-toggle" onClick={() => setTemplateGalleryOpen(true)} aria-label="Abrir galeria de templates"><ChevronDown size={15} /></button></div></div>
    </header>

    {mode === "split" && <section className={`notes-split-layout ${libraryVisible ? "library-visible" : "library-hidden"} ${compactLayout ? "compact-layout" : ""}`}>
      {libraryVisible && <div className="notes-navigator"><PremiumNotesNavigator notes={visibleNotes} folders={folders} tags={tags} selectedId={selectedNote?.id ?? null} active={navigatorFilter} query={query} sort={sort} creatingNote={creatingNote} onChange={setNavigatorFilter} onQueryChange={onQueryChange} onSortChange={setSort} onSelect={(id) => { onSelect(id); if (compactLayout) setCompactPanel("editor"); }} onCreate={onCreateNote} onOpenTemplates={() => setTemplateGalleryOpen(true)} onOpenTrash={onOpenTrash} onOpenArchived={onOpenArchived} onCreateFolder={onCreateFolder} onRenameFolder={onRenameFolder} onDeleteFolder={onDeleteFolder} onCollapse={() => compactLayout ? setCompactPanel("editor") : setLibraryCollapsed(true)} /></div>}
      {editorVisible && <section className="notes-editor-area">{(!libraryVisible || compactLayout) && <button className="notes-library-reopen" onClick={() => { setLibraryCollapsed(false); setCompactPanel("library"); }} title="Abrir biblioteca de notas" aria-label="Abrir biblioteca de notas"><PanelLeftOpen size={17} /></button>}{selectedNote ? <NoteEditor key={selectedNote.id} note={selectedNote} categories={categories} folders={folders} tags={tags} onUpdate={onUpdateNote} onRefresh={onRefresh} onDelete={onDeleteNote} onOpenHistory={onOpenHistory} onTransformToTask={onTransformToTask} onArchive={onArchive} /> : <NotesBlank onCreate={onCreateNote} onOpenTemplates={() => setTemplateGalleryOpen(true)} creating={creatingNote} error={creationError} />}</section>}
    </section>}

    {mode === "library" && <section className="notes-library-shell"><div className="notes-library-toolbar"><label><Search size={16} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Pesquisar notas" /></label><select value={sort} onChange={(event) => setSort(event.target.value as "updated" | "title")} aria-label="Ordenar notas"><option value="updated">Atualizadas recentemente</option><option value="title">Título, A-Z</option></select><div className="library-style-switcher"><button className={libraryStyle === "grid" ? "active" : ""} onClick={() => setLibraryStyle("grid")} title="Visualizar em grade" aria-label="Visualizar em grade"><Grid2X2 size={16} /></button><button className={libraryStyle === "list" ? "active" : ""} onClick={() => setLibraryStyle("list")} title="Visualizar em lista" aria-label="Visualizar em lista"><List size={17} /></button></div></div><div className={`notes-library-grid ${libraryStyle}`}>{visibleNotes.length ? visibleNotes.map((note) => <NoteCard key={note.id} note={note} categories={categories} active={note.id === selectedNote?.id} onSelect={(id) => void openFromLibrary(id)} />) : <NotesBlank onCreate={onCreateNote} onOpenTemplates={() => setTemplateGalleryOpen(true)} creating={creatingNote} error={creationError} query={query} />}</div></section>}

    {mode === "focus" && <section className="notes-focus-shell"><header><div><span>Modo foco</span><p>Menos distrações, mais espaço para suas ideias.</p></div><button className="icon-button ghost" onClick={() => void switchMode("split")} title="Voltar para o modo dividido" aria-label="Voltar para o modo dividido"><X size={18} /></button></header>{selectedNote ? <NoteEditor key={selectedNote.id} note={selectedNote} categories={categories} folders={folders} tags={tags} onUpdate={onUpdateNote} onRefresh={onRefresh} onDelete={onDeleteNote} onOpenHistory={onOpenHistory} onTransformToTask={onTransformToTask} onArchive={onArchive} /> : <NotesBlank onCreate={onCreateNote} onOpenTemplates={() => setTemplateGalleryOpen(true)} creating={creatingNote} error={creationError} />}</section>}
    {templateGalleryOpen && <TemplateGallery onClose={() => setTemplateGalleryOpen(false)} onUse={chooseTemplate} />}
  </section>;
}

function NotesNavigator({ notes, categories, folders, selectedId, active, onChange, onSelect, onCreate, onOpenTrash, onOpenArchived, onCreateFolder, onRenameFolder, onDeleteFolder }: { notes: Note[]; categories: Category[]; folders: NoteFolder[]; selectedId: string | null; active: NavigatorFilter; onChange: (value: NavigatorFilter) => void; onSelect: (id: string) => void; onCreate: () => void; onOpenTrash: () => void; onOpenArchived: () => void; onCreateFolder: (name: string, parentId: string | null) => Promise<void>; onRenameFolder: (folder: NoteFolder, name: string) => Promise<void>; onDeleteFolder: (folder: NoteFolder) => Promise<void> }) {
  const [newFolderName, setNewFolderName] = useState("");
  const [parentId, setParentId] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const createFolder = async () => { const name = newFolderName.trim(); if (!name) return; await onCreateFolder(name, parentId || null); setNewFolderName(""); setParentId(""); };
  const folderName = (folder: NoteFolder) => { const parent = folders.find((item) => item.id === folder.parentId); return parent ? `${parent.name} / ${folder.name}` : folder.name; };
  return <><header className="notes-navigator-header"><div><NotebookPen size={17} /><strong>Minhas notas</strong></div><button onClick={onCreate} title="Nova nota" aria-label="Nova nota"><Plus size={17} /></button></header><nav className="notes-navigator-filters"><button className={active === "all" ? "active" : ""} onClick={() => onChange("all")}><NotebookPen size={16} /> Todas as notas</button><button className={active === "favorites" ? "active" : ""} onClick={() => onChange("favorites")}><Heart size={16} /> Fixadas</button><button className={active === "recent" ? "active" : ""} onClick={() => onChange("recent")}><Clock3 size={16} /> Recentes</button></nav><div className="notes-navigator-section"><div className="notes-folder-heading"><span>PASTAS</span><FolderPlus size={14} /></div>{folders.map((folder) => <div className={`notes-folder-row ${folder.parentId ? "nested" : ""}`} key={folder.id}>{editingFolder === folder.id ? <form onSubmit={(event) => { event.preventDefault(); const name = editingName.trim(); if (name) void onRenameFolder(folder, name).then(() => setEditingFolder(null)); }}><input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} onBlur={() => setEditingFolder(null)} /></form> : <button className={active === `folder:${folder.id}` ? "active" : ""} onClick={() => onChange(`folder:${folder.id}`)}><i />{folderName(folder)}</button>}<div className="notes-folder-actions"><button onClick={() => { setEditingFolder(folder.id); setEditingName(folder.name); }} title="Renomear pasta" aria-label="Renomear pasta"><Pencil size={12} /></button><button onClick={() => { if (confirm(`Excluir a pasta “${folder.name}”? As notas serão preservadas.`)) void onDeleteFolder(folder); }} title="Excluir pasta" aria-label="Excluir pasta"><Trash2 size={12} /></button></div></div>)}<form className="new-folder-form" onSubmit={(event) => { event.preventDefault(); void createFolder(); }}><input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Nova pasta" /><select value={parentId} onChange={(event) => setParentId(event.target.value)} aria-label="Pasta pai"><option value="">Raiz</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folderName(folder)}</option>)}</select><button aria-label="Criar pasta" title="Criar pasta"><Plus size={14} /></button></form></div><div className="notes-navigator-list">{notes.map((note) => <button className={note.id === selectedId ? "active" : ""} key={note.id} onClick={() => onSelect(note.id)}><span>{note.title || "Sem título"}</span><small>{folders.find((folder) => folder.id === note.folderId)?.name ?? getCategory(categories, note.categoryId)?.name ?? "Sem pasta"}</small></button>)}</div><div className="notes-navigator-bottom"><button onClick={onOpenArchived}><Archive size={16} /> Arquivadas</button><button onClick={onOpenTrash}><Trash2 size={16} /> Lixeira</button></div></>;
}

function PremiumNotesNavigator({ notes, folders, tags, selectedId, active, query, sort, creatingNote, onChange, onQueryChange, onSortChange, onSelect, onCreate, onOpenTemplates, onOpenTrash, onOpenArchived, onCreateFolder, onRenameFolder, onDeleteFolder, onCollapse }: { notes: Note[]; folders: NoteFolder[]; tags: Tag[]; selectedId: string | null; active: NavigatorFilter; query: string; sort: "updated" | "title"; creatingNote: boolean; onChange: (value: NavigatorFilter) => void; onQueryChange: (value: string) => void; onSortChange: (value: "updated" | "title") => void; onSelect: (id: string) => void; onCreate: () => void; onOpenTemplates: () => void; onOpenTrash: () => void; onOpenArchived: () => void; onCreateFolder: (name: string, parentId: string | null) => Promise<void>; onRenameFolder: (folder: NoteFolder, name: string) => Promise<void>; onDeleteFolder: (folder: NoteFolder) => Promise<void>; onCollapse: () => void }) {
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const folderLabel = (folder: NoteFolder) => {
    const parent = folders.find((item) => item.id === folder.parentId);
    return parent ? `${parent.name} / ${folder.name}` : folder.name;
  };
  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    await onCreateFolder(name, parentId || null);
    setNewFolderName("");
    setParentId("");
  };

  return <>
    <header className="premium-library-header"><div><NotebookPen size={24} /><h1>Notas</h1></div><div className="premium-library-controls"><button className="icon-button ghost tiny" title="Recolher biblioteca" aria-label="Recolher biblioteca" onClick={onCollapse}><PanelLeftClose size={16} /></button></div></header>
    <div className="premium-create-wrap"><button className="premium-new-note" onClick={() => void onCreate()} disabled={creatingNote}><Plus size={17} /> {creatingNote ? "Criando..." : "Nova nota"}</button><button className="premium-template-toggle" onClick={onOpenTemplates} aria-label="Abrir galeria de templates"><ChevronDown size={15} /></button></div>
    <nav className="premium-note-filters" aria-label="Filtros de notas"><button className={active === "all" ? "active" : ""} onClick={() => onChange("all")}><NotebookPen size={16} /><span>Todas</span></button><button className={active === "favorites" ? "active" : ""} onClick={() => onChange("favorites")}><Heart size={16} /><span>Fixadas</span></button><button className={active === "recent" ? "active" : ""} onClick={() => onChange("recent")}><Clock3 size={16} /><span>Recentes</span></button><button onClick={onOpenArchived}><Archive size={16} /><span>Arquivo</span></button><button onClick={onOpenTrash}><Trash2 size={16} /><span>Lixeira</span></button></nav>
    <label className="premium-library-search"><Search size={16} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Pesquisar notas..." /><span>⌘</span></label>
    <section className="premium-library-section"><header><button onClick={() => setFoldersOpen((open) => !open)}><ChevronDown className={foldersOpen ? "open" : ""} size={15} /><Folder size={15} /> Pastas</button><span>{folders.length}</span></header>{foldersOpen && <div className="premium-folder-list">{folders.map((folder) => <div key={folder.id} className={`premium-folder-row ${folder.parentId ? "nested" : ""}`}>{editingId === folder.id ? <form onSubmit={(event) => { event.preventDefault(); const name = editingName.trim(); if (name) void onRenameFolder(folder, name).then(() => setEditingId(null)); }}><input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} onBlur={() => setEditingId(null)} /></form> : <button className={active === `folder:${folder.id}` ? "active" : ""} onClick={() => onChange(`folder:${folder.id}`)}><i />{folderLabel(folder)}</button>}<div><button onClick={() => { setEditingId(folder.id); setEditingName(folder.name); }} title="Renomear pasta" aria-label="Renomear pasta"><Pencil size={12} /></button><button onClick={() => { if (confirm(`Excluir a pasta “${folder.name}”? As notas serão preservadas.`)) void onDeleteFolder(folder); }} title="Excluir pasta" aria-label="Excluir pasta"><Trash2 size={12} /></button></div></div>)}<form className="premium-folder-create" onSubmit={(event) => { event.preventDefault(); void createFolder(); }}><input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Nova pasta" /><select value={parentId} onChange={(event) => setParentId(event.target.value)} aria-label="Pasta pai"><option value="">Raiz</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folderLabel(folder)}</option>)}</select><button title="Criar pasta" aria-label="Criar pasta"><Plus size={14} /></button></form></div>}</section>
    <section className="premium-library-section"><header><button onClick={() => setTagsOpen((open) => !open)}><ChevronDown className={tagsOpen ? "open" : ""} size={15} /><TagIcon size={15} /> Etiquetas</button><span>{tags.length}</span></header>{tagsOpen && <div className="premium-tag-cloud">{tags.length ? tags.map((tag) => <button className={active === `tag:${tag.id}` ? "active" : ""} key={tag.id} onClick={() => onChange(`tag:${tag.id}`)}><i style={{ background: tag.color }} />{tag.name}</button>) : <small>Crie etiquetas dentro de uma nota.</small>}</div>}</section>
    <div className="premium-note-list-heading"><strong>Notas</strong><select value={sort} onChange={(event) => onSortChange(event.target.value as "updated" | "title")} aria-label="Ordenar notas"><option value="updated">Última edição</option><option value="title">Título</option></select></div>
    <div className="premium-note-list">{notes.length ? notes.map((note) => <button key={note.id} className={note.id === selectedId ? "active" : ""} onClick={() => onSelect(note.id)}><span className="premium-note-icon">{note.favorite ? <Heart size={15} fill="currentColor" /> : <NotebookPen size={15} />}</span><div><strong>{note.title || "Sem título"}</strong><p>{plainPreview(note)}</p></div><time>{formatDate(note.updatedAt)}</time></button>) : <p className="premium-note-empty">Nenhuma nota por aqui.</p>}</div>
  </>;
}

function NotesBlank({ onCreate, onOpenTemplates, creating = false, error, query }: { onCreate: () => void; onOpenTemplates?: () => void; creating?: boolean; error?: string | null; query?: string }) {
  return <div className="notes-blank"><NotebookPen size={28} /><h2>{query ? "Nenhuma nota encontrada." : "Seu espaço para criar começa aqui."}</h2><p>{query ? "Tente outra pesquisa ou remova os filtros." : "Selecione uma nota ou crie uma nova para começar a escrever."}</p>{error && <p className="notes-blank-error">{error}</p>}{!query && <div className="notes-blank-actions"><button className="notes-new-button" onClick={() => void onCreate()} disabled={creating}><Plus size={17} /> {creating ? "Criando..." : "Nova nota"}</button>{onOpenTemplates && <button className="notes-secondary-button" onClick={onOpenTemplates}>Explorar templates</button>}</div>}</div>;
}

const templateCatalog: Array<{ id: NoteTemplate; name: string; category: string; description: string; preview: string }> = [
  { id: "project", name: "Página de projeto", category: "Planejamento", description: "Objetivo, etapas e referências em um só lugar.", preview: "Visão do projeto\nObjetivo\nPróximos passos" },
  { id: "meeting", name: "Registro de reunião", category: "Trabalho", description: "Decisões e pendências organizadas com clareza.", preview: "Participantes\nDecisões\nPróximos passos" },
  { id: "weekly", name: "Planejamento semanal", category: "Organização", description: "Prioridades gentis para acompanhar sua semana.", preview: "Meu foco\nPrioridades\nPequenos passos" },
  { id: "classNotes", name: "Anotações de aula", category: "Estudos", description: "Guarde conceitos, dúvidas e próximos estudos.", preview: "Tema da aula\nIdeias principais\nPerguntas" },
  { id: "journal", name: "Diário pessoal", category: "Pessoal", description: "Um espaço leve para registrar o seu dia.", preview: "Como estou hoje?\nO que quero guardar?\nCelebrar" },
  { id: "technical", name: "Documentação técnica", category: "Referência", description: "Contexto, decisões e referências para consultar depois.", preview: "Contexto\nComo funciona\nReferências" }
];

function TemplateGallery({ onClose, onUse }: { onClose: () => void; onUse: (template: NoteTemplate) => Promise<void> }) {
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate>("project");
  const [creating, setCreating] = useState(false);
  const selected = templateCatalog.find((template) => template.id === selectedTemplate) ?? templateCatalog[0];
  const create = async () => {
    if (creating) return;
    setCreating(true);
    await onUse(selectedTemplate);
    setCreating(false);
  };
  return <div className="template-gallery-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="template-gallery" role="dialog" aria-modal="true" aria-labelledby="template-gallery-title"><header><div><span>COMEÇAR COM UM MODELO</span><h2 id="template-gallery-title">Galeria de templates</h2><p>Escolha uma estrutura e confira a prévia antes de criar a nota.</p></div><button className="icon-button ghost" onClick={onClose} aria-label="Fechar galeria"><X size={18} /></button></header><div className="template-gallery-content"><div className="template-gallery-list">{templateCatalog.map((template) => <button key={template.id} className={template.id === selectedTemplate ? "active" : ""} onClick={() => setSelectedTemplate(template.id)}><strong>{template.name}</strong><span>{template.category}</span><small>{template.description}</small></button>)}</div><aside className="template-preview"><span>{selected.category}</span><h3>{selected.name}</h3><p>{selected.description}</p><pre>{selected.preview}</pre><button className="notes-new-button" onClick={() => void create()} disabled={creating}>{creating ? "Criando..." : "Usar template"}</button></aside></div></section></div>;
}

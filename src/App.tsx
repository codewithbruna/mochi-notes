import { useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, ChevronDown, Heart, ListTodo, LogOut, Menu, Moon, Plus, Search, Settings, Sun, Trash2, UserRound } from "lucide-react";
import { AuthScreen } from "./components/AuthScreen";
import { InsightsDashboard } from "./components/InsightsDashboard";
import { SpreadsheetsPage } from "./components/SpreadsheetsPage";
import { Sidebar } from "./components/Sidebar";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { SettingsPage } from "./components/SettingsPage";
import { RevisionHistoryPanel } from "./components/RevisionHistoryPanel";
import { TrashNote } from "./components/TrashNote";
import { TasksPage, type TaskDraft, type TaskRecord } from "./components/TasksPage";
import { NotesWorkspace, type NoteTemplate } from "./components/NotesWorkspace";
import type { AppData, AppSettings, AuthStatus, Category, Folder, Note, ViewMode } from "./types";
import { applyThemeTokens, resolveTheme } from "./theme";
import appIcon from "./assets/app-icon-256.png";

const emptyData: AppData = {
  notes: [],
  trash: [],
  archived: [],
  categories: [],
  folders: [],
  tags: [],
  spreadsheets: [],
  settings: { theme: "light", palette: "aurora", accent: "pink", notesView: "split", sidebarCollapsed: false, showMascot: true }
};

export function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("insights");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [historyNote, setHistoryNote] = useState<Note | null>(null);
  const [creatingNote, setCreatingNote] = useState(false);
  const [noteCreationError, setNoteCreationError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const creatingNoteRef = useRef(false);

  const currentNotes = view === "trash" ? data.trash : view === "archived" ? data.archived : data.notes;
  const selectedNote = useMemo(() => currentNotes.find((note) => note.id === selectedId) ?? currentNotes[0] ?? null, [currentNotes, selectedId]);

  useEffect(() => {
    window.mochi.getAuthStatus().then((status) => {
      setAuth(status);
      if (!status.authenticated) {
        setLoading(false);
        return;
      }
      window.mochi.getAppData().then((appData) => {
        setData(appData);
        setSelectedId(appData.notes[0]?.id ?? null);
        setLoading(false);
      });
    });
  }, []);

  useEffect(() => {
    const closeAccountMenu = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", closeAccountMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeAccountMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyThemeTokens(document.documentElement, data.settings, media.matches);
    apply();
    if (data.settings.theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [data.settings]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const refreshData = async (selectId?: string | null) => {
    const appData = await window.mochi.getAppData();
    setData(appData);
    if (selectId !== undefined) {
      setSelectedId(selectId);
      return;
    }
    const collection = view === "trash" ? appData.trash : view === "archived" ? appData.archived : appData.notes;
    if (selectedId && collection.some((note) => note.id === selectedId)) return;
    setSelectedId(collection[0]?.id ?? null);
  };

  const createNote = async (template?: NoteTemplate) => {
    if (creatingNoteRef.current) return;
    creatingNoteRef.current = true;
    setCreatingNote(true);
    setNoteCreationError(null);
    const templates: Record<NoteTemplate, { title: string; content: string }> = {
      project: { title: "Novo projeto", content: "Visão do projeto\n\nObjetivo\n\nPróximos passos\n\nNotas e referências" },
      meeting: { title: "Registro de reunião", content: "Participantes\n\nPontos principais\n\nDecisões\n\nPróximos passos" },
      weekly: { title: "Planejamento semanal", content: "Meu foco da semana\n\nPrioridades\n\nPequenos passos\n\nO que quero celebrar" },
      classNotes: { title: "Anotações de aula", content: "Tema da aula\n\nIdeias principais\n\nPerguntas\n\nPróximos estudos" },
      journal: { title: "Diário pessoal", content: "Como estou me sentindo hoje?\n\nO que quero guardar deste dia?\n\nUma pequena coisa para celebrar" },
      technical: { title: "Documentação técnica", content: "Contexto\n\nComo funciona\n\nDecisões\n\nReferências" }
    };
    try {
      setView("notes");
      if (data.settings.notesView !== "split") await updateSettings({ notesView: "split" });
      let note = await window.mochi.createNote();
      if (template) {
        const draft = templates[template];
        note = await window.mochi.updateNote({ id: note.id, title: draft.title, content: draft.content });
      }
      setData((current) => ({ ...current, notes: [note, ...current.notes.filter((item) => item.id !== note.id)] }));
      setSelectedId(note.id);
      const appData = await window.mochi.getAppData();
      setData(appData);
      setSelectedId(note.id);
    } catch (error) {
      setNoteCreationError(error instanceof Error ? error.message : "Não foi possível criar a nota. Tente novamente.");
    } finally {
      creatingNoteRef.current = false;
      setCreatingNote(false);
    }
  };

  const createNoteFromTemplate = async (template: NoteTemplate) => createNote(template);

  const createTask = async () => {
    const note = await window.mochi.createNote();
    await window.mochi.createChecklistItem({ noteId: note.id, text: "Nova tarefa" });
    setView("tasks");
    await refreshData(note.id);
  };

  const createTaskFromPage = async (draft: TaskDraft) => {
    const note = await window.mochi.createNote();
    await window.mochi.updateNote({ id: note.id, title: draft.text.trim(), content: draft.description.trim() });
    const task = await window.mochi.createChecklistItem({ noteId: note.id, text: draft.text.trim(), description: draft.description, priority: draft.priority, dueAt: draft.dueAt || null });
    if (draft.completed) await window.mochi.updateChecklistItem({ id: task.id, completed: true });
    await refreshData(note.id);
  };

  const updateTaskFromPage = async (task: TaskRecord, draft: TaskDraft) => {
    await window.mochi.updateChecklistItem({ id: task.item.id, text: draft.text.trim(), description: draft.description, priority: draft.priority, dueAt: draft.dueAt || null, completed: draft.completed });
    if (task.note.checklist.length === 1 && task.note.title === task.item.text) {
      await window.mochi.updateNote({ id: task.note.id, title: draft.text.trim(), content: draft.description.trim() });
    }
    await refreshData(task.note.id);
  };

  const toggleTaskFromPage = async (task: TaskRecord) => {
    await window.mochi.updateChecklistItem({ id: task.item.id, completed: !task.item.completed });
    await refreshData(task.note.id);
  };

  const duplicateTaskFromPage = async (task: TaskRecord) => {
    await window.mochi.createChecklistItem({ noteId: task.note.id, text: `${task.item.text} (cópia)`, description: task.item.description, priority: task.item.priority, dueAt: task.item.dueAt });
    await refreshData(task.note.id);
  };

  const deleteTaskFromPage = async (task: TaskRecord) => {
    await window.mochi.deleteChecklistItem(task.item.id);
    await refreshData(task.note.id);
  };

  const transformNoteToTask = async (note: Note) => {
    const title = note.title.trim() || "Tarefa da nota";
    if (!confirm(`Transformar “${title}” em uma tarefa? A nota continuará preservada e a tarefa ficará vinculada a ela.`)) return;
    await window.mochi.createChecklistItem({ noteId: note.id, text: title, description: note.content.trim(), priority: "medium" });
    await refreshData(note.id);
  };

  const createFolderFromNotes = async (name: string, parentId: string | null) => {
    await window.mochi.createFolder({ name, parentId });
    await refreshData();
  };

  const renameFolderFromNotes = async (folder: Folder, name: string) => {
    await window.mochi.updateFolder({ id: folder.id, name, parentId: folder.parentId });
    await refreshData();
  };

  const deleteFolderFromNotes = async (folder: Folder) => {
    await window.mochi.deleteFolder(folder.id);
    await refreshData();
  };

  const toggleArchiveNote = async (note: Note) => {
    const action = note.archivedAt ? "restaurar" : "arquivar";
    if (!confirm(`${action.charAt(0).toUpperCase()}${action.slice(1)} “${note.title || "Sem título"}”?`)) return;
    if (note.archivedAt) await window.mochi.restoreArchivedNote(note.id);
    else await window.mochi.archiveNote(note.id);
    await refreshData(null);
  };

  const createSpreadsheet = async (name: string) => {
    const spreadsheet = await window.mochi.createSpreadsheet(name);
    await refreshData();
    await window.mochi.openSpreadsheet(spreadsheet.id);
  };

  const importSpreadsheet = async () => {
    const spreadsheet = await window.mochi.importSpreadsheet();
    if (spreadsheet) await refreshData();
  };

  const updateNoteLocally = (updated: Note) => {
    setData((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === updated.id ? updated : note)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }));
  };

  const updateSettings = async (settings: Partial<AppSettings>) => {
    const next = await window.mochi.updateSettings(settings);
    setData((current) => ({ ...current, settings: next }));
  };

  const onAuthenticated = async (status: AuthStatus) => {
    setAuth(status);
    const appData = await window.mochi.getAppData();
    setData(appData);
    setSelectedId(appData.notes[0]?.id ?? null);
  };

  const signOut = async () => {
    setAuth(await window.mochi.signOut());
    setSelectedId(null);
    setQuery("");
  };

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = view === "trash" ? data.trash : view === "archived" ? data.archived : data.notes;
    return source.filter((note) => {
      const matchesSearch = !normalized || note.title.toLowerCase().includes(normalized) || note.content.toLowerCase().includes(normalized);
      const matchesView =
        view === "favorites"
          ? note.favorite
          : view === "tasks"
            ? note.checklist.length > 0
            : view === "quick"
              ? note.quick
            : view === "category"
              ? note.categoryId === activeCategoryId
              : true;
      return matchesSearch && matchesView;
    });
  }, [activeCategoryId, data.notes, data.trash, query, view]);

  const pickView = (nextView: ViewMode, categoryId: string | null = null) => {
    setView(nextView);
    setActiveCategoryId(categoryId);
    if (nextView === "insights" || nextView === "spreadsheets" || nextView === "settings" || nextView === "tasks") return;
    const source = nextView === "trash" ? data.trash : nextView === "archived" ? data.archived : data.notes;
    const nextSelected = source.find((note) =>
      nextView === "quick" ? note.quick : nextView === "favorites" ? note.favorite : nextView === "category" ? note.categoryId === categoryId : true
    );
    setSelectedId(nextSelected?.id ?? null);
  };

  const deleteSelectedNote = async (id: string) => {
    if (!confirm("Mover esta nota para a Lixeira? Você poderá restaurá-la depois.")) return;
    await window.mochi.deleteNote(id);
    await refreshData(null);
  };

  const restoreTrashedNote = async (id: string) => {
    const note = await window.mochi.restoreNote(id);
    setView("notes");
    await refreshData(note.id);
  };

  const permanentlyDeleteTrashedNote = async (id: string) => {
    await window.mochi.permanentlyDeleteNote(id);
    await refreshData(null);
  };

  if (!auth || loading) return <main className="app-loading" />;
  if (!auth.authenticated) return <AuthScreen onAuthenticated={onAuthenticated} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-compact">
          <img className="brand-mark" src={appIcon} alt="" />
          <span>Mochi Notes</span>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar no Mochi..." />
          <kbd>Ctrl + K</kbd>
        </label>
        <div className="topbar-actions">
          <button className="icon-button ghost" onClick={() => updateSettings({ theme: resolveTheme(data.settings.theme) === "light" ? "dark" : "light" })} title="Alternar tema" aria-label="Alternar tema">
            {resolveTheme(data.settings.theme) === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <div className="account-menu" ref={accountMenuRef}>
            <button className="topbar-profile" onClick={() => setAccountMenuOpen((open) => !open)} aria-label="Abrir menu da conta" aria-expanded={accountMenuOpen} aria-haspopup="menu">
              {auth.user?.avatarData ? <img src={auth.user.avatarData} alt="Foto de perfil" /> : <span>{auth.user?.name.slice(0, 2).toUpperCase()}</span>}
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            {accountMenuOpen && <div className="account-dropdown" role="menu">
              <div className="account-dropdown-user"><span>{auth.user?.name || "Minha conta"}</span><small>{auth.user?.email}</small></div>
              <button role="menuitem" onClick={() => { pickView("settings"); setAccountMenuOpen(false); }}><UserRound size={16} /> Minha conta</button>
              <button role="menuitem" onClick={() => { pickView("settings"); setAccountMenuOpen(false); }}><Settings size={16} /> Ajustes</button>
              <div className="account-dropdown-divider" />
              <button className="account-signout" role="menuitem" onClick={signOut}><LogOut size={16} /> Sair</button>
            </div>}
          </div>
        </div>
      </header>

      <section className={`workspace ${data.settings.sidebarCollapsed ? "sidebar-collapsed" : ""} ${(view === "insights" || view === "spreadsheets" || view === "settings" || view === "tasks" || view === "notes") ? "insights-active" : ""}`}>
        <Sidebar
          categories={data.categories}
          settings={data.settings}
          view={view}
          activeCategoryId={activeCategoryId}
          onCreateNote={createNote}
          onPickView={pickView}
          onRefresh={refreshData}
          onToggleSidebar={() => updateSettings({ sidebarCollapsed: !data.settings.sidebarCollapsed })}
          onOpenSettings={() => pickView("settings")}
          user={auth.user!}
        />
        {view === "insights" ? (
          <InsightsDashboard notes={data.notes} showMascot={data.settings.showMascot} onCreateNote={createNote} onCreateTask={createTask} onCreateSpreadsheet={() => createSpreadsheet("Nova planilha")} onOpenFavorites={() => pickView("favorites")} user={auth.user!} />
        ) : view === "tasks" ? (
          <TasksPage notes={data.notes} categories={data.categories} query={query} onQueryChange={setQuery} onCreate={createTaskFromPage} onUpdate={updateTaskFromPage} onToggle={toggleTaskFromPage} onDuplicate={duplicateTaskFromPage} onDelete={deleteTaskFromPage} />
        ) : view === "notes" ? (
          <NotesWorkspace notes={data.notes} categories={data.categories} folders={data.folders} tags={data.tags} settings={data.settings} selectedNote={selectedNote} query={query} creationError={noteCreationError} creatingNote={creatingNote} onQueryChange={setQuery} onSelect={setSelectedId} onCreateNote={createNote} onCreateFromTemplate={createNoteFromTemplate} onOpenTrash={() => pickView("trash")} onOpenArchived={() => pickView("archived")} onUpdateSettings={updateSettings} onUpdateNote={updateNoteLocally} onRefresh={refreshData} onDeleteNote={deleteSelectedNote} onOpenHistory={setHistoryNote} onTransformToTask={transformNoteToTask} onCreateFolder={createFolderFromNotes} onRenameFolder={renameFolderFromNotes} onDeleteFolder={deleteFolderFromNotes} onArchive={toggleArchiveNote} />
        ) : view === "spreadsheets" ? (
          <SpreadsheetsPage spreadsheets={data.spreadsheets} onCreate={createSpreadsheet} onImport={importSpreadsheet} onOpen={async (id) => { await window.mochi.openSpreadsheet(id); }} />
        ) : view === "settings" ? (
          <SettingsPage settings={data.settings} user={auth.user!} onUpdate={updateSettings} onProfileUpdate={setAuth} />
        ) : (
          <>
            <NoteList
              notes={filteredNotes}
              categories={data.categories}
              selectedId={selectedNote?.id ?? null}
              view={view}
              query={query}
              loading={loading}
              onSelect={setSelectedId}
              onCreateNote={createNote}
              onOpenTrash={() => pickView("trash")}
              onLeaveTrash={() => pickView("notes")}
            />
            <section className="editor-pane">
              {selectedNote && view === "trash" ? (
                <TrashNote note={selectedNote} onRestore={restoreTrashedNote} onPermanentlyDelete={permanentlyDeleteTrashedNote} />
              ) : selectedNote ? (
                <NoteEditor
                  key={selectedNote.id}
                  note={selectedNote}
                  categories={data.categories}
                  folders={data.folders}
                  tags={data.tags}
                  onUpdate={updateNoteLocally}
                  onRefresh={refreshData}
                  onDelete={deleteSelectedNote}
                  onOpenHistory={setHistoryNote}
                  onTransformToTask={transformNoteToTask}
                  onArchive={toggleArchiveNote}
                />
              ) : (
                view === "trash" ? <section className="trash-empty-pane"><Trash2 size={28} aria-hidden="true" /><h2>Nenhuma nota selecionada</h2><p>Notas removidas ficam aqui até serem restauradas ou apagadas definitivamente.</p></section> : <InsightsDashboard notes={data.notes} showMascot={data.settings.showMascot} onCreateNote={createNote} onCreateTask={createTask} onCreateSpreadsheet={() => createSpreadsheet("Nova planilha")} onOpenFavorites={() => pickView("favorites")} user={auth.user!} />
              )}
            </section>
          </>
        )}
      </section>
      {historyNote && <RevisionHistoryPanel note={historyNote} onClose={() => setHistoryNote(null)} onRestored={(note) => { updateNoteLocally(note); setHistoryNote(null); }} />}
      <div className="corner-softener" />
      <div className="decor decor-one"><Heart size={13} /></div>
      <div className="decor decor-two"><CheckSquare size={13} /></div>
      <div className="decor decor-three"><ListTodo size={13} /></div>
      <button className="mobile-menu">
        <Menu size={18} />
      </button>
    </main>
  );
}

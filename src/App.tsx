import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Heart, ListTodo, LogOut, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { AuthScreen } from "./components/AuthScreen";
import { InsightsDashboard } from "./components/InsightsDashboard";
import { SpreadsheetsPage } from "./components/SpreadsheetsPage";
import { Sidebar } from "./components/Sidebar";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { SettingsPanel } from "./components/SettingsPanel";
import type { AppData, AppSettings, AuthStatus, Category, Note, ViewMode } from "./types";
import { accentMap } from "./utils";

const emptyData: AppData = {
  notes: [],
  categories: [],
  spreadsheets: [],
  settings: { theme: "light", accent: "pink", sidebarCollapsed: false, showMascot: true }
};

export function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("insights");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectedNote = useMemo(() => data.notes.find((note) => note.id === selectedId) ?? data.notes[0] ?? null, [data.notes, selectedId]);

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
    document.documentElement.dataset.theme = data.settings.theme;
    document.documentElement.style.setProperty("--accent", data.settings.customAccent ?? accentMap[data.settings.accent]);
  }, [data.settings]);

  const refreshData = async (selectId?: string | null) => {
    const appData = await window.mochi.getAppData();
    setData(appData);
    if (selectId !== undefined) {
      setSelectedId(selectId);
      return;
    }
    if (selectedId && appData.notes.some((note) => note.id === selectedId)) return;
    setSelectedId(appData.notes[0]?.id ?? null);
  };

  const createNote = async () => {
    const note = await window.mochi.createNote();
    await refreshData(note.id);
  };

  const createQuickNote = async () => {
    const note = await window.mochi.createQuickNote();
    setView("quick");
    await refreshData(note.id);
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
    return data.notes.filter((note) => {
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
  }, [activeCategoryId, data.notes, query, view]);

  const pickView = (nextView: ViewMode, categoryId: string | null = null) => {
    setView(nextView);
    setActiveCategoryId(categoryId);
    if (nextView === "insights") return;
    const nextSelected = data.notes.find((note) =>
      nextView === "quick" ? note.quick : nextView === "favorites" ? note.favorite : nextView === "tasks" ? note.checklist.length > 0 : nextView === "category" ? note.categoryId === categoryId : true
    );
    setSelectedId(nextSelected?.id ?? null);
  };

  const deleteSelectedNote = async (id: string) => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    await window.mochi.deleteNote(id);
    await refreshData(null);
  };

  if (!auth) return <main className="app-loading" />;
  if (!auth.authenticated) return <AuthScreen onAuthenticated={onAuthenticated} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-compact">
          <span className="brand-mark">♡</span>
          <span>Mochi Notes</span>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes..." />
        </label>
        <button className="icon-button ghost" onClick={() => updateSettings({ theme: data.settings.theme === "light" ? "dark" : "light" })} title="Toggle theme">
          {data.settings.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button className="icon-button ghost" onClick={signOut} title="Sair da conta">
          <LogOut size={18} />
        </button>
      </header>

      <section className={`workspace ${data.settings.sidebarCollapsed ? "sidebar-collapsed" : ""} ${(view === "insights" || view === "spreadsheets") ? "insights-active" : ""}`}>
        <Sidebar
          categories={data.categories}
          settings={data.settings}
          view={view}
          activeCategoryId={activeCategoryId}
          onCreateNote={createNote}
          onPickView={pickView}
          onRefresh={refreshData}
          onToggleSidebar={() => updateSettings({ sidebarCollapsed: !data.settings.sidebarCollapsed })}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleMascot={() => updateSettings({ showMascot: !data.settings.showMascot })}
          user={auth.user!}
        />
        {view === "insights" ? (
          <InsightsDashboard notes={data.notes} showMascot={data.settings.showMascot} onCreateQuickNote={createQuickNote} />
        ) : view === "spreadsheets" ? (
          <SpreadsheetsPage spreadsheets={data.spreadsheets} onCreate={createSpreadsheet} onImport={importSpreadsheet} onOpen={async (id) => { await window.mochi.openSpreadsheet(id); }} />
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
              onCreateNote={view === "quick" ? createQuickNote : createNote}
            />
            <section className="editor-pane">
              {selectedNote ? (
                <NoteEditor
                  key={selectedNote.id}
                  note={selectedNote}
                  categories={data.categories}
                  onUpdate={updateNoteLocally}
                  onRefresh={refreshData}
                  onDelete={deleteSelectedNote}
                />
              ) : (
                <InsightsDashboard notes={data.notes} showMascot={data.settings.showMascot} onCreateQuickNote={createQuickNote} />
              )}
            </section>
          </>
        )}
      </section>

      {settingsOpen && <SettingsPanel settings={data.settings} user={auth.user!} onClose={() => setSettingsOpen(false)} onUpdate={updateSettings} onProfileUpdate={setAuth} />}
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

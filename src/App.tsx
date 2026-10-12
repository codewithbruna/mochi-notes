import { useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, ChevronDown, Heart, ListTodo, LogOut, Menu, Moon, Plus, Search, Settings, Sun, UserRound } from "lucide-react";
import { AuthScreen } from "./components/AuthScreen";
import { InsightsDashboard } from "./components/InsightsDashboard";
import { SpreadsheetsPage } from "./components/SpreadsheetsPage";
import { Sidebar } from "./components/Sidebar";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { SettingsPage } from "./components/SettingsPage";
import type { AppData, AppSettings, AuthStatus, Category, Note, ViewMode } from "./types";
import { applyThemeTokens, resolveTheme } from "./theme";
import appIcon from "./assets/app-icon-256.png";

const emptyData: AppData = {
  notes: [],
  categories: [],
  spreadsheets: [],
  settings: { theme: "light", palette: "aurora", accent: "pink", sidebarCollapsed: false, showMascot: true }
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

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
    if (selectedId && appData.notes.some((note) => note.id === selectedId)) return;
    setSelectedId(appData.notes[0]?.id ?? null);
  };

  const createNote = async () => {
    const note = await window.mochi.createNote();
    await refreshData(note.id);
  };

  const createTask = async () => {
    const note = await window.mochi.createNote();
    await window.mochi.createChecklistItem({ noteId: note.id, text: "Nova tarefa" });
    setView("tasks");
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
    if (nextView === "insights" || nextView === "spreadsheets" || nextView === "settings") return;
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

      <section className={`workspace ${data.settings.sidebarCollapsed ? "sidebar-collapsed" : ""} ${(view === "insights" || view === "spreadsheets" || view === "settings") ? "insights-active" : ""}`}>
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
                <InsightsDashboard notes={data.notes} showMascot={data.settings.showMascot} onCreateNote={createNote} onCreateTask={createTask} onCreateSpreadsheet={() => createSpreadsheet("Nova planilha")} onOpenFavorites={() => pickView("favorites")} user={auth.user!} />
              )}
            </section>
          </>
        )}
      </section>
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

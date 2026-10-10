import { BarChart3, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FileSpreadsheet, Heart, ListTodo, PawPrint, Pencil, Plus, Settings, StickyNote, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import type { AppSettings, Category, LocalUser, ViewMode } from "../types";

interface Props {
  categories: Category[];
  settings: AppSettings;
  view: ViewMode;
  activeCategoryId: string | null;
  onCreateNote: () => void;
  onPickView: (view: ViewMode, categoryId?: string | null) => void;
  onRefresh: () => Promise<void>;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onToggleMascot: () => void;
  user: LocalUser;
}

const palette = ["#f4a7c8", "#c9adf2", "#f2b69c", "#9edec2", "#f7d981", "#9cc7f2"];

export function Sidebar({ categories, settings, view, activeCategoryId, onCreateNote, onPickView, onRefresh, onToggleSidebar, onOpenSettings, onToggleMascot, user }: Props) {
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  const createCategory = async () => {
    const name = prompt("Category name");
    if (!name?.trim()) return;
    await window.mochi.createCategory({ name: name.trim(), color: palette[categories.length % palette.length] });
    await onRefresh();
  };

  const renameCategory = async (category: Category) => {
    const name = prompt("Rename category", category.name);
    if (!name?.trim()) return;
    const color = prompt("Category color", category.color) || category.color;
    await window.mochi.updateCategory({ id: category.id, name: name.trim(), color });
    await onRefresh();
  };

  const deleteCategory = async (category: Category) => {
    if (!confirm(`Delete "${category.name}"? Notes will move to another category.`)) return;
    await window.mochi.deleteCategory(category.id);
    await onRefresh();
  };

  return (
    <aside className={`sidebar ${settings.sidebarCollapsed ? "collapsed" : ""}`}>
      <button className="sidebar-orb" onClick={onToggleSidebar} title={settings.sidebarCollapsed ? "Abrir menu" : "Fechar menu"}>
        {settings.sidebarCollapsed ? <ChevronRight size={19} /> : <ChevronLeft size={18} />}
      </button>
      <div className="brand">
        <span className="logo">♡</span>
        <div>
          <strong>Mochi Notes</strong>
          <small>your little space</small>
        </div>
      </div>

      <button className="new-note" onClick={onCreateNote} data-tooltip="Nova nota" aria-label="Nova nota">
        <Plus size={17} /> <span>New Note</span>
      </button>

      <nav className="nav-list">
        <button className={view === "notes" ? "active" : ""} onClick={() => onPickView("notes")} data-tooltip="Notas" aria-label="Notas">
          <ListTodo size={18} /> <span>Notes</span>
        </button>
        <button className={view === "quick" ? "active" : ""} onClick={() => onPickView("quick")} data-tooltip="Notas rápidas" aria-label="Notas rápidas">
          <StickyNote size={18} /> <span>Notas rápidas</span>
        </button>
        <button className={view === "tasks" ? "active" : ""} onClick={() => onPickView("tasks")} data-tooltip="Tarefas" aria-label="Tarefas">
          <CheckSquare size={18} /> <span>Tasks</span>
        </button>
        <button className={view === "favorites" ? "active" : ""} onClick={() => onPickView("favorites")} data-tooltip="Favoritos" aria-label="Favoritos">
          <Heart size={18} /> <span>Favorites</span>
        </button>
        <button className={view === "insights" ? "active" : ""} onClick={() => onPickView("insights")} data-tooltip="BI pessoal" aria-label="BI pessoal">
          <BarChart3 size={18} /> <span>BI pessoal</span>
        </button>
        <button className={view === "spreadsheets" ? "active" : ""} onClick={() => onPickView("spreadsheets")} data-tooltip="Planilhas" aria-label="Planilhas">
          <FileSpreadsheet size={18} /> <span>Planilhas</span>
        </button>
      </nav>

      <section className="category-section">
        <div className="section-title">
          <button onClick={() => setCategoriesOpen((open) => !open)}>
            {categoriesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>Categories</span>
          </button>
          <button onClick={createCategory} title="Create category">
            <Plus size={14} />
          </button>
        </div>

        {categoriesOpen && (
          <div className="category-list">
            {categories.map((category) => (
              <div className={`category-row ${view === "category" && activeCategoryId === category.id ? "active" : ""}`} key={category.id}>
                <button onClick={() => onPickView("category", category.id)}>
                  <span className="category-dot" style={{ background: category.color }} />
                  <span>{category.name}</span>
                </button>
                <div className="row-actions">
                  <button onClick={() => renameCategory(category)} title="Edit category">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteCategory(category)} title="Delete category">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="sidebar-footer">
        <div className="sidebar-customization">
          <button onClick={onOpenSettings} title="Ajustes e cores" data-tooltip="Ajustes" aria-label="Ajustes"><Settings size={17} /><span>Ajustes</span></button>
          <button className={settings.showMascot ? "active" : ""} onClick={onToggleMascot} title="Mostrar ou ocultar mascote" data-tooltip="Mascote" aria-label="Mascote"><PawPrint size={17} /><span>Mascote</span></button>
        </div>
        <div className="sidebar-status"><Tag size={15} /><span>{settings.theme === "dark" ? "Dark" : "Light"} · {settings.customAccent ? "custom" : settings.accent}</span></div>
        <button className="sidebar-profile" onClick={onOpenSettings} title="Editar perfil">
          {user.avatarData ? <img src={user.avatarData} alt="Foto de perfil" /> : <span>{user.name.slice(0, 2).toUpperCase()}</span>}
          <div><strong>{user.name}</strong><small>Editar perfil</small></div>
        </button>
      </div>
    </aside>
  );
}

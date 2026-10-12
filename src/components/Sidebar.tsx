import { ChartNoAxesColumn, ChevronLeft, ChevronRight, Heart, ListTodo, NotebookPen, Settings, Table2 } from "lucide-react";
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
  user: LocalUser;
}

export function Sidebar({ settings, view, onPickView, onToggleSidebar, onOpenSettings, user }: Props) {
  const isCollapsed = settings.sidebarCollapsed;
  const profileInitials = user.name.slice(0, 2).toUpperCase() || "MN";
  const items = [
    { id: "tasks" as const, label: "Tasks", icon: ListTodo },
    { id: "notes" as const, label: "Notas", icon: NotebookPen },
    { id: "favorites" as const, label: "Favoritos", icon: Heart },
    { id: "insights" as const, label: "BI", icon: ChartNoAxesColumn },
    { id: "spreadsheets" as const, label: "Planilhas", icon: Table2 }
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`} aria-label="Navegação principal">
      <div className="sidebar-profile-header">
        <button className="sidebar-profile-button" onClick={onOpenSettings} aria-label="Editar meu perfil" data-tooltip="Meu perfil">
          {user.avatarData ? <img src={user.avatarData} alt="Foto de perfil" /> : <span>{profileInitials}</span>}
          <div>
            <strong>{user.name || "Meu perfil"}</strong>
            <small>Minha conta</small>
          </div>
        </button>
        <button
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Seções do Mochi Notes">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            className={view === id ? "active" : ""}
            key={id}
            onClick={() => onPickView(id)}
            aria-current={view === id ? "page" : undefined}
            aria-label={label}
            data-tooltip={label}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className={view === "settings" ? "active" : ""} onClick={onOpenSettings} aria-label="Ajustes" data-tooltip="Ajustes" aria-current={view === "settings" ? "page" : undefined}>
          <Settings size={18} aria-hidden="true" />
          <span>Ajustes</span>
        </button>
      </div>
    </aside>
  );
}

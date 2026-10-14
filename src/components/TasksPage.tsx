import { CalendarDays, Check, CheckCircle2, ChevronDown, Circle, Clock3, MoreHorizontal, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Category, ChecklistItem, Note, TaskPriority } from "../types";

type TaskFilter = "all" | "today" | "upcoming" | "overdue" | "completed";

export interface TaskRecord {
  item: ChecklistItem;
  note: Note;
}

export interface TaskDraft {
  text: string;
  description: string;
  priority: TaskPriority;
  dueAt: string;
  completed: boolean;
}

interface Props {
  notes: Note[];
  categories: Category[];
  query: string;
  onQueryChange: (query: string) => void;
  onCreate: (draft: TaskDraft) => Promise<void>;
  onUpdate: (task: TaskRecord, draft: TaskDraft) => Promise<void>;
  onToggle: (task: TaskRecord) => Promise<void>;
  onDuplicate: (task: TaskRecord) => Promise<void>;
  onDelete: (task: TaskRecord) => Promise<void>;
}

const filters: Array<{ id: TaskFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "today", label: "Hoje" },
  { id: "upcoming", label: "Próximas" },
  { id: "overdue", label: "Atrasadas" },
  { id: "completed", label: "Concluídas" }
];

const priorityLabels: Record<TaskPriority, string> = { high: "Alta", medium: "Média", low: "Baixa" };
const emptyDraft = (): TaskDraft => ({ text: "", description: "", priority: "medium", dueAt: "", completed: false });

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function localDate(value: string) {
  return new Date(value.length === 10 ? `${value}T00:00:00` : value);
}

function isToday(value: string | null) {
  if (!value) return false;
  return startOfDay(localDate(value)).getTime() === startOfDay().getTime();
}

function isOverdue(task: ChecklistItem) {
  return Boolean(task.dueAt) && !task.completed && startOfDay(localDate(task.dueAt!)).getTime() < startOfDay().getTime();
}

function isUpcoming(task: ChecklistItem) {
  return Boolean(task.dueAt) && !task.completed && startOfDay(localDate(task.dueAt!)).getTime() > startOfDay().getTime();
}

function taskDate(value: string | null) {
  if (!value) return "Sem prazo";
  if (isToday(value)) return "Hoje";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(localDate(value));
}

export function TasksPage({ notes, categories, query, onQueryChange, onCreate, onUpdate, onToggle, onDuplicate, onDelete }: Props) {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [priority, setPriority] = useState<"all" | TaskPriority>("all");
  const [form, setForm] = useState<{ mode: "create" } | { mode: "edit"; task: TaskRecord } | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const tasks = useMemo<TaskRecord[]>(() => notes.flatMap((note) => note.checklist.map((item) => ({ item, note }))), [notes]);
  const counts = useMemo(() => ({
    pending: tasks.filter(({ item }) => !item.completed).length,
    completed: tasks.filter(({ item }) => item.completed).length,
    overdue: tasks.filter(({ item }) => isOverdue(item)).length
  }), [tasks]);

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return tasks.filter(({ item, note }) => {
      const matchesQuery = !normalized || [item.text, item.description, note.title].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalized));
      const matchesPriority = priority === "all" || item.priority === priority;
      const matchesFilter = filter === "all" || (filter === "today" && isToday(item.dueAt)) || (filter === "upcoming" && isUpcoming(item)) || (filter === "overdue" && isOverdue(item)) || (filter === "completed" && item.completed);
      return matchesQuery && matchesPriority && matchesFilter;
    });
  }, [filter, priority, query, tasks]);

  const openCreate = () => { setError(""); setForm({ mode: "create" }); };
  const openEdit = (task: TaskRecord) => { setError(""); setMenuId(null); setForm({ mode: "edit", task }); };

  const submit = async (draft: TaskDraft) => {
    if (!draft.text.trim()) { setError("Dê um nome para a tarefa."); return; }
    setSubmitting(true);
    try {
      if (form?.mode === "edit") await onUpdate(form.task, draft);
      else await onCreate(draft);
      setForm(null);
    } catch {
      setError("Não foi possível salvar esta tarefa. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return <section className="tasks-page">
    <header className="tasks-page-header">
      <div><span>MEU ESPAÇO</span><h1>Minhas tarefas</h1><p>Organize seu dia, uma tarefa de cada vez.</p></div>
      <button className="tasks-primary-button" onClick={openCreate}><Plus size={17} /> Nova tarefa</button>
    </header>

    <section className="task-summary-grid" aria-label="Resumo de tarefas">
      <SummaryCard icon={<Clock3 size={17} />} label="Pendentes" value={counts.pending} tone="neutral" />
      <SummaryCard icon={<CheckCircle2 size={17} />} label="Concluídas" value={counts.completed} tone="success" />
      <SummaryCard icon={<CalendarDays size={17} />} label="Atrasadas" value={counts.overdue} tone="danger" />
    </section>

    <div className="tasks-controls">
      <div className="task-filters" role="tablist" aria-label="Filtrar tarefas">{filters.map((item) => <button key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)} role="tab" aria-selected={filter === item.id}>{item.label}</button>)}</div>
      <div className="task-search-row"><label className="task-search"><Search size={16} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Pesquisar tarefas" aria-label="Pesquisar tarefas" /></label><label className="task-priority-filter"><SlidersHorizontal size={15} /><span>Prioridade</span><select value={priority} onChange={(event) => setPriority(event.target.value as "all" | TaskPriority)} aria-label="Prioridade"><option value="all">Todas</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select><ChevronDown size={14} /></label></div>
    </div>

    <section className="tasks-list-section"><div className="tasks-list-heading"><div><h2>Suas tarefas</h2><span>{visibleTasks.length === 1 ? "1 tarefa" : `${visibleTasks.length} tarefas`}</span></div></div>
      {visibleTasks.length ? <ul className="tasks-list">{visibleTasks.map((task) => {
        const category = categories.find((item) => item.id === task.note.categoryId);
        const overdue = isOverdue(task.item);
        return <li className={`task-row ${task.item.completed ? "is-complete" : ""} ${overdue ? "is-overdue" : ""}`} key={task.item.id}>
          <button className="task-checkbox" onClick={() => onToggle(task)} aria-label={task.item.completed ? "Reabrir tarefa" : "Concluir tarefa"}>{task.item.completed ? <Check size={15} /> : <Circle size={17} />}</button>
          <div className="task-main"><strong>{task.item.text}</strong>{task.item.description && <p>{task.item.description}</p>}<div className="task-meta">{task.item.dueAt && <span className={overdue ? "overdue" : ""}><CalendarDays size={13} /> {overdue ? `Atrasada: ${taskDate(task.item.dueAt)}` : taskDate(task.item.dueAt)}</span>}{category && <span><i style={{ background: category.color }} />{category.name}</span>}{task.note.title && task.note.title !== task.item.text && <span className="task-note-link">{task.note.title}</span>}</div></div>
          <span className={`task-priority ${task.item.priority}`}>{priorityLabels[task.item.priority]}</span>
          <div className="task-menu-wrap"><button className="task-menu-button" onClick={() => setMenuId((id) => id === task.item.id ? null : task.item.id)} aria-label="Ações da tarefa" aria-expanded={menuId === task.item.id}><MoreHorizontal size={18} /></button>{menuId === task.item.id && <div className="task-actions-menu" role="menu"><button onClick={() => openEdit(task)}>Editar</button><button onClick={async () => { setMenuId(null); await onDuplicate(task); }}>Duplicar</button><button className="danger" onClick={async () => { setMenuId(null); if (confirm("Excluir esta tarefa?")) await onDelete(task); }}><Trash2 size={14} /> Excluir</button></div>}</div>
        </li>;
      })}</ul> : <TaskEmpty filter={filter} query={query} onCreate={openCreate} />}
    </section>

    {form && <TaskForm initial={form.mode === "edit" ? { text: form.task.item.text, description: form.task.item.description, priority: form.task.item.priority, dueAt: form.task.item.dueAt ? form.task.item.dueAt.slice(0, 10) : "", completed: form.task.item.completed } : emptyDraft()} title={form.mode === "edit" ? "Editar tarefa" : "Nova tarefa"} error={error} submitting={submitting} onCancel={() => setForm(null)} onSubmit={submit} />}
  </section>;
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) { return <article className={`task-summary-card ${tone}`}><span>{icon}</span><strong>{String(value).padStart(2, "0")}</strong><small>{label}</small></article>; }

function TaskEmpty({ filter, query, onCreate }: { filter: TaskFilter; query: string; onCreate: () => void }) {
  const noFilters = filter === "all" && !query.trim();
  return <div className="tasks-empty"><CheckCircle2 size={28} /><h3>{noFilters ? "Seu espaço está pronto para novas conquistas." : "Nenhuma tarefa encontrada."}</h3><p>{noFilters ? "Crie sua primeira tarefa e comece a organizar o que importa." : "Experimente alterar os filtros ou a pesquisa."}</p>{noFilters && <button className="tasks-primary-button" onClick={onCreate}><Plus size={17} /> Criar primeira tarefa</button>}</div>;
}

function TaskForm({ initial, title, error, submitting, onCancel, onSubmit }: { initial: TaskDraft; title: string; error: string; submitting: boolean; onCancel: () => void; onSubmit: (draft: TaskDraft) => Promise<void> }) {
  const [draft, setDraft] = useState(initial);
  return <div className="task-form-backdrop" role="presentation"><form className="task-form" onSubmit={(event) => { event.preventDefault(); void onSubmit(draft); }}><header><div><span>MOCHI NOTES</span><h2>{title}</h2><p>Uma tarefa de cada vez, no seu ritmo.</p></div><button type="button" className="task-form-close" onClick={onCancel} aria-label="Fechar">×</button></header><label><span>Título</span><input autoFocus value={draft.text} onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))} placeholder="O que você quer cuidar agora?" /></label><label><span>Descrição <em>opcional</em></span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Adicione um lembrete delicado" rows={3} /></label><div className="task-form-grid"><label><span>Prioridade</span><select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label><span>Prazo <em>opcional</em></span><input type="date" value={draft.dueAt} onChange={(event) => setDraft((current) => ({ ...current, dueAt: event.target.value }))} /></label></div><label className="task-status-input"><input type="checkbox" checked={draft.completed} onChange={(event) => setDraft((current) => ({ ...current, completed: event.target.checked }))} /> Marcar como concluída</label>{error && <p className="task-form-error">{error}</p>}<footer><button type="button" className="settings-secondary-button" onClick={onCancel}>Cancelar</button><button className="tasks-primary-button" disabled={submitting}>{submitting ? "Salvando..." : "Salvar tarefa"}</button></footer></form></div>;
}

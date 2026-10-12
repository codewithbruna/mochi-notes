import { BarChart3, CheckCircle2, Clock3, FileText, Heart, ListTodo, Plus, Sparkles, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import appIcon from "../assets/app-icon-256.png";
import type { LocalUser, Note } from "../types";

interface Props {
  notes: Note[];
  showMascot: boolean;
  onCreateNote: () => void;
  onCreateTask: () => void;
  onCreateSpreadsheet: () => void;
  onOpenFavorites: () => void;
  user: LocalUser;
}

type Period = "morning" | "afternoon" | "night";
type Greeting = { label: string; message: string; support: string; title?: string };

const greetings: Record<Period, Greeting> = {
  morning: { label: "☀️ Bom dia", message: "Bom dia! Um novo dia começou. Vamos fazer suas ideias florescerem?", support: "Comece devagar e deixe as ideias encontrarem espaço." },
  afternoon: { label: "🌷 Boa tarde", message: "Que bom ter você de volta! Ainda há tempo para cuidar das suas ideias.", support: "O que importa pode acontecer no seu próprio ritmo." },
  night: { label: "🌙 Boa noite", title: "Seu cantinho está te esperando.", message: "O dia está terminando. Que tal guardar suas ideias e celebrar suas conquistas?", support: "Uma pausa também faz parte do caminho." }
};

const mochiMoments = [
  "Uma pausa também faz parte do caminho.",
  "Você não precisa fazer tudo de uma vez.",
  "Cada pequena conquista merece ser reconhecida.",
  "Suas ideias têm espaço para crescer.",
  "Seu ritmo também importa."
];

function currentPeriod(now: Date): Period {
  const hour = now.getHours();
  return hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : "night";
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function relativeDate(value: string, now: Date) {
  const date = new Date(value);
  if (sameDay(date, now)) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function InsightsDashboard({ notes, showMascot, onCreateNote, onCreateTask, onCreateSpreadsheet, onOpenFavorites, user }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const period = currentPeriod(now);
  const greeting = greetings[period];
  const firstName = user.name.trim().split(/\s+/)[0] || "você";
  const moment = mochiMoments[(now.getDate() + now.getMonth()) % mochiMoments.length];

  const data = useMemo(() => {
    const checklist = notes.flatMap((note) => note.checklist.map((item) => ({ ...item, note })));
    const completed = checklist.filter((item) => item.completed);
    const pending = checklist.filter((item) => !item.completed);
    const weeklyNotes = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - 6 + index);
      return {
        label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        count: notes.filter((note) => sameDay(new Date(note.createdAt), date)).length
      };
    });
    const activityCount = weeklyNotes.reduce((total, day) => total + day.count, 0);

    return {
      completed,
      pending,
      favoriteCount: notes.filter((note) => note.favorite).length,
      progress: checklist.length ? Math.round((completed.length / checklist.length) * 100) : 0,
      weeklyNotes,
      activityCount,
      recent: [...notes].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 3)
    };
  }, [notes, now]);

  const maxWeeklyValue = Math.max(1, ...data.weeklyNotes.map((day) => day.count));

  return (
    <section className="insights-pane cozy-bi premium-dashboard">
      <header className={`welcome-banner ${period}`}>
        <span className="banner-moon" aria-hidden="true" />
        <span className="banner-star star-one" aria-hidden="true" />
        <span className="banner-star star-two" aria-hidden="true" />
        <span className="banner-wave wave-one" aria-hidden="true" />
        <span className="banner-wave wave-two" aria-hidden="true" />
        {showMascot && <img className="banner-mochi" src={appIcon} alt="" aria-hidden="true" />}
        <div className="welcome-content">
          <span className="welcome-period">{greeting.label}, {firstName}</span>
          {greeting.title && <h1 className="welcome-title">{greeting.title}</h1>}
          <p className="welcome-message">{greeting.message}</p>
          <p>{greeting.support}</p>
          <div className="quick-actions" aria-label="Ações rápidas">
            <button className="quick-action primary" onClick={onCreateNote}><FileText size={17} /> Nova nota</button>
            <button className="quick-action" onClick={onCreateTask}><CheckCircle2 size={17} /> Nova tarefa</button>
            <button className="quick-action" onClick={onCreateSpreadsheet}><Table2 size={17} /> Nova planilha</button>
            <button className="quick-action" onClick={onOpenFavorites}><Heart size={17} /> Ver favoritos</button>
          </div>
        </div>
      </header>

      <section className="metric-grid" aria-label="Indicadores pessoais">
        <MetricCard icon={<FileText />} title="Notas" value={notes.length} caption="notas guardadas" tone="lilac" />
        <MetricCard icon={<CheckCircle2 />} title="Tarefas concluídas" value={`${data.progress}%`} caption={`${data.completed.length} de ${data.completed.length + data.pending.length} tarefas`} tone="mint" />
        <MetricCard icon={<Heart />} title="Favoritos" value={data.favoriteCount} caption="itens favoritos" tone="pink" />
        <MetricCard icon={<BarChart3 />} title="Atividades" value={data.activityCount} caption="notas na semana" tone="blue" />
      </section>

      <div className="dashboard-columns">
        <div className="dashboard-main-column">
          <article className="dashboard-card weekly-card">
            <CardHeading icon={<BarChart3 size={18} />} title="Atividade da semana" description="Notas criadas ao longo dos últimos sete dias" />
            <div className="chart-legend"><span><i className="legend-dot mint" /> Notas criadas</span></div>
            <div className="weekly-chart premium" aria-label="Gráfico de notas criadas na semana">
              {data.weeklyNotes.map((day, index) => (
                <div className="weekly-bar" key={`${day.label}-${index}`}>
                  <span className="weekly-value">{day.count || ""}</span>
                  <div className="weekly-bar-track"><i style={{ height: `${Math.max(day.count ? 18 : 4, (day.count / maxWeeklyValue) * 100)}%` }} /></div>
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-card recent-card">
            <CardHeading icon={<Clock3 size={18} />} title="Atividades recentes" action="Suas notas" />
            {data.recent.length ? <ul className="activity-list">
              {data.recent.map((note) => <li key={note.id}><span className="activity-icon"><FileText size={15} /></span><div><strong>{note.createdAt === note.updatedAt ? "Nota criada" : "Nota atualizada"}</strong><small>{note.title || "Sem título"}</small></div><time>{relativeDate(note.updatedAt, now)}</time></li>)}
            </ul> : <EmptyCopy>Quando você criar uma nota, ela aparecerá aqui.</EmptyCopy>}
          </article>
        </div>

        <aside className="dashboard-side-column">
          <article className="dashboard-card today-card">
            <CardHeading icon={<ListTodo size={18} />} title="Resumo de hoje" action={now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} />
            {data.pending.length ? <SummaryRow value={data.pending.length} label="Tarefas pendentes" description="Lembretes que ainda estão em aberto." icon={<ListTodo size={17} />} /> : <EmptyCopy>Seu dia está tranquilo por aqui. Aproveite seu ritmo.</EmptyCopy>}
            <SummaryRow value={data.completed.length} label="Tarefas concluídas" description="Concluídas no seu espaço." icon={<CheckCircle2 size={17} />} />
            <SummaryRow value="-" label="Próximas atividades" description="Ainda não há atividades com horário definido." icon={<Clock3 size={17} />} />
          </article>

          <article className="dashboard-card mochi-moment">
            <CardHeading icon={<Sparkles size={18} />} title="Momentinho Mochi" />
            <p>{moment}</p>
            <span className="mochi-mini" aria-hidden="true">♡</span>
          </article>
        </aside>
      </div>
    </section>
  );
}

function MetricCard({ icon, title, value, caption, tone }: { icon: React.ReactNode; title: string; value: number | string; caption: string; tone: string }) {
  return <article className={`metric-card ${tone}`}><span className="metric-icon">{icon}</span><div><small>{title}</small><strong>{value}</strong><span>{caption}</span></div><i className="metric-detail" /></article>;
}

function CardHeading({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: string }) {
  return <header className="dashboard-card-heading"><div><span>{icon}</span><div><strong>{title}</strong>{description && <small>{description}</small>}</div></div>{action && <small>{action}</small>}</header>;
}

function SummaryRow({ value, label, description, icon }: { value: number | string; label: string; description: string; icon: React.ReactNode }) {
  return <div className="summary-row"><span className="summary-icon">{icon}</span><strong>{value}</strong><div><b>{label}</b><small>{description}</small></div></div>;
}

function EmptyCopy({ children }: { children: React.ReactNode }) {
  return <p className="dashboard-empty">{children}</p>;
}

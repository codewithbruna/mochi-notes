import { BarChart3, CheckCircle2, FileText, Plus, Sparkles, StickyNote } from "lucide-react";
import type { Note } from "../types";

interface Props {
  notes: Note[];
  showMascot: boolean;
  onCreateQuickNote: () => void;
}

export function InsightsDashboard({ notes, showMascot, onCreateQuickNote }: Props) {
  const quickNotes = notes.filter((note) => note.quick);
  const favoriteNotes = notes.filter((note) => note.favorite);
  const checklistItems = notes.flatMap((note) => note.checklist);
  const completed = checklistItems.filter((item) => item.completed).length;
  const progress = checklistItems.length ? Math.round((completed / checklistItems.length) * 100) : 0;

  return (
    <section className="insights-pane">
      <header className="insights-header">
        <div>
          <p className="eyebrow"><Sparkles size={15} /> Espaço aurora</p>
          <h1>Uma visão leve do seu dia.</h1>
          <span>Capture o que importa e acompanhe o que está florescendo.</span>
        </div>
        {showMascot && <AuroraMascot />}
      </header>

      <div className="insights-actions">
        <button className="aurora-primary" onClick={onCreateQuickNote}><StickyNote size={18} /> Nova nota rápida</button>
      </div>

      <div className="bi-heading"><BarChart3 size={18} /><span>BI pessoal</span><small>um retrato rápido das suas anotações</small></div>
      <div className="bi-grid">
        <article className="bi-card"><FileText size={20} /><strong>{notes.length}</strong><span>notas guardadas</span></article>
        <article className="bi-card"><StickyNote size={20} /><strong>{quickNotes.length}</strong><span>notas rápidas</span></article>
        <article className="bi-card"><CheckCircle2 size={20} /><strong>{progress}%</strong><span>tarefas concluídas</span></article>
        <article className="bi-card"><Sparkles size={20} /><strong>{favoriteNotes.length}</strong><span>favoritas</span></article>
      </div>

      <section className="quick-capture">
        <div>
          <p>Notas rápidas</p>
          <h2>{quickNotes.length ? "Ideias capturadas no caminho" : "Tudo começa com uma pequena ideia"}</h2>
        </div>
        <button className="icon-button" onClick={onCreateQuickNote} title="Criar nota rápida"><Plus size={18} /></button>
      </section>
    </section>
  );
}

function AuroraMascot() {
  return (
    <div className="aurora-mascot" aria-label="Mascote Aurora">
      <span className="mascot-glow" />
      <span className="mascot-ear left" />
      <span className="mascot-ear right" />
      <span className="mascot-face"><i /><i /><b /></span>
      <span className="mascot-spark one" />
      <span className="mascot-spark two" />
    </div>
  );
}

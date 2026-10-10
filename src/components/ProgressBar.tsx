interface Props {
  done: number;
  total: number;
  percent: number;
}

export function ProgressBar({ done, total, percent }: Props) {
  return (
    <div className="progress-wrap">
      <div className="progress-meta">
        <span>Tasks</span>
        <span>
          {done} / {total} completed
        </span>
      </div>
      <div className="progress-track" aria-label={`${percent}% completed`}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

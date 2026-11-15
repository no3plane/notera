import { CHORD_TASK_GROUPS } from '../lib/chordPracticeNavigation';
import type { ChordTask } from '../lib/chordPracticeNavigation';

export function ChordTaskNavigation({
  task,
  onChange,
}: {
  task: ChordTask;
  onChange: (task: ChordTask) => void;
}) {
  return (
    <nav className="chord-task-navigation" aria-label="和弦练习">
      <label className="chord-task-picker">
        当前练习
        <select value={task} onChange={(event) => onChange(event.target.value as ChordTask)}>
          {CHORD_TASK_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.tasks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                  {'susOnly' in item ? ' · 挂留和弦' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="chord-task-list" role="group" aria-label="练习题型">
        {CHORD_TASK_GROUPS.map((group) => (
          <div className="chord-task-group" key={group.label}>
            <p>{group.label}</p>
            {group.tasks.map((item) => (
              <button
                key={item.id}
                aria-label={item.label}
                aria-pressed={task === item.id}
                onClick={() => {
                  if (task !== item.id) onChange(item.id);
                }}
              >
                <span>{item.label}</span>
                {'susOnly' in item && <small>挂留和弦</small>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

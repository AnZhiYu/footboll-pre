import type { TeamStats } from '../types';

type StatControlProps = {
  label: string;
  field: keyof TeamStats;
  value: number;
  onChange: (field: keyof TeamStats, value: number) => void;
};

export function StatControl({ label, field, value, onChange }: StatControlProps) {
  const update = (rawValue: string) => {
    const next = Math.max(0, Math.min(100, Number(rawValue)));
    onChange(field, Number.isFinite(next) ? next : 70);
  };

  return (
    <label className="stat-control">
      <span>{label}</span>
      <input
        aria-label={label}
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => update(event.target.value)}
      />
      <input
        className="stat-number"
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(event) => update(event.target.value)}
      />
    </label>
  );
}

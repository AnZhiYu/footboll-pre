import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Match, MatchAnalysis, TeamStats } from '../types';
import { formatProbability } from '../lib/combo';
import { StatControl } from './StatControl';

type MatchCardProps = {
  match: Match;
  analysis: MatchAnalysis;
  selected: boolean;
  onToggleSelected: (matchId: string) => void;
  onUpdateMatch: (match: Match) => void;
  onDeleteMatch: (matchId: string) => void;
};

const statLabels: Array<[keyof TeamStats, string]> = [
  ['attack', '进攻'],
  ['defense', '防守'],
  ['stability', '稳定'],
];

export function MatchCard({
  match,
  analysis,
  selected,
  onToggleSelected,
  onUpdateMatch,
  onDeleteMatch,
}: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const title = `${match.homeName} vs ${match.awayName}`;

  const copyTitle = async () => {
    await navigator.clipboard?.writeText(title);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const updateStats = (side: 'homeStats' | 'awayStats', field: keyof TeamStats, value: number) => {
    onUpdateMatch({
      ...match,
      [side]: {
        ...match[side],
        [field]: value,
      },
    });
  };

  const updateName = (field: 'homeName' | 'awayName', value: string) => {
    onUpdateMatch({ ...match, [field]: value });
  };

  return (
    <article className="match-card">
      <div className="match-card-main">
        <label className="match-check">
          <input
            type="checkbox"
            checked={selected}
            aria-label={`选择 ${title}`}
            onChange={() => onToggleSelected(match.id)}
          />
        </label>
        <div className="match-summary">
          <button
            className="match-title-button"
            type="button"
            aria-label={`复制对局 ${title}`}
            title="点击复制对局"
            onClick={copyTitle}
          >
            <span className="match-title">{title}</span>
            <Copy size={15} />
            {copied ? <span className="copied-badge">已复制</span> : null}
          </button>
          <span className="summary-grid">
            <span>
              最可能 <strong>{analysis.mostLikely.label}</strong>
            </span>
            <span>
              大球 <strong>{analysis.highScore.label}</strong>
            </span>
            <span>
              小球 <strong>{analysis.lowScore.label}</strong>
            </span>
          </span>
        </div>
        <button
          className="icon-button danger"
          type="button"
          aria-label={`删除 ${title}`}
          onClick={() => onDeleteMatch(match.id)}
        >
          <Trash2 size={18} />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={expanded ? '收起赛事' : '展开赛事'}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {expanded ? (
        <div className="match-editor">
          <div className="name-row">
            <label>
              球队A
              <input value={match.homeName} onChange={(event) => updateName('homeName', event.target.value)} />
            </label>
            <label>
              球队B
              <input value={match.awayName} onChange={(event) => updateName('awayName', event.target.value)} />
            </label>
          </div>

          <div className="stats-columns">
            <section>
              <h3>{match.homeName || '球队A'}能力</h3>
              {statLabels.map(([field, label]) => (
                <StatControl
                  key={`home-${field}`}
                  label={`球队A${label}`}
                  field={field}
                  value={match.homeStats[field]}
                  onChange={(nextField, value) => updateStats('homeStats', nextField, value)}
                />
              ))}
            </section>
            <section>
              <h3>{match.awayName || '球队B'}能力</h3>
              {statLabels.map(([field, label]) => (
                <StatControl
                  key={`away-${field}`}
                  label={`球队B${label}`}
                  field={field}
                  value={match.awayStats[field]}
                  onChange={(nextField, value) => updateStats('awayStats', nextField, value)}
                />
              ))}
            </section>
          </div>

          <div className="analysis-strip">
            <span>xG {analysis.homeLambda.toFixed(2)} : {analysis.awayLambda.toFixed(2)}</span>
            <span>节奏 {analysis.paceFactor.toFixed(1)}</span>
            <span>Top1 {formatProbability(analysis.mostLikely.probability)}</span>
          </div>
        </div>
      ) : null}
    </article>
  );
}

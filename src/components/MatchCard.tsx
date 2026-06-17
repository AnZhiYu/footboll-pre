import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Match, MatchAnalysis, TeamStats } from '../types';
import { getBigScoreSignal } from '../lib/bigScore';
import { formatProbability, getScoreLayers } from '../lib/combo';
import { getConfidenceInsight, getMatchVerdict, getPaceInsight, getXgInsight } from '../lib/insights';
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
  ['pace', '节奏'],
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
  const homeXg = getXgInsight(analysis.homeLambda);
  const awayXg = getXgInsight(analysis.awayLambda);
  const pace = getPaceInsight(analysis.paceFactor);
  const confidence = getConfidenceInsight(analysis.mostLikely.probability);
  const verdict = getMatchVerdict(analysis);
  const scoreLayers = getScoreLayers(analysis);
  const bigScoreSignal = getBigScoreSignal(analysis);

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
          <div className="score-layer-grid" aria-label={`${title} 比分分层推荐`}>
            <span>
              主线 <strong>{scoreLayers.mainline.map((pick) => pick.label).join(' / ')}</strong>
            </span>
            <span>
              覆盖 <strong>{scoreLayers.coverage.map((pick) => pick.label).join(' / ')}</strong>
            </span>
            <span>
              防冷 <strong>{scoreLayers.upset.map((pick) => pick.label).join(' / ')}</strong>
            </span>
          </div>
          <div
            className="big-score-signal"
            data-level={bigScoreSignal.level}
            title={bigScoreSignal.tooltip}
            aria-label={`${title} 大比分信号`}
          >
            <span>
              大比分信号 <strong>{bigScoreSignal.label}</strong>
            </span>
            <span>{bigScoreSignal.reasons.slice(0, 3).join(' / ')}</span>
            <strong>
              {bigScoreSignal.level === 'low'
                ? '观察为主'
                : bigScoreSignal.candidates.slice(0, 4).map((pick) => pick.label).join(' / ')}
            </strong>
          </div>
          <div className="metric-strip" aria-label={`${title} 指标解读`}>
            <span className="metric-chip" title={`${homeXg.tooltip} ${homeXg.bettingHint}`}>
              xG {analysis.homeLambda.toFixed(2)} <strong data-tone={homeXg.tone}>{homeXg.label}</strong>
            </span>
            <span className="metric-divider">:</span>
            <span className="metric-chip" title={`${awayXg.tooltip} ${awayXg.bettingHint}`}>
              {analysis.awayLambda.toFixed(2)} <strong data-tone={awayXg.tone}>{awayXg.label}</strong>
            </span>
            <span className="metric-chip" title={`${pace.tooltip} ${pace.bettingHint}`}>
              节奏 {analysis.paceFactor.toFixed(1)} <strong data-tone={pace.tone}>{pace.label}</strong>
            </span>
            <span className="metric-chip" title={`${confidence.tooltip} ${confidence.bettingHint}`}>
              Top1 {formatProbability(analysis.mostLikely.probability)}{' '}
              <strong data-tone={confidence.tone}>{confidence.label}</strong>
            </span>
          </div>
          <p className="match-verdict">{verdict}</p>
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
                  value={match.homeStats[field] ?? 50}
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
                  value={match.awayStats[field] ?? 50}
                  onChange={(nextField, value) => updateStats('awayStats', nextField, value)}
                />
              ))}
            </section>
          </div>

        </div>
      ) : null}
    </article>
  );
}

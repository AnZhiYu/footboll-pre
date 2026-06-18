import { BadgeDollarSign, ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Match, MatchAnalysis, ProbabilityTriplet, ScorePick, TeamStats } from '../types';
import { getBigScoreSignal } from '../lib/bigScore';
import { formatProbability, getScoreLayers } from '../lib/combo';
import { getConfidenceInsight, getPaceInsight, getXgInsight } from '../lib/insights';
import { OddsDetailModal } from './OddsDetailModal';
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

const formatOdds = (value: number | undefined) => (value ? value.toFixed(2) : '无赔率');
const formatValue = (value: number | undefined) => (value ? value.toFixed(2) : '-');

const leadingOutcome = (probabilities: ProbabilityTriplet, homeName: string, awayName: string) => {
  const entries = [
    [`${homeName}胜`, probabilities.teamAWin],
    ['平', probabilities.draw],
    [`${awayName}胜`, probabilities.teamBWin],
  ] as const;
  return [...entries].sort((a, b) => b[1] - a[1])[0];
};

function ScorePickChip({ pick }: { pick: ScorePick }) {
  return (
    <span className="score-pick-chip" title={`${pick.label} 模型概率 ${formatProbability(pick.probability)}`}>
      <strong>{pick.label}</strong>
      <small>模型 {formatProbability(pick.probability)}</small>
      <small>{pick.odds ? `赔 ${formatOdds(pick.odds)}` : '无赔率'}</small>
      <small>价值 {formatValue(pick.valueIndex)}</small>
    </span>
  );
}

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
  const scoreLayers = getScoreLayers(analysis);
  const bigScoreSignal = getBigScoreSignal(analysis);
  const [oddsOpen, setOddsOpen] = useState(false);
  const winnerSummary = analysis.oddsSummary?.winner;
  const winnerModelLead = winnerSummary
    ? leadingOutcome(winnerSummary.model, match.homeName, match.awayName)
    : undefined;
  const winnerMarketLead = winnerSummary
    ? leadingOutcome(winnerSummary.market, match.homeName, match.awayName)
    : undefined;

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
          {match.odds ? (
            <button
              className="odds-detail-button"
              type="button"
              aria-label={`查看赔率详情 ${title}`}
              title="查看赔率详情"
              onClick={() => setOddsOpen(true)}
            >
              <BadgeDollarSign size={15} />
            </button>
          ) : null}
          {winnerSummary && winnerModelLead && winnerMarketLead ? (
            <div className="winner-value-strip" aria-label={`${title} 胜平负价值`}>
              <strong>胜平负价值</strong>
              <span>{winnerSummary.verdict}</span>
              <small>
                模型 {winnerModelLead[0]} {formatProbability(winnerModelLead[1])}
              </small>
              <small>
                盘口 {winnerMarketLead[0]} {formatProbability(winnerMarketLead[1])}
              </small>
            </div>
          ) : null}
          <div className="score-layer-grid" aria-label={`${title} 比分分层推荐`}>
            <section>
              <h3>主线</h3>
              <div>{scoreLayers.mainline.map((pick) => <ScorePickChip key={pick.label} pick={pick} />)}</div>
            </section>
            <section>
              <h3>备选比分</h3>
              <div>{scoreLayers.coverage.map((pick) => <ScorePickChip key={pick.label} pick={pick} />)}</div>
            </section>
            <section>
              <h3>冷门防守</h3>
              <div>{scoreLayers.upset.map((pick) => <ScorePickChip key={pick.label} pick={pick} />)}</div>
            </section>
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
      <OddsDetailModal match={match} analysis={analysis} open={oddsOpen} onClose={() => setOddsOpen(false)} />
    </article>
  );
}

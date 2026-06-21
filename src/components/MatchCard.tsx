import { BadgeDollarSign, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Match, MatchAnalysis, ProbabilityTriplet, ScorePick } from '../types';
import { getBigScoreSignal } from '../lib/bigScore';
import { formatProbability, getScoreLayers } from '../lib/combo';
import {
  formatTotalGoalsLabel,
  getBttsProbabilities,
  getLeadingTotalGoalsProbabilities,
} from '../lib/directionProbabilities';
import { getConfidenceInsight, getPaceInsight, getXgInsight } from '../lib/insights';
import { getMidOddsCandidateInsight } from '../lib/odds';
import { OddsDetailModal } from './OddsDetailModal';

type MatchCardProps = {
  match: Match;
  analysis: MatchAnalysis;
  selected: boolean;
  onToggleSelected: (matchId: string) => void;
  onUpdateMatch: (match: Match) => void;
  onDeleteMatch: (matchId: string) => void;
};

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
    </span>
  );
}

export function MatchCard({
  match,
  analysis,
  selected,
  onToggleSelected,
  onDeleteMatch,
}: MatchCardProps) {
  const [copied, setCopied] = useState(false);
  const title = `${match.homeName} vs ${match.awayName}`;
  const homeXg = getXgInsight(analysis.homeLambda);
  const awayXg = getXgInsight(analysis.awayLambda);
  const pace = getPaceInsight(analysis.paceFactor);
  const confidence = getConfidenceInsight(analysis.mostLikely.probability);
  const scoreLayers = getScoreLayers(analysis);
  const bigScoreSignal = getBigScoreSignal(analysis);
  const totalGoalsProbabilities = getLeadingTotalGoalsProbabilities(analysis, 3);
  const bttsProbabilities = getBttsProbabilities(analysis);
  const bttsLead = bttsProbabilities.yes >= bttsProbabilities.no
    ? ['是', bttsProbabilities.yes]
    : ['否', bttsProbabilities.no];
  const midOddsCandidate = getMidOddsCandidateInsight(match, analysis);
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

  return (
    <article className="match-card">
      <div className="match-card-main">
        <label className="match-check mobile-hidden-control">
          <input
            type="checkbox"
            checked={selected}
            aria-label={`选择 ${title}`}
            onChange={() => onToggleSelected(match.id)}
          />
        </label>
        <div className="match-summary">
          <div className="match-title-row">
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
                className="secondary-button odds-detail-button"
                type="button"
                aria-label={`赔率详情 ${title}`}
                title="查看赔率详情"
                onClick={() => setOddsOpen(true)}
              >
                <BadgeDollarSign size={14} />
                赔率详情
              </button>
            ) : null}
          </div>
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
          {midOddsCandidate.qualified ? (
            <div
              className="mid-odds-candidate-strip"
              aria-label={`${title} 中赔候选`}
              title={midOddsCandidate.conditions.map((condition) => `${condition.matched ? '✓' : '×'} ${condition.label}: ${condition.detail}`).join('\n')}
            >
              <strong>中赔候选 {midOddsCandidate.matchedCount}/{midOddsCandidate.total}</strong>
              <span>
                {midOddsCandidate.conditions
                  .filter((condition) => condition.matched)
                  .slice(0, 3)
                  .map((condition) => condition.label)
                  .join(' / ')}
              </span>
            </div>
          ) : null}
          <div className="score-layer-grid" aria-label={`${title} 比分分层推荐`}>
            <section>
              <h3>主推</h3>
              <div>{analysis.matrix.slice(0, 3).map((pick) => <ScorePickChip key={pick.label} pick={pick} />)}</div>
            </section>
            <section>
              <h3>冷门防守</h3>
              <div>{scoreLayers.upset.slice(0, 3).map((pick) => <ScorePickChip key={pick.label} pick={pick} />)}</div>
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
          <div className="direction-probability-strip" aria-label={`${title} 方向概率`}>
            <section title="按当前比分矩阵汇总的总进球数模型概率">
              <strong>进球数</strong>
              <div>
                {totalGoalsProbabilities.map((item) => (
                  <span key={String(item.goals)}>
                    {formatTotalGoalsLabel(item.goals)} {formatProbability(item.probability)}
                  </span>
                ))}
              </div>
            </section>
            <section title={`双方进球模型概率：是 ${formatProbability(bttsProbabilities.yes)} / 否 ${formatProbability(bttsProbabilities.no)}`}>
              <strong>BTTS</strong>
              <div>
                <span data-lead="true">
                  {bttsLead[0]} {formatProbability(Number(bttsLead[1]))}
                </span>
                <span>是 {formatProbability(bttsProbabilities.yes)}</span>
                <span>否 {formatProbability(bttsProbabilities.no)}</span>
              </div>
            </section>
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
          className="icon-button danger mobile-hidden-control"
          type="button"
          aria-label={`删除 ${title}`}
          onClick={() => onDeleteMatch(match.id)}
        >
          <Trash2 size={18} />
        </button>
      </div>
      <OddsDetailModal match={match} analysis={analysis} open={oddsOpen} onClose={() => setOddsOpen(false)} />
    </article>
  );
}

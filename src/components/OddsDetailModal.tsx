import { X } from 'lucide-react';
import { formatProbability } from '../lib/combo';
import type { Match, MatchAnalysis, OutcomeOdds, ProbabilityTriplet, ScorePick } from '../types';

type OddsDetailModalProps = {
  match: Match;
  analysis: MatchAnalysis;
  open: boolean;
  onClose: () => void;
};

const formatOdds = (value: number | undefined) => (value ? value.toFixed(2) : '-');
const formatValue = (value: number | undefined) => (value ? value.toFixed(2) : '-');

const outcomeRows = (
  match: Match,
  odds: OutcomeOdds | undefined,
  model: ProbabilityTriplet | undefined,
  market: ProbabilityTriplet | undefined,
) => [
  {
    label: `${match.homeName}胜`,
    odds: odds?.teamAWin,
    model: model?.teamAWin,
    market: market?.teamAWin,
  },
  {
    label: '平',
    odds: odds?.draw,
    model: model?.draw,
    market: market?.draw,
  },
  {
    label: `${match.awayName}胜`,
    odds: odds?.teamBWin,
    model: model?.teamBWin,
    market: market?.teamBWin,
  },
];

const scoreByLabel = (matrix: ScorePick[]) => new Map(matrix.map((pick) => [pick.label, pick]));

export function OddsDetailModal({ match, analysis, open, onClose }: OddsDetailModalProps) {
  if (!open) {
    return null;
  }

  const title = `${match.homeName} vs ${match.awayName}`;
  const scoreMap = scoreByLabel(analysis.matrix);
  const correctScores = [...(match.odds?.correctScores ?? [])].sort((a, b) => {
    const aPick = scoreMap.get(a.score);
    const bPick = scoreMap.get(b.score);
    return (bPick?.probability ?? 0) - (aPick?.probability ?? 0);
  });

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="insight-modal odds-detail-modal" role="dialog" aria-modal="true" aria-label={`${title} 赔率详情`}>
        <div className="insight-modal-heading">
          <div>
            <p>赔率详情</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="关闭赔率详情" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {match.odds ? (
          <>
            <section className="odds-detail-section">
              <div className="odds-detail-title">
                <h3>胜平负价值</h3>
                {analysis.oddsSummary?.winner ? <strong>{analysis.oddsSummary.winner.verdict}</strong> : null}
              </div>
              {match.odds.winner && analysis.oddsSummary?.winner ? (
                <div className="odds-table">
                  <div className="odds-table-head">
                    <span>方向</span>
                    <span>赔率</span>
                    <span>模型</span>
                    <span>盘口</span>
                  </div>
                  {outcomeRows(
                    match,
                    match.odds.winner,
                    analysis.oddsSummary.winner.model,
                    analysis.oddsSummary.winner.market,
                  ).map((row) => (
                    <div className="odds-table-row" key={row.label}>
                      <strong>{row.label}</strong>
                      <span>{formatOdds(row.odds)}</span>
                      <span>{row.model === undefined ? '-' : formatProbability(row.model)}</span>
                      <span>{row.market === undefined ? '-' : formatProbability(row.market)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="odds-empty">当前比赛未导入胜平负赔率。</p>
              )}
            </section>

            <section className="odds-detail-section">
              <div className="odds-detail-title">
                <h3>波胆赔率</h3>
                <strong>{correctScores.length} 项</strong>
              </div>
              {correctScores.length > 0 ? (
                <div className="score-odds-grid">
                  {correctScores.map((item) => {
                    const pick = scoreMap.get(item.score);
                    return (
                      <div className="score-odds-row" key={`${item.score}-${item.odds}`}>
                        <strong>{item.score}</strong>
                        <span>赔 {formatOdds(item.odds)}</span>
                        <span>模型 {pick ? formatProbability(pick.probability) : '-'}</span>
                        <span>价值 {formatValue(pick?.valueIndex)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="odds-empty">当前比赛未导入波胆赔率。</p>
              )}
            </section>
          </>
        ) : (
          <p className="odds-empty">当前比赛未导入赔率。</p>
        )}
      </section>
    </div>
  );
}

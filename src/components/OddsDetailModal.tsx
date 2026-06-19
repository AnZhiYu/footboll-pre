import { X } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useMemo, useState } from 'react';
import { formatProbability } from '../lib/combo';
import {
  CORRECT_SCORE_TAGS,
  type CorrectScoreTagKey,
  getCorrectScoreReason,
  getCorrectScoreTagMap,
} from '../lib/correctScoreTags';
import type { Match, MatchAnalysis, OutcomeOdds, ProbabilityTriplet, ScorePick } from '../types';

type OddsDetailModalProps = {
  match: Match;
  analysis: MatchAnalysis;
  open: boolean;
  onClose: () => void;
};

const formatOdds = (value: number | undefined) => (value ? value.toFixed(2) : '-');
const formatValue = (value: number | undefined) => (value ? value.toFixed(2) : '-');
const formatGoals = (value: number | '7+') => (value === '7+' ? '7+球' : `${value}球`);
type ScoreOddsSortKey = 'probability' | 'odds' | 'value' | 'tags';
const tagOptions: CorrectScoreTagKey[] = ['reasonableNonHot', 'middleOdds', 'mainline', 'highScore', 'value'];
const statRows = [
  ['attack', '进攻'],
  ['defense', '防守'],
  ['stability', '稳定'],
  ['pace', '节奏'],
] as const;

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
    value: market?.teamAWin ? (model?.teamAWin ?? 0) / market.teamAWin : undefined,
  },
  {
    label: '平',
    odds: odds?.draw,
    model: model?.draw,
    market: market?.draw,
    value: market?.draw ? (model?.draw ?? 0) / market.draw : undefined,
  },
  {
    label: `${match.awayName}胜`,
    odds: odds?.teamBWin,
    model: model?.teamBWin,
    market: market?.teamBWin,
    value: market?.teamBWin ? (model?.teamBWin ?? 0) / market.teamBWin : undefined,
  },
];

const scoreByLabel = (matrix: ScorePick[]) => new Map(matrix.map((pick) => [pick.label, pick]));

export function OddsDetailModal({ match, analysis, open, onClose }: OddsDetailModalProps) {
  const [scoreSortKey, setScoreSortKey] = useState<ScoreOddsSortKey>('probability');
  const [activeTag, setActiveTag] = useState<CorrectScoreTagKey | undefined>();
  const scoreMap = useMemo(() => scoreByLabel(analysis.matrix), [analysis.matrix]);
  const tagMap = useMemo(() => getCorrectScoreTagMap(analysis), [analysis]);
  const correctScores = useMemo(
    () =>
      [...(match.odds?.correctScores ?? [])].sort((a, b) => {
        const aPick = scoreMap.get(a.score);
        const bPick = scoreMap.get(b.score);
        if (scoreSortKey === 'odds') {
          return a.odds - b.odds;
        }

        if (scoreSortKey === 'value') {
          return (bPick?.valueIndex ?? -1) - (aPick?.valueIndex ?? -1);
        }

        if (scoreSortKey === 'tags') {
          const tagDiff = (tagMap.get(b.score)?.length ?? 0) - (tagMap.get(a.score)?.length ?? 0);
          if (tagDiff !== 0) {
            return tagDiff;
          }

          return (bPick?.probability ?? 0) - (aPick?.probability ?? 0);
        }

        return (bPick?.probability ?? 0) - (aPick?.probability ?? 0);
      }),
    [match.odds?.correctScores, scoreMap, scoreSortKey, tagMap],
  );

  if (!open) {
    return null;
  }

  const title = `${match.homeName} vs ${match.awayName}`;
  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleBackdropClick}>
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
                <h3>球队能力</h3>
                <strong>只读</strong>
              </div>
              <div className="odds-team-stats">
                {[
                  { name: match.homeName, stats: match.homeStats },
                  { name: match.awayName, stats: match.awayStats },
                ].map((team) => (
                  <div className="odds-team-stat-card" key={team.name}>
                    <strong>{team.name}</strong>
                    <div>
                      {statRows.map(([field, label]) => (
                        <span key={field}>{label} {team.stats[field] ?? 50}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

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
                    <span>价值</span>
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
                      <span>{formatValue(row.value)}</span>
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
              <div className="score-odds-sort segmented" aria-label="波胆赔率排序">
                <button type="button" aria-pressed={scoreSortKey === 'probability'} onClick={() => setScoreSortKey('probability')}>
                  模型排序
                </button>
                <button type="button" aria-pressed={scoreSortKey === 'odds'} onClick={() => setScoreSortKey('odds')}>
                  赔率排序
                </button>
                <button type="button" aria-pressed={scoreSortKey === 'value'} onClick={() => setScoreSortKey('value')}>
                  价值排序
                </button>
                <button type="button" aria-pressed={scoreSortKey === 'tags'} onClick={() => setScoreSortKey('tags')}>
                  标签推荐
                </button>
              </div>
              <div className="correct-score-tag-filter" aria-label="波胆标签高亮">
                {tagOptions.map((tagKey) => (
                  <button
                    className="correct-score-tag-filter-button"
                    data-tag={tagKey}
                    type="button"
                    aria-label={`波胆标签 ${CORRECT_SCORE_TAGS[tagKey].label}`}
                    aria-pressed={activeTag === tagKey}
                    key={tagKey}
                    onClick={() => setActiveTag((current) => (current === tagKey ? undefined : tagKey))}
                  >
                    {CORRECT_SCORE_TAGS[tagKey].label}
                  </button>
                ))}
              </div>
              {correctScores.length > 0 ? (
                <div className="score-odds-grid">
                  {correctScores.map((item) => {
                    const pick = scoreMap.get(item.score);
                    const tags = tagMap.get(item.score) ?? [];
                    const highlighted = activeTag !== undefined && tags.some((tag) => tag.key === activeTag);
                    const reason = pick ? getCorrectScoreReason(pick, tags) : '暂无模型解释';
                    return (
                      <div
                        className={`score-odds-row${highlighted ? ' tag-highlighted' : ''}`}
                        key={`${item.score}-${item.odds}`}
                      >
                        <strong>{item.score}</strong>
                        <span>赔 {formatOdds(item.odds)}</span>
                        <span>模型 {pick ? formatProbability(pick.probability) : '-'}</span>
                        <span>价值 {formatValue(pick?.valueIndex)}</span>
                        <span className="correct-score-reason">{reason}</span>
                        {tags.length > 0 ? (
                          <span className="correct-score-row-tags">
                            {tags.map((tag) => (
                              <em className="correct-score-tag" data-tag={tag.key} key={tag.key}>
                                {tag.label}
                              </em>
                            ))}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="odds-empty">当前比赛未导入波胆赔率。</p>
              )}
            </section>

            <section className="odds-detail-section">
              <div className="odds-detail-title">
                <h3>总进球数赔率</h3>
                <strong>{match.odds.totalGoals?.length ?? 0} 项</strong>
              </div>
              {match.odds.totalGoals && match.odds.totalGoals.length > 0 ? (
                <div className="total-goals-odds-grid">
                  {match.odds.totalGoals.map((item) => (
                    <div className="score-odds-row" key={`${item.goals}-${item.odds}`}>
                      <strong>{formatGoals(item.goals)}</strong>
                      <span>赔 {formatOdds(item.odds)}</span>
                      <span>{item.status === 'closed' ? '已关' : '开放'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="odds-empty">当前比赛未导入总进球数赔率。</p>
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

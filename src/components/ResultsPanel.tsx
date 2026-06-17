import { Check, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatProbability, STRATEGY_LABELS } from '../lib/combo';
import { formatEnabledMarkets } from '../lib/markets';
import type { ComboGroup, ComboPlanPick, DirectionMarket, MatchOverride } from '../types';

type ResultsPanelProps = {
  groups: ComboGroup[];
  selectedCount: number;
  comboType: number;
  enabledMarkets: DirectionMarket[];
  matchOverrides: Record<string, MatchOverride>;
};

const resolvePickMarkets = (
  pick: ComboPlanPick,
  enabledMarkets: DirectionMarket[],
  matchOverrides: Record<string, MatchOverride>,
) => matchOverrides[pick.matchId]?.enabledMarkets ?? enabledMarkets;

const formatPickMarkets = (
  pick: ComboPlanPick,
  enabledMarkets: DirectionMarket[],
  matchOverrides: Record<string, MatchOverride>,
) => formatEnabledMarkets(pick.score, pick.homeName, pick.awayName, resolvePickMarkets(pick, enabledMarkets, matchOverrides));

const formatPickText = (
  pick: ComboPlanPick,
  enabledMarkets: DirectionMarket[],
  matchOverrides: Record<string, MatchOverride>,
) => {
  const markets = formatPickMarkets(pick, enabledMarkets, matchOverrides);
  const details = [STRATEGY_LABELS[pick.strategyUsed], ...markets].join('｜');
  return `${pick.homeName}-${pick.awayName} ${pick.score.label}(${details})`;
};

const renderMarketTags = (
  pick: ComboPlanPick,
  enabledMarkets: DirectionMarket[],
  matchOverrides: Record<string, MatchOverride>,
) =>
  formatPickMarkets(pick, enabledMarkets, matchOverrides).map((market) => (
    <span className="market-tag" key={market}>
      {market}
    </span>
  ));

const formatCopyText = (
  groups: ComboGroup[],
  enabledMarkets: DirectionMarket[],
  matchOverrides: Record<string, MatchOverride>,
) =>
  groups
    .map((group, groupIndex) => {
      const title = `大组合 ${groupIndex + 1}: ${group.matches
        .map((match) => `${match.homeName}vs${match.awayName}`)
        .join(' / ')}`;
      const plans = group.plans
        .map(
          (plan, planIndex) =>
            `  方案${planIndex + 1} ${formatProbability(plan.jointProbability)}: ${plan.picks
              .map((pick) => formatPickText(pick, enabledMarkets, matchOverrides))
              .join('，')}`,
        )
        .join('\n');
      return `${title}\n${plans}`;
    })
    .join('\n\n');

export function ResultsPanel({ groups, selectedCount, comboType, enabledMarkets, matchOverrides }: ResultsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const visibleGroups = expanded ? groups : groups.slice(0, 3);
  const hiddenCount = Math.max(0, groups.length - 3);
  const copyText = useMemo(
    () => formatCopyText(groups, enabledMarkets, matchOverrides),
    [enabledMarkets, groups, matchOverrides],
  );

  const handleCopy = async () => {
    if (!copyText) {
      return;
    }

    await navigator.clipboard?.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  if (selectedCount < 2) {
    return (
      <section className="panel empty-state">
        <h2>至少选择 2 场比赛</h2>
        <p>把左侧比赛勾进池子后，这里会自动生成串关比分方案。</p>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="panel empty-state">
        <h2>暂无可用组合</h2>
        <p>当前串关方式超过了已选比赛数量，请调整串关类型。</p>
      </section>
    );
  }

  return (
    <section className="panel results-panel">
      <div className="panel-heading">
        <div>
          <p>推荐结果</p>
          <strong>
            {comboType}串1 · {groups.length} 组大组合
          </strong>
        </div>
        <button className="secondary-button" type="button" onClick={handleCopy}>
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? '已复制' : '复制文本'}
        </button>
      </div>

      <div className="group-list">
        {visibleGroups.map((group, groupIndex) => (
          <article className="combo-group" key={group.id}>
            <div className="combo-group-heading">
              <div>
                <h2>大组合 {groupIndex + 1}</h2>
                <p>{group.matches.map((match) => `${match.homeName} vs ${match.awayName}`).join(' / ')}</p>
              </div>
              <strong>{formatProbability(group.bestJointProbability)}</strong>
            </div>

            <h3>Top 5 比分方案</h3>
            <div className="plan-list">
              {group.plans.map((plan, planIndex) => (
                <div className="plan-row" key={plan.id}>
                  <div className="plan-row-heading">
                    <span className="plan-rank">方案 {planIndex + 1}</span>
                    <strong>{formatProbability(plan.jointProbability)}</strong>
                  </div>
                  <div className="pick-list" aria-label={`方案 ${planIndex + 1} 场次明细`}>
                    {plan.picks.map((pick) => (
                      <div className="pick-row" key={`${plan.id}:${pick.matchId}`}>
                        <div className="pick-match">
                          <span>{pick.homeName} vs {pick.awayName}</span>
                        </div>
                        <strong className="pick-score">{pick.score.label}</strong>
                        <div className="pick-tags">
                          <span className="strategy-tag">策略:{STRATEGY_LABELS[pick.strategyUsed]}</span>
                          {renderMarketTags(pick, enabledMarkets, matchOverrides)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      {hiddenCount > 0 ? (
        <button className="secondary-button expand-button" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? '收起更多组合' : `展开更多组合 (${hiddenCount})`}
        </button>
      ) : null}

      <p className="risk-note">结果仅供概率参考和组合整理，不构成投注建议，也不承诺命中。</p>
    </section>
  );
}

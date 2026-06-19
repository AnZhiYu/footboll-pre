import { Check, ChevronDown, ChevronRight, Copy, ArrowUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatProbability } from '../lib/combo';
import { formatEnabledMarkets } from '../lib/markets';
import {
  calculateSlipSummary,
  type ScoreBoardItem,
  type ScoreSortKey,
  type ScoreStrategyFilter,
  type SelectedSlipScores,
  type SlipLegMode,
  type SlipMatchSummary,
  filterAndSortScoreBoardItems,
  getSlipLegMetrics,
} from '../lib/scoreBoard';
import type { DirectionMarket, MatchOverride } from '../types';
import { MARKET_LABELS } from '../lib/markets';

type ResultsPanelProps = {
  items: ScoreBoardItem[];
  selectedCount: number;
  enabledMarkets: DirectionMarket[];
  matchOverrides: Record<string, MatchOverride>;
  slipMatchSummaries: SlipMatchSummary[];
  onToggleMarket: (market: DirectionMarket) => void;
  sortKey: ScoreSortKey;
  strategyFilter: ScoreStrategyFilter;
  oddsOnly: boolean;
  selectedScores: SelectedSlipScores;
  onSortKeyChange: (sortKey: ScoreSortKey) => void;
  onStrategyFilterChange: (strategy: ScoreStrategyFilter) => void;
  onOddsOnlyChange: (oddsOnly: boolean) => void;
  onSelectScore: (item: ScoreBoardItem) => void;
  onSlipLegModeChange: (itemId: string, mode: SlipLegMode) => void;
};

const sortOptions: Array<{ key: ScoreSortKey; label: string; requiresOdds?: boolean }> = [
  { key: 'probability', label: '模型' },
  { key: 'odds', label: '赔率', requiresOdds: true },
  { key: 'market', label: '盘口', requiresOdds: true },
  { key: 'value', label: '价值', requiresOdds: true },
];

const strategyOptions: Array<{ key: ScoreStrategyFilter; label: string }> = [
  { key: 'mainline', label: '主推' },
  { key: 'coverage', label: '备选' },
  { key: 'highScore', label: '大比分' },
  { key: 'upset', label: '冷门防守' },
  { key: 'value', label: '赔率价值' },
  { key: 'all', label: '全部' },
];
const marketOptions: DirectionMarket[] = ['winner', 'overUnder25', 'btts', 'totalGoals'];

const formatOptionalProbability = (value: number | undefined) => (value === undefined ? '-' : formatProbability(value));
const formatOptionalNumber = (value: number | undefined) => (value === undefined ? '-' : value.toFixed(2));
const formatSlipNumber = (value: number) => (value > 0 && Number.isFinite(value) ? value.toFixed(2) : '-');
const formatModeLabel = (mode: SlipLegMode) => {
  if (mode === 'winner') {
    return '胜平负';
  }

  if (mode === 'score') {
    return '比分';
  }

  if (mode === 'totalGoals') {
    return '进球数';
  }

  return '不计入';
};

const resolveMarkets = (
  item: ScoreBoardItem,
  enabledMarkets: DirectionMarket[],
  matchOverrides: Record<string, MatchOverride>,
) => matchOverrides[item.matchId]?.enabledMarkets ?? enabledMarkets;

const itemMarkets = (
  item: ScoreBoardItem,
  enabledMarkets: DirectionMarket[],
  matchOverrides: Record<string, MatchOverride>,
) => formatEnabledMarkets(item.score, item.homeName, item.awayName, resolveMarkets(item, enabledMarkets, matchOverrides));

const groupScoreBoardItems = (items: ScoreBoardItem[], orderedItems: ScoreBoardItem[]) => {
  const groups = new Map<string, { matchId: string; homeName: string; awayName: string; items: ScoreBoardItem[] }>();

  orderedItems.forEach((item) => {
    if (!groups.has(item.matchId)) {
      groups.set(item.matchId, {
        matchId: item.matchId,
        homeName: item.homeName,
        awayName: item.awayName,
        items: [],
      });
    }
  });

  items.forEach((item) => {
    const current = groups.get(item.matchId);
    if (current) {
      current.items.push(item);
    }
  });

  return Array.from(groups.values()).filter((group) => group.items.length > 0);
};

const formatSlipItem = (
  item: ScoreBoardItem,
  mode: SlipLegMode,
  enabledMarkets: DirectionMarket[],
  matchOverrides: Record<string, MatchOverride>,
  showOddsMetrics: boolean,
  slipMatchSummaries: SlipMatchSummary[],
) => {
  const legMetrics = getSlipLegMetrics(item, mode, slipMatchSummaries);
  const details = [
    `方式:${formatModeLabel(mode)}`,
    `模型${formatProbability(item.score.probability)}`,
    showOddsMetrics && item.score.odds ? `赔${item.score.odds.toFixed(2)}` : null,
    showOddsMetrics && item.score.normalizedImpliedProbability
      ? `盘口${formatProbability(item.score.normalizedImpliedProbability)}`
      : null,
    showOddsMetrics && item.score.valueIndex ? `价值${item.score.valueIndex.toFixed(2)}` : null,
    `计赔${formatSlipNumber(legMetrics.odds ?? 0)}${legMetrics.estimated ? '(估)' : ''}`,
    `计概${formatProbability(legMetrics.probability)}`,
    ...itemMarkets(item, enabledMarkets, matchOverrides),
  ].filter(Boolean);

  return `${item.homeName} vs ${item.awayName} ${item.score.label}｜${details.join('｜')}`;
};

export function ResultsPanel({
  items,
  selectedCount,
  enabledMarkets,
  matchOverrides,
  slipMatchSummaries,
  onToggleMarket,
  sortKey,
  strategyFilter,
  oddsOnly,
  selectedScores,
  onSortKeyChange,
  onStrategyFilterChange,
  onOddsOnlyChange,
  onSelectScore,
  onSlipLegModeChange,
}: ResultsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openMatchIds, setOpenMatchIds] = useState<Set<string>>(new Set());
  const [initializedOpenMatch, setInitializedOpenMatch] = useState(false);
  const hasOdds = items.some((item) => Boolean(item.score.odds));
  const showOddsMetrics = hasOdds;
  const effectiveSortKey = hasOdds ? sortKey : 'probability';
  const visibleItems = useMemo(
    () =>
      filterAndSortScoreBoardItems(items, {
        oddsOnly,
        strategy: strategyFilter,
        sortKey: effectiveSortKey,
      }),
    [effectiveSortKey, items, oddsOnly, strategyFilter],
  );
  const selectedItems = useMemo(
    () =>
      Object.entries(selectedScores)
        .map(([itemId, selection]) => {
          const item = items.find((candidate) => candidate.id === itemId);
          return item ? { item, mode: selection.mode } : null;
        })
        .filter((entry): entry is { item: ScoreBoardItem; mode: SlipLegMode } => Boolean(entry)),
    [items, selectedScores],
  );
  const groupedItems = useMemo(() => groupScoreBoardItems(visibleItems, items), [items, visibleItems]);
  const groupSignature = groupedItems.map((group) => group.matchId).join('|');
  const selectedCountsByMatch = useMemo(
    () =>
      selectedItems.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.item.matchId] = (counts[entry.item.matchId] ?? 0) + 1;
        return counts;
      }, {}),
    [selectedItems],
  );
  const slipSummary = useMemo(
    () => calculateSlipSummary(selectedItems, slipMatchSummaries),
    [selectedItems, slipMatchSummaries],
  );
  const activeSlipCount = selectedItems.filter((entry) => entry.mode !== undefined).length;
  useEffect(() => {
    if (groupedItems.length === 0) {
      return;
    }

    setOpenMatchIds((current) => {
      const hasCurrentOpenGroup = groupedItems.some((group) => current.has(group.matchId));
      if (initializedOpenMatch && hasCurrentOpenGroup) {
        return current;
      }

      return new Set([groupedItems[0].matchId]);
    });
    setInitializedOpenMatch(true);
  }, [groupSignature, groupedItems, initializedOpenMatch]);
  const copyText =
    selectedItems.length === 0
      ? '待串清单为空'
      : selectedItems
        .map((entry) =>
          formatSlipItem(entry.item, entry.mode, enabledMarkets, matchOverrides, showOddsMetrics, slipMatchSummaries),
        )
        .join('\n');

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  const scrollToTop = () => {
    document.querySelector('.left-column')?.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector('.right-column')?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggleMatchGroup = (matchId: string) => {
    setOpenMatchIds((current) => {
      const next = new Set(current);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  };

  if (selectedCount < 1) {
    return (
      <section className="panel empty-state">
        <h2>至少选择 1 场比赛</h2>
        <p>勾选比赛后，这里会展示可选比分池。</p>
      </section>
    );
  }

  return (
    <section className="panel results-panel mobile-readonly-results" aria-label="比分池工作台">
      <div className="panel-heading">
        <div>
          <p>推荐结果</p>
          <strong>
            比分池 · {visibleItems.length} 项
          </strong>
        </div>
        <div className="results-heading-actions">
          <button className="secondary-button" type="button" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <ChevronRight size={17} /> : <ChevronDown size={17} />}
            {collapsed ? '展开推荐结果' : '收起推荐结果'}
          </button>
          <button className="secondary-button back-to-top-button" type="button" onClick={scrollToTop}>
            <ArrowUp size={17} />
            返回顶部
          </button>
          <button className="secondary-button" type="button" onClick={handleCopy}>
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied ? '已复制' : '复制文本'}
          </button>
        </div>
      </div>

      {collapsed ? (
        <p className="hint">推荐结果已收起。</p>
      ) : (
        <>

      <div className="score-board-toolbar">
        <div className="control-group">
          <span className="control-label">附加方向项</span>
          <div className="market-options">
            {marketOptions.map((market) => (
              <label className="market-option" key={market}>
                <input
                  type="checkbox"
                  checked={enabledMarkets.includes(market)}
                  onChange={() => onToggleMarket(market)}
                />
                {MARKET_LABELS[market]}
              </label>
            ))}
          </div>
        </div>
        <div className="control-group">
          <span className="control-label">排序</span>
          <div className="segmented">
            {sortOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={effectiveSortKey === option.key}
                disabled={option.requiresOdds && !hasOdds}
                onClick={() => onSortKeyChange(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <span className="control-label">策略筛选</span>
          <div className="segmented">
            {strategyOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-label={`策略筛选 ${option.label}`}
                aria-pressed={strategyFilter === option.key}
                onClick={() => onStrategyFilterChange(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <label className="market-option">
          <input
            type="checkbox"
            checked={hasOdds && oddsOnly}
            disabled={!hasOdds}
            onChange={(event) => onOddsOnlyChange(event.target.checked)}
          />
          只看有赔率
        </label>
      </div>

      <div className="score-board-list" aria-label="比分池列表">
        {groupedItems.map((group) => {
          const title = `${group.homeName} vs ${group.awayName}`;
          const open = openMatchIds.has(group.matchId);
          const selectedCountForMatch = selectedCountsByMatch[group.matchId] ?? 0;
          const groupHasOdds = group.items.some((item) => Boolean(item.score.odds));

          return (
            <section className="score-match-group" aria-label={`${title} 比分组`} key={group.matchId}>
              <button
                className="score-match-toggle"
                type="button"
                aria-expanded={open}
                aria-label={`${open ? '收起' : '展开'} ${title}`}
                onClick={() => toggleMatchGroup(group.matchId)}
              >
                {open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                <span className="score-match-title">
                  <strong>{title}</strong>
                  <small>{group.items.length} 个比分{groupHasOdds ? ' · 有赔率' : ''}</small>
                </span>
                {selectedCountForMatch > 0 ? (
                  <span className="score-match-summary">已选 {selectedCountForMatch} 个</span>
                ) : null}
              </button>

              {open ? (
                <div className="score-match-items">
                  {group.items.map((item) => {
                    const selected = Boolean(selectedScores[item.id]);
                    const markets = itemMarkets(item, enabledMarkets, matchOverrides);
                    return (
                      <article
                        className="score-board-row"
                        aria-label={`${item.homeName} vs ${item.awayName} ${item.score.label} 比分选项`}
                        key={item.id}
                      >
                        <button
                          className="secondary-button score-select-button mobile-hidden-control"
                          type="button"
                          aria-pressed={selected}
                          aria-label={`选择 ${item.homeName} vs ${item.awayName} ${item.score.label}`}
                          onClick={() => onSelectScore(item)}
                        >
                          {selected ? '已选' : '选'}
                        </button>
                        <div className="score-board-match">
                          <strong>{item.homeName} vs {item.awayName}</strong>
                          <span>{item.strategyLabels.join(' / ')}</span>
                        </div>
                        <strong className="pick-score">{item.score.label}</strong>
                        <div className="score-board-metrics">
                          <span>模型 {formatProbability(item.score.probability)}</span>
                          {showOddsMetrics ? (
                            <>
                              <span>赔 {formatOptionalNumber(item.score.odds)}</span>
                              <span>盘口 {formatOptionalProbability(item.score.normalizedImpliedProbability)}</span>
                              <span>价值 {formatOptionalNumber(item.score.valueIndex)}</span>
                            </>
                          ) : null}
                        </div>
                        <div className="pick-tags">
                          {markets.map((market) => (
                            <span className="market-tag" key={market}>{market}</span>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <section className="slip-panel mobile-hidden-control" aria-label="待串清单">
        <div className="slip-heading">
          <strong>待串清单</strong>
          <span>
            已选 {selectedItems.length} 项 · 计入 {activeSlipCount} 项 · 总赔率 {formatSlipNumber(slipSummary.totalOdds)} · 总概率 {formatProbability(slipSummary.totalProbability)}
          </span>
        </div>
        {selectedItems.length > 0 ? (
          <div className="slip-list">
            {selectedItems.map(({ item, mode }) => {
              const metrics = getSlipLegMetrics(item, mode, slipMatchSummaries);
              const markets = itemMarkets(item, enabledMarkets, matchOverrides);
              return (
                <div className="slip-row" key={item.id}>
                  <div className="slip-main">
                    <span>{item.homeName} vs {item.awayName}</span>
                    <strong>{item.score.label}</strong>
                  </div>
                  <div className="slip-mode-toggle segmented" aria-label={`${item.homeName} vs ${item.awayName} ${item.score.label} 计算方式`}>
                    <button
                      type="button"
                      aria-pressed={mode === undefined}
                      onClick={() => onSlipLegModeChange(item.id, undefined)}
                    >
                      不选
                    </button>
                    <button
                      type="button"
                      aria-pressed={mode === 'score'}
                      onClick={() => onSlipLegModeChange(item.id, 'score')}
                    >
                      比分
                    </button>
                    <button
                      type="button"
                      aria-pressed={mode === 'winner'}
                      onClick={() => onSlipLegModeChange(item.id, 'winner')}
                    >
                      胜平负
                    </button>
                    <button
                      type="button"
                      aria-pressed={mode === 'totalGoals'}
                      onClick={() => onSlipLegModeChange(item.id, 'totalGoals')}
                    >
                      进球数
                    </button>
                  </div>
                  <div className="slip-metrics">
                    <span>模型 {formatProbability(item.score.probability)}</span>
                    {showOddsMetrics ? (
                      <>
                        <span>赔 {formatOptionalNumber(item.score.odds)}</span>
                        <span>盘口 {formatOptionalProbability(item.score.normalizedImpliedProbability)}</span>
                        <span>价值 {formatOptionalNumber(item.score.valueIndex)}</span>
                      </>
                    ) : null}
                    <span>计赔 {formatSlipNumber(metrics.odds ?? 0)}{metrics.estimated ? ' 估' : ''}</span>
                    <span>计概 {formatProbability(metrics.probability)}</span>
                  </div>
                  {markets.length > 0 ? (
                    <div className="pick-tags slip-tags">
                      {markets.map((market) => (
                        <span className="market-tag" key={market}>{market}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="hint">点击比分加入清单；同一场可以选择多个比分。</p>
        )}
      </section>

      <p className="risk-note">结果仅供概率参考和组合整理，不构成投注建议，也不承诺命中。</p>
        </>
      )}
    </section>
  );
}

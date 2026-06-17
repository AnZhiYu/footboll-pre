import { ChevronDown, ChevronUp, Dice5, Flame, Goal, RefreshCcw, Shuffle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { MARKET_LABELS } from '../lib/markets';
import { STRATEGY_LABELS } from '../lib/combo';
import type { BaseComboStrategy, ComboStrategy, DirectionMarket, MatchAnalysis, MatchOverride } from '../types';

type ControlPanelProps = {
  selectedCount: number;
  comboType: number;
  strategy: ComboStrategy;
  onComboTypeChange: (comboType: number) => void;
  onStrategyChange: (strategy: ComboStrategy) => void;
  onRefreshRandom: () => void;
  enabledMarkets: DirectionMarket[];
  onToggleMarket: (market: DirectionMarket) => void;
  selectedAnalyses: MatchAnalysis[];
  matchOverrides: Record<string, MatchOverride>;
  onMatchStrategyOverride: (matchId: string, strategy?: BaseComboStrategy) => void;
  onMatchMarketsOverride: (matchId: string, markets?: DirectionMarket[]) => void;
};

const strategyOptions: Array<{ value: ComboStrategy; label: string; icon: typeof Shuffle }> = [
  { value: 'mixed', label: '混合串', icon: Flame },
  { value: 'coverage', label: '覆盖串', icon: Shuffle },
  { value: 'highScore', label: '大比分串', icon: Flame },
  { value: 'upset', label: '防冷串', icon: Sparkles },
  { value: 'mainline', label: '主线串', icon: Goal },
  { value: 'random', label: '策略随机', icon: Dice5 },
];

const marketOptions: DirectionMarket[] = ['winner', 'overUnder25', 'btts', 'totalGoals'];
const overrideStrategies: BaseComboStrategy[] = ['mixed', 'coverage', 'highScore', 'upset', 'mainline'];

export function ControlPanel({
  selectedCount,
  comboType,
  strategy,
  onComboTypeChange,
  onStrategyChange,
  onRefreshRandom,
  enabledMarkets,
  onToggleMarket,
  selectedAnalyses,
  matchOverrides,
  onMatchStrategyOverride,
  onMatchMarketsOverride,
}: ControlPanelProps) {
  const [overridesOpen, setOverridesOpen] = useState(false);
  const comboOptions = Array.from({ length: Math.max(0, selectedCount - 1) }, (_, index) => index + 2);

  return (
    <section className="panel control-panel">
      <div className="panel-heading">
        <p>策略控制台</p>
        <strong>{selectedCount} 场已选</strong>
      </div>

      <div className="control-group">
        <span className="control-label">串关方式</span>
        <div className="segmented">
          {comboOptions.length > 0 ? (
            comboOptions.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={comboType === option}
                onClick={() => onComboTypeChange(option)}
              >
                {option}串1
              </button>
            ))
          ) : (
            <span className="hint">至少选择 2 场比赛</span>
          )}
        </div>
      </div>

      <div className="control-group">
        <span className="control-label">推荐策略</span>
        <div className="segmented">
          {strategyOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={strategy === option.value}
                onClick={() => onStrategyChange(option.value)}
              >
                <Icon size={16} />
                {option.label}
              </button>
            );
          })}
        </div>
        {strategy === 'random' ? (
          <button className="secondary-button refresh-random-button" type="button" onClick={onRefreshRandom}>
            <RefreshCcw size={16} />
            刷新随机
          </button>
        ) : null}
      </div>

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

      {selectedAnalyses.length > 0 ? (
        <div className="control-group single-match-overrides">
          <button
            className="override-toggle"
            type="button"
            aria-label={overridesOpen ? '收起单场覆盖设置' : '展开单场覆盖设置'}
            aria-expanded={overridesOpen}
            onClick={() => setOverridesOpen((value) => !value)}
          >
            <span>
              单场覆盖设置
              <strong>{selectedAnalyses.length} 场</strong>
            </span>
            {overridesOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
          {overridesOpen ? (
            <div className="override-list">
              {selectedAnalyses.map((analysis) => {
                const title = `${analysis.homeName} vs ${analysis.awayName}`;
                const override = matchOverrides[analysis.matchId];
                const marketMode = override?.enabledMarkets ? 'custom' : 'global';
                const activeMarkets = override?.enabledMarkets ?? [];

                return (
                  <div className="override-row" key={analysis.matchId}>
                    <strong>{title}</strong>
                    <label>
                      策略
                      <select
                        aria-label={`${title} 策略覆盖`}
                        value={override?.strategy ?? 'global'}
                        onChange={(event) =>
                          onMatchStrategyOverride(
                            analysis.matchId,
                            event.target.value === 'global' ? undefined : (event.target.value as BaseComboStrategy),
                          )
                        }
                      >
                        <option value="global">跟随全局</option>
                        {overrideStrategies.map((option) => (
                          <option key={option} value={option}>
                            {STRATEGY_LABELS[option]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      方向
                      <select
                        aria-label={`${title} 方向覆盖`}
                        value={marketMode}
                        onChange={(event) =>
                          onMatchMarketsOverride(
                            analysis.matchId,
                            event.target.value === 'custom' ? enabledMarkets : undefined,
                          )
                        }
                      >
                        <option value="global">跟随全局</option>
                        <option value="custom">自定义</option>
                      </select>
                    </label>
                    {marketMode === 'custom' ? (
                      <div className="override-market-options">
                        {marketOptions.map((market) => (
                          <label className="market-option compact" key={market}>
                            <input
                              type="checkbox"
                              checked={activeMarkets.includes(market)}
                              aria-label={`${title} ${MARKET_LABELS[market]}`}
                              onChange={() => {
                                const nextMarkets = activeMarkets.includes(market)
                                  ? activeMarkets.filter((item) => item !== market)
                                  : [...activeMarkets, market];
                                onMatchMarketsOverride(analysis.matchId, nextMarkets);
                              }}
                            />
                            {MARKET_LABELS[market]}
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

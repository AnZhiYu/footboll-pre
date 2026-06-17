import { Dice5, Flame, Goal, RefreshCcw, Shuffle, Sparkles } from 'lucide-react';
import type { ComboStrategy } from '../types';

type ControlPanelProps = {
  selectedCount: number;
  comboType: number;
  strategy: ComboStrategy;
  onComboTypeChange: (comboType: number) => void;
  onStrategyChange: (strategy: ComboStrategy) => void;
  onRefreshRandom: () => void;
};

const strategyOptions: Array<{ value: ComboStrategy; label: string; icon: typeof Shuffle }> = [
  { value: 'balanced', label: '平衡', icon: Shuffle },
  { value: 'underdog', label: '博冷', icon: Sparkles },
  { value: 'goals', label: '大小球倾向', icon: Goal },
  { value: 'highScore', label: '大比分激进', icon: Flame },
  { value: 'random', label: '策略随机', icon: Dice5 },
];

export function ControlPanel({
  selectedCount,
  comboType,
  strategy,
  onComboTypeChange,
  onStrategyChange,
  onRefreshRandom,
}: ControlPanelProps) {
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
    </section>
  );
}

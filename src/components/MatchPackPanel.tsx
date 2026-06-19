import type { MatchPack } from '../types';

type MatchPackPanelProps = {
  packs: MatchPack[];
  currentPackId?: string;
  onSelectPack: (pack: MatchPack) => void;
};

export function MatchPackPanel({ packs, currentPackId, onSelectPack }: MatchPackPanelProps) {
  const selectedValue = currentPackId ?? 'custom';

  const selectPack = (packId: string) => {
    if (packId === 'custom' || packId === selectedValue) {
      return;
    }

    const pack = packs.find((item) => item.id === packId);
    if (!pack) {
      return;
    }

    const confirmed = window.confirm(`切换到「${pack.label}」会替换当前比赛池、球队能力、赔率数据和待串清单。确定切换吗？`);
    if (confirmed) {
      onSelectPack(pack);
    }
  };

  return (
    <section className="panel match-pack-panel">
      <div className="panel-heading">
        <div>
          <p>比赛数据包</p>
          <strong>能力 + 独赢 + 波胆</strong>
        </div>
      </div>

      <label className="match-pack-select-label">
        选择比赛数据包
        <select
          aria-label="选择比赛数据包"
          value={selectedValue}
          onChange={(event) => selectPack(event.target.value)}
        >
          <option value="custom">自定义当前表格</option>
          {packs.map((pack) => (
            <option value={pack.id} key={pack.id}>
              {pack.label} · {pack.matches.length} 场
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

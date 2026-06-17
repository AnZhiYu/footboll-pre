import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './lib/storage';

const addMatch = async (user: ReturnType<typeof userEvent.setup>, home: string, away: string) => {
  await user.clear(screen.getByLabelText('球队A名称'));
  await user.type(screen.getByLabelText('球队A名称'), home);
  await user.clear(screen.getByLabelText('球队B名称'));
  await user.type(screen.getByLabelText('球队B名称'), away);
  await user.click(screen.getByRole('button', { name: /新增赛事/ }));
};

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds matches to the empty pool', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');

    expect(screen.getByText('英格兰 vs 美国')).toBeInTheDocument();
    expect(screen.getByLabelText('选择 英格兰 vs 美国')).toBeChecked();
  });

  it('copies the match pairing when the pairing name is clicked', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextSpy,
      },
    });
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await user.click(screen.getByRole('button', { name: '复制对局 英格兰 vs 美国' }));

    expect(writeTextSpy).toHaveBeenCalledWith('英格兰 vs 美国');
    expect(screen.getByText('已复制')).toBeInTheDocument();
  });

  it('shows 5x1 and generates a plan when five matches are selected', async () => {
    const user = userEvent.setup();
    render(<App />);

    for (let index = 1; index <= 5; index += 1) {
      await addMatch(user, `球队A${index}`, `球队B${index}`);
    }

    await user.click(screen.getByRole('button', { name: '5串1' }));

    expect(screen.getByRole('button', { name: '5串1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/大组合 1/)).toBeInTheDocument();
    expect(screen.getByText(/Top 5 比分方案/)).toBeInTheDocument();
  });

  it('shows layered combo strategy controls and can refresh random picks', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await addMatch(user, '巴西', '墨西哥');

    expect(screen.queryByRole('button', { name: '最稳' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '覆盖串' }));
    expect(screen.getByRole('button', { name: '覆盖串' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/大组合 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '主线串' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '防冷串' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '混合串' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '大比分串' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '策略随机' }));
    expect(screen.getByRole('button', { name: '刷新随机' })).toBeInTheDocument();
    expect(screen.getAllByText(/策略:/).length).toBeGreaterThan(0);

    const before = screen.getAllByText(/策略:/).map((node) => node.textContent).join('|');
    await user.click(screen.getByRole('button', { name: '刷新随机' }));
    const after = screen.getAllByText(/策略:/).map((node) => node.textContent).join('|');

    expect(after).not.toEqual(before);
  });

  it('adds selected direction markets to results and copy text without changing probabilities', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextSpy,
      },
    });
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await addMatch(user, '巴西', '墨西哥');

    const probabilityBefore = screen.getAllByText(/\d+\.\d{2}%/)[0].textContent;
    expect(screen.queryByText(/胜平负:/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('胜平负方向'));
    await user.click(screen.getByLabelText('2.5 大小球'));
    await user.click(screen.getByLabelText('BTTS 双方进球'));
    await user.click(screen.getByLabelText('进球数'));

    expect(screen.getAllByText(/胜平负:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2.5:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BTTS:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/进球数:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\d+\.\d{2}%/)[0]).toHaveTextContent(probabilityBefore ?? '');

    await user.click(screen.getByRole('button', { name: '复制文本' }));

    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('胜平负:'));
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('2.5:'));
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('BTTS:'));
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('进球数:'));
  });

  it('allows a selected match to override strategy and direction markets', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await addMatch(user, '巴西', '墨西哥');

    expect(screen.getByText('单场覆盖设置')).toBeInTheDocument();
    expect(screen.queryByLabelText('英格兰 vs 美国 策略覆盖')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '展开单场覆盖设置' }));
    await user.selectOptions(screen.getByLabelText('英格兰 vs 美国 策略覆盖'), 'highScore');
    await user.selectOptions(screen.getByLabelText('英格兰 vs 美国 方向覆盖'), 'custom');
    await user.click(screen.getByLabelText('英格兰 vs 美国 进球数'));

    expect(screen.getAllByText('策略:大比分串').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/进球数:/).length).toBeGreaterThan(0);
  });

  it('separates every match pick into readable rows inside each plan', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await addMatch(user, '巴西', '墨西哥');
    await user.click(screen.getByLabelText('胜平负方向'));

    expect(screen.getAllByLabelText(/方案 \d+ 场次明细/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('英格兰 vs 美国').length).toBeGreaterThan(0);
    expect(screen.getAllByText('巴西 vs 墨西哥').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/策略:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/胜平负:/).length).toBeGreaterThan(0);
  });

  it('orders strategy buttons by recent backtest hit rate', async () => {
    render(<App />);

    const strategyButtons = ['混合串', '覆盖串', '大比分串', '防冷串', '主线串', '策略随机'].map((name) =>
      screen.getByRole('button', { name }),
    );

    strategyButtons.slice(0, -1).forEach((button, index) => {
      expect(Boolean(button.compareDocumentPosition(strategyButtons[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING))
        .toBe(true);
    });
  });

  it('shows score layers on collapsed match cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');

    expect(screen.getByText('主线')).toBeInTheDocument();
    expect(screen.getByText('覆盖')).toBeInTheDocument();
    expect(screen.getByText('防冷')).toBeInTheDocument();
    expect(screen.getByText('大比分信号')).toBeInTheDocument();
  });

  it('removes deleted matches from selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '巴西', '墨西哥');
    await user.click(screen.getByRole('button', { name: '删除 巴西 vs 墨西哥' }));

    expect(screen.queryByText('巴西 vs 墨西哥')).not.toBeInTheDocument();
    expect(screen.getAllByText(/至少选择 2 场比赛/).length).toBeGreaterThan(0);
  });

  it('imports team profiles, updates duplicates, and prefers imported teams first', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.clear(screen.getByLabelText('球队数据 JSON'));
    await user.click(screen.getByLabelText('球队数据 JSON'));
    await user.paste(
      `[
        {"team":"奥地利","attack":76,"defense":74,"stability":78},
        {"team":"约旦","attack":58,"defense":60,"stability":63}
      ]`,
    );
    await user.click(screen.getByRole('button', { name: '确认导入' }));

    let teamButtons = screen.getAllByRole('button', { name: /使用球队/ });
    expect(teamButtons[0]).toHaveAccessibleName('使用球队 奥地利');
    expect(teamButtons[1]).toHaveAccessibleName('使用球队 约旦');

    await user.click(screen.getByRole('button', { name: '使用球队 奥地利' }));
    expect(screen.getByLabelText('球队A名称')).toHaveValue('奥地利');

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.clear(screen.getByLabelText('球队数据 JSON'));
    await user.click(screen.getByLabelText('球队数据 JSON'));
    await user.paste('[{"team":"约旦","attack":66,"defense":67,"stability":68}]');
    await user.click(screen.getByRole('button', { name: '确认导入' }));

    teamButtons = screen.getAllByRole('button', { name: /使用球队/ });
    expect(teamButtons[0]).toHaveAccessibleName('使用球队 约旦');
    expect(screen.getByText('攻 66 / 防 67 / 稳 68 / 节 50')).toBeInTheDocument();
  });

  it('copies the AI scoring prompt from the import panel', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextSpy,
      },
    });
    render(<App />);

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.click(screen.getByRole('button', { name: '复制AI评分提示词' }));

    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('"attack"'));
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('"defense"'));
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('"stability"'));
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('"pace"'));
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('二维数组'));
    expect(screen.getByText(/AI评分提示词已复制/)).toBeInTheDocument();
  });

  it('imports nested match pair data directly into the match pool', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.clear(screen.getByLabelText('球队数据 JSON'));
    await user.click(screen.getByLabelText('球队数据 JSON'));
    await user.paste(`[
      [
        {"team":"葡萄牙","attack":84,"defense":78,"stability":76,"pace":75},
        {"team":"刚果民主共和国","attack":48,"defense":55,"stability":58,"pace":38}
      ],
      [
        {"team":"英格兰","attack":83,"defense":79,"stability":72,"pace":70},
        {"team":"克罗地亚","attack":72,"defense":82,"stability":88,"pace":45}
      ]
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入' }));

    expect(screen.getByText('葡萄牙 vs 刚果民主共和国')).toBeInTheDocument();
    expect(screen.getByText('英格兰 vs 克罗地亚')).toBeInTheDocument();
    expect(screen.getByText(/已导入 2 场比赛/)).toBeInTheDocument();
    expect(screen.getByLabelText('葡萄牙 vs 刚果民主共和国 指标解读')).toHaveTextContent('节奏 1.0');
  });

  it('shows metric insights on collapsed match cards and opens the global guide modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '克罗地亚');

    const metricRegion = screen.getByLabelText('英格兰 vs 克罗地亚 指标解读');
    expect(metricRegion).toHaveTextContent('xG');
    expect(metricRegion).toHaveTextContent('节奏');
    expect(metricRegion).toHaveTextContent('Top1');
    expect(screen.getByText(/本场/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '展开赛事' }));
    expect(screen.getByLabelText('球队A进攻')).toBeInTheDocument();
    expect(screen.getByLabelText('球队A节奏')).toBeInTheDocument();
    expect(document.querySelector('.analysis-strip')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看指标说明' }));
    expect(screen.getByRole('dialog', { name: '指标说明' })).toBeInTheDocument();
    expect(screen.getByText('单队预期进球 xG')).toBeInTheDocument();
    expect(screen.getByText('比赛节奏 PaceFactor')).toBeInTheDocument();
    expect(screen.getByText('Top1 精准比分置信度')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭指标说明' }));
    expect(screen.queryByRole('dialog', { name: '指标说明' })).not.toBeInTheDocument();
  });

  it('does not crash when old localStorage state has no version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ matchPool: [{ id: 'old' }] }));

    render(<App />);

    expect(screen.getByText('比赛池为空')).toBeInTheDocument();
  });
});

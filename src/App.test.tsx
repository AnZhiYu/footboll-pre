import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App, { APP_VERSION, buildCacheBustedUrl } from './App';
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
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('shows the product title and owner contact information', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: '世界杯预测-AI模型与盘口赔率对比工具',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '使用说明' })).toHaveAttribute('href', '#/guide');
    expect(screen.getByText('wechat: grey1896')).toBeInTheDocument();
    expect(screen.getByText(/本工具仅用于赛前数据整理、模型复盘与盘口赔率对比/)).toBeInTheDocument();
    expect(screen.getByText(/请理性看待概率结果，远离赌博风险/)).toBeInTheDocument();
    expect(screen.getByText(`版本: ${APP_VERSION}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '强制刷新' })).toBeInTheDocument();
  });

  it('opens a guide page that explains usage, strategies, model rules, and odds comparison', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: '使用说明' }));

    expect(screen.getByRole('heading', { name: '使用说明' })).toBeInTheDocument();
    expect(screen.getByText('使用方法')).toBeInTheDocument();
    expect(screen.getByText('策略说明')).toBeInTheDocument();
    expect(screen.getByText('模型规则')).toBeInTheDocument();
    expect(screen.getByText('盘口赔率对比')).toBeInTheDocument();
    expect(screen.getByText('世界杯前序比赛回测')).toBeInTheDocument();
    expect(screen.getByText(/样本：26 场已完赛对局/)).toBeInTheDocument();
    expect(screen.getAllByText('16/26').length).toBeGreaterThan(0);
    expect(screen.getAllByText('61.5%').length).toBeGreaterThan(0);
    expect(screen.getByText('Top7')).toBeInTheDocument();
    expect(screen.getByText('胜平负方向')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '返回预测工具' }));

    expect(screen.getByRole('heading', { name: '世界杯预测-AI模型与盘口赔率对比工具' })).toBeInTheDocument();
  });

  it('builds a cache-busted url for WeChat webview refreshes', () => {
    expect(buildCacheBustedUrl('https://example.com/footboll-pre/?v=old#today', 2026061901)).toBe(
      'https://example.com/footboll-pre/?v=2026061901#today',
    );
    expect(buildCacheBustedUrl('https://example.com/footboll-pre/', 2026061902)).toBe(
      'https://example.com/footboll-pre/?v=2026061902',
    );
  });

  it('adds matches to the empty pool', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');

    expect(screen.getAllByText('英格兰 vs 美国').length).toBeGreaterThan(0);
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

  it('shows a score board instead of generated combo plans when five matches are selected', async () => {
    const user = userEvent.setup();
    render(<App />);

    for (let index = 1; index <= 5; index += 1) {
      await addMatch(user, `球队A${index}`, `球队B${index}`);
    }

    expect(screen.getByLabelText('比分池工作台')).toHaveTextContent('比分池');
    expect(screen.queryByRole('button', { name: '5串1' })).not.toBeInTheDocument();
    expect(screen.queryByText(/大组合 1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Top 7 比分方案/)).not.toBeInTheDocument();
  });

  it('removes old combo controls and keeps direction markets in the results panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await addMatch(user, '巴西', '墨西哥');

    expect(screen.queryByRole('button', { name: '最稳' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('比分池工作台')).toHaveTextContent('比分池');
    expect(screen.queryByText('串关方式')).not.toBeInTheDocument();
    expect(screen.queryByText('推荐策略')).not.toBeInTheDocument();
    expect(screen.queryByText('单场覆盖设置')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2串1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '主推串' })).not.toBeInTheDocument();

    const resultsPanel = screen.getByLabelText('比分池工作台');
    expect(within(resultsPanel).getByLabelText('胜平负方向')).toBeInTheDocument();
    expect(within(resultsPanel).getByLabelText('2.5 大小球')).toBeInTheDocument();
  });

  it('uses a single-column workspace and allows collapsing recommended results', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');

    expect(screen.getByLabelText('预测工具工作台')).toHaveClass('single-column-workspace');
    expect(screen.queryByLabelText('右侧推荐结果栏')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '收起推荐结果' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '收起推荐结果' }));

    expect(screen.getByRole('button', { name: '展开推荐结果' })).toBeInTheDocument();
    expect(screen.queryByLabelText('比分池列表')).not.toBeInTheDocument();
  });

  it('marks manual import workbench panels as desktop-only for mobile', () => {
    render(<App />);

    expect(screen.getByLabelText('手动录入工作台')).toHaveClass('desktop-workbench-panel');
    expect(screen.getByLabelText('球队导入工作台')).toHaveClass('desktop-workbench-panel');
    expect(screen.getByLabelText('赔率导入工作台')).toHaveClass('desktop-workbench-panel');
    expect(screen.getByLabelText('比赛数据包工作台')).toBeInTheDocument();
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

    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('待串清单为空'));
  });

  it('does not show single-match override controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await addMatch(user, '巴西', '墨西哥');

    expect(screen.queryByText('单场覆盖设置')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('英格兰 vs 美国 策略覆盖')).not.toBeInTheDocument();
    expect(screen.getByLabelText('比分池工作台')).toHaveTextContent('比分池');
  });

  it('selects multiple scores from one match into a readable slip', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await addMatch(user, '巴西', '墨西哥');
    await user.click(screen.getByLabelText('胜平负方向'));

    await user.click(screen.getAllByRole('button', { name: /选择 英格兰 vs 美国/ })[0]);
    expect(screen.getByLabelText('待串清单')).toHaveTextContent('已选 1 项');
    expect(screen.getByLabelText('待串清单')).toHaveTextContent('英格兰 vs 美国');

    await user.click(screen.getAllByRole('button', { name: /选择 英格兰 vs 美国/ })[1]);
    expect(screen.getByLabelText('待串清单')).toHaveTextContent('已选 2 项');
    expect(screen.getByLabelText('待串清单')).toHaveTextContent('计入 0 项');
    expect(screen.getByLabelText('待串清单').querySelectorAll('.slip-row')).toHaveLength(2);
    expect(screen.getByLabelText('待串清单')).toHaveTextContent('计赔');
    expect(screen.getByLabelText('待串清单')).toHaveTextContent('计概');
    expect(screen.getAllByRole('button', { name: '进球数' }).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: '进球数' })[0]);
    expect(screen.getByLabelText('待串清单')).toHaveTextContent('计入 1 项');
  });

  it('keeps desktop score selection but marks it as mobile-hidden read-only chrome', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');

    expect(screen.getByLabelText('比分池工作台')).toHaveClass('mobile-readonly-results');
    expect(screen.getAllByRole('button', { name: /选择 英格兰 vs 美国/ })[0]).toHaveClass('mobile-hidden-control');
    expect(screen.getByLabelText('待串清单')).toHaveClass('mobile-hidden-control');
    expect(screen.getByLabelText('手机端选择状态')).toHaveClass('mobile-hidden-control');
  });

  it('marks match pool select and delete controls as mobile-hidden and removes match detail expansion', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');

    expect(screen.getByLabelText('选择 英格兰 vs 美国').closest('.match-check')).toHaveClass('mobile-hidden-control');
    expect(screen.getByRole('button', { name: '删除 英格兰 vs 美国' })).toHaveClass('mobile-hidden-control');
    expect(screen.queryByRole('button', { name: '展开赛事 英格兰 vs 美国' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('球队A进攻')).not.toBeInTheDocument();
  });

  it('switches a selected slip leg between score and winner pricing', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await user.click(screen.getAllByRole('button', { name: /选择 英格兰 vs 美国/ })[0]);

    const slip = screen.getByLabelText('待串清单');
    expect(within(slip).getByRole('button', { name: '不选' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(slip).getByText(/总赔率/)).toHaveTextContent('总赔率 1.00');
    const before = within(slip).getByText(/总赔率/).textContent;
    await user.click(within(slip).getByRole('button', { name: '胜平负' }));

    expect(within(slip).getByRole('button', { name: '胜平负' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(slip).getByText(/总赔率/).textContent).not.toBe(before);
  });

  it('groups score board rows by match and supports expanding match sections', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await addMatch(user, '巴西', '墨西哥');

    const englandGroup = screen.getByLabelText('英格兰 vs 美国 比分组');
    const brazilGroup = screen.getByLabelText('巴西 vs 墨西哥 比分组');

    expect(within(englandGroup).getByRole('button', { name: /收起 英格兰 vs 美国/ })).toBeInTheDocument();
    expect(within(englandGroup).getAllByLabelText(/英格兰 vs 美国 .* 比分选项/).length).toBeGreaterThan(0);
    expect(within(brazilGroup).getByRole('button', { name: /展开 巴西 vs 墨西哥/ })).toBeInTheDocument();
    expect(within(brazilGroup).queryByLabelText(/巴西 vs 墨西哥 .* 比分选项/)).not.toBeInTheDocument();

    await user.click(within(englandGroup).getByRole('button', { name: /收起 英格兰 vs 美国/ }));

    expect(within(englandGroup).getByRole('button', { name: /展开 英格兰 vs 美国/ })).toBeInTheDocument();
    expect(within(englandGroup).queryByLabelText(/英格兰 vs 美国 .* 比分选项/)).not.toBeInTheDocument();

    await user.click(within(brazilGroup).getByRole('button', { name: /展开 巴西 vs 墨西哥/ }));

    expect(within(brazilGroup).getByRole('button', { name: /收起 巴西 vs 墨西哥/ })).toBeInTheDocument();
    expect(within(brazilGroup).getAllByLabelText(/巴西 vs 墨西哥 .* 比分选项/).length).toBeGreaterThan(0);
  });

  it('opens the first score group again after switching match packs', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);

    await user.selectOptions(screen.getByLabelText('选择比赛数据包'), '2026-06-18');
    expect(screen.getByRole('button', { name: /收起 捷克 vs 南非/ })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('选择比赛数据包'), '2026-06-19');

    expect(screen.getByRole('button', { name: /收起 美国 vs 澳大利亚/ })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/美国 vs 澳大利亚 .* 比分选项/).length).toBeGreaterThan(0);
  });

  it('keeps score-board strategy filters in the recommended order', async () => {
    render(<App />);

    expect(screen.getByText(/至少选择 1 场比赛/)).toBeInTheDocument();
  });

  it('keeps score-board strategy filters in the recommended order after selecting a match', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');

    expect(screen.getByRole('button', { name: '策略筛选 主推' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '返回顶部' })).toBeInTheDocument();

    const strategyButtons = ['主推', '备选', '大比分', '冷门防守', '赔率价值', '全部'].map((name) =>
      screen.getByRole('button', { name: `策略筛选 ${name}` }),
    );

    strategyButtons.slice(0, -1).forEach((button, index) => {
      expect(Boolean(button.compareDocumentPosition(strategyButtons[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING))
        .toBe(true);
    });
  });

  it('marks the back-to-top action and guide tables for mobile-friendly styling', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');

    expect(screen.getByRole('button', { name: '返回顶部' })).toHaveClass('back-to-top-button');

    await user.click(screen.getByRole('link', { name: '使用说明' }));

    expect(screen.getAllByRole('table')[0].closest('.guide-table-wrap')).toBeInTheDocument();
    expect(screen.getByText('世界杯前序比赛回测').closest('.guide-section')).toHaveClass('guide-backtest-section');
  });

  it('shows score layers on collapsed match cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');

    expect(screen.getAllByText('主推').length).toBeGreaterThan(0);
    expect(screen.queryByText('备选比分')).not.toBeInTheDocument();
    expect(screen.getAllByText('冷门防守').length).toBeGreaterThan(0);
    expect(screen.getByText('大比分信号')).toBeInTheDocument();
  });

  it('removes deleted matches from selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '巴西', '墨西哥');
    await user.click(screen.getByRole('button', { name: '删除 巴西 vs 墨西哥' }));

    expect(screen.queryByText('巴西 vs 墨西哥')).not.toBeInTheDocument();
    expect(screen.getAllByText(/至少选择 1 场比赛/).length).toBeGreaterThan(0);
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

  it('uses the current default match-pair template for imports', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.click(screen.getByRole('button', { name: '填入模版' }));

    const templateValue = (screen.getByLabelText('球队数据 JSON') as HTMLTextAreaElement).value;
    expect(templateValue).toContain('美国');
    expect(templateValue).toContain('澳大利亚');
    expect(templateValue).toContain('巴西');
    expect(templateValue).toContain('南非');

    await user.click(screen.getByRole('button', { name: '确认导入' }));

    expect(screen.getAllByText('捷克 vs 南非').length).toBeGreaterThan(0);
    expect(screen.getAllByText('瑞士 vs 波黑').length).toBeGreaterThan(0);
    expect(screen.getAllByText('加拿大 vs 卡塔尔').length).toBeGreaterThan(0);
    expect(screen.getAllByText('墨西哥 vs 韩国').length).toBeGreaterThan(0);
    expect(screen.getAllByText('美国 vs 澳大利亚').length).toBeGreaterThan(0);
    expect(screen.getAllByText('苏格兰 vs 摩洛哥').length).toBeGreaterThan(0);
    expect(screen.getAllByText('巴西 vs 海地').length).toBeGreaterThan(0);
    expect(screen.getAllByText('土耳其 vs 巴拉圭').length).toBeGreaterThan(0);
    expect(screen.getByText(/已导入 8 场比赛/)).toBeInTheDocument();
  });

  it('switches between built-in match packs from a dropdown after confirmation', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);

    const packSelect = screen.getByLabelText('选择比赛数据包');
    expect(packSelect).toHaveValue('custom');

    await user.selectOptions(packSelect, '2026-06-18');
    expect(confirmSpy).toHaveBeenLastCalledWith(expect.stringContaining('6.18 比赛'));
    expect(screen.getAllByText('捷克 vs 南非').length).toBeGreaterThan(0);
    expect(screen.getAllByText('墨西哥 vs 韩国').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('捷克 vs 南非 胜平负价值')).toBeInTheDocument();
    expect(packSelect).toHaveValue('2026-06-18');

    await user.selectOptions(packSelect, '2026-06-19');
    expect(confirmSpy).toHaveBeenLastCalledWith(expect.stringContaining('6.19 比赛'));
    expect(screen.getAllByText('美国 vs 澳大利亚').length).toBeGreaterThan(0);
    expect(screen.getAllByText('巴西 vs 海地').length).toBeGreaterThan(0);
    expect(screen.queryByText('捷克 vs 南非')).not.toBeInTheDocument();
    expect(screen.getByLabelText('美国 vs 澳大利亚 胜平负价值')).toBeInTheDocument();
    expect(packSelect).toHaveValue('2026-06-19');

    await user.selectOptions(packSelect, '2026-06-20');
    expect(confirmSpy).toHaveBeenLastCalledWith(expect.stringContaining('6.20 比赛'));
    expect(screen.getAllByText('荷兰 vs 瑞典').length).toBeGreaterThan(0);
    expect(screen.getAllByText('德国 vs 科特迪瓦').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('荷兰 vs 瑞典 胜平负价值')).toBeInTheDocument();
    expect(packSelect).toHaveValue('2026-06-20');

    await user.click(screen.getByRole('button', { name: '清空重置' }));
    expect(screen.getByText('比赛池为空')).toBeInTheDocument();
    expect(screen.getByLabelText('选择比赛数据包')).toHaveValue('custom');
    expect(screen.getByRole('option', { name: '自定义当前表格' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '6.18 比赛 · 4 场' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '6.19 比赛 · 4 场' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '6.20 比赛 · 4 场' })).toBeInTheDocument();
  });

  it('keeps the current table when match pack switching is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await user.selectOptions(screen.getByLabelText('选择比赛数据包'), '2026-06-18');

    expect(screen.getByLabelText('选择比赛数据包')).toHaveValue('custom');
    expect(screen.getAllByText('英格兰 vs 美国').length).toBeGreaterThan(0);
    expect(screen.queryByText('捷克 vs 南非')).not.toBeInTheDocument();
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

    expect(screen.getAllByText('葡萄牙 vs 刚果民主共和国').length).toBeGreaterThan(0);
    expect(screen.getAllByText('英格兰 vs 克罗地亚').length).toBeGreaterThan(0);
    expect(screen.getByText(/已导入 2 场比赛/)).toBeInTheDocument();
    expect(screen.getByLabelText('葡萄牙 vs 刚果民主共和国 指标解读')).toHaveTextContent('节奏 1.0');
  });

  it('imports odds separately, matches existing games, and shows odds metrics in results', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.clear(screen.getByLabelText('球队数据 JSON'));
    await user.click(screen.getByLabelText('球队数据 JSON'));
    await user.paste(`[
      [
        {"team":"捷克","attack":63,"defense":66,"stability":61,"pace":53},
        {"team":"南非","attack":56,"defense":54,"stability":52,"pace":58}
      ],
      [
        {"team":"瑞士","attack":68,"defense":82,"stability":80,"pace":44},
        {"team":"波黑","attack":65,"defense":59,"stability":57,"pace":56}
      ]
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入' }));

    await user.click(screen.getByRole('button', { name: '导入赔率数据' }));
    await user.clear(screen.getByLabelText('赔率数据 JSON'));
    await user.click(screen.getByLabelText('赔率数据 JSON'));
    await user.paste(`[
      {
        "teamA": "捷克",
        "teamB": "南非",
        "odds": {
          "winner": { "teamAWin": 2.20, "draw": 3.20, "teamBWin": 3.40 },
          "correctScores": [{ "score": "1-0", "odds": 6.60 }, { "score": "3-1", "odds": 22.00 }],
          "totalGoals": [{ "goals": 2, "odds": 3.40 }, { "goals": "7+", "odds": 60.00 }]
        }
      },
      {
        "teamA": "波黑",
        "teamB": "瑞士",
        "odds": {
          "winner": null,
          "correctScores": [{ "score": "0-1", "odds": 6.30 }]
        }
      }
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入赔率' }));

    expect(screen.getByText(/已匹配 2 场赔率/)).toBeInTheDocument();
    expect(screen.queryByText(/赔率:胜平负/)).not.toBeInTheDocument();
    expect(screen.queryByText(/波胆 25项/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('捷克 vs 南非 胜平负价值')).toHaveTextContent('胜平负价值');
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).not.toHaveTextContent('模型');
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).not.toHaveTextContent('赔 6.60');
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).not.toHaveTextContent('价值');
    await user.click(screen.getByRole('button', { name: '赔率详情 捷克 vs 南非' }));
    const oddsDialog = screen.getByRole('dialog', { name: '捷克 vs 南非 赔率详情' });
    expect(oddsDialog).toBeInTheDocument();
    expect(within(oddsDialog).getByText('球队能力')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('进攻 63')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('节奏 58')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('胜平负价值')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('价值')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('波胆赔率')).toBeInTheDocument();
    expect(within(oddsDialog).getByRole('button', { name: '波胆标签 非热门合理' })).toBeInTheDocument();
    expect(within(oddsDialog).getByRole('button', { name: '波胆标签 主推' })).toBeInTheDocument();
    expect(within(oddsDialog).getByRole('button', { name: '波胆标签 中倍候选' })).toBeInTheDocument();
    expect(within(oddsDialog).getByText(/不是最热但逻辑可留|热门主推比分/)).toBeInTheDocument();
    await user.click(within(oddsDialog).getByRole('button', { name: '波胆标签 主推' }));
    expect(within(oddsDialog).getByText('1-0').closest('.score-odds-row')).toHaveClass('tag-highlighted');
    expect(within(oddsDialog).getByText('总进球数赔率')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('2球')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('7+球')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('赔 3.40')).toBeInTheDocument();
    expect(within(oddsDialog).getByRole('button', { name: '模型排序' })).toBeInTheDocument();
    expect(within(oddsDialog).getByRole('button', { name: '赔率排序' })).toBeInTheDocument();
    expect(within(oddsDialog).getByRole('button', { name: '价值排序' })).toBeInTheDocument();
    expect(within(oddsDialog).getByRole('button', { name: '标签推荐' })).toBeInTheDocument();
    await user.click(within(oddsDialog).getByRole('button', { name: '赔率排序' }));
    expect(within(oddsDialog).getAllByText(/^赔 /)[0]).toHaveTextContent('赔 6.60');
    await user.click(screen.getByRole('presentation'));
    expect(screen.queryByRole('dialog', { name: '捷克 vs 南非 赔率详情' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/赔 6\.60|赔 6\.30/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '赔率详情 捷克 vs 南非' }));
    await user.click(screen.getByRole('button', { name: '关闭赔率详情' }));
    expect(screen.getAllByText(/赔 6\.60|赔 6\.30/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/盘口/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/价值/).length).toBeGreaterThan(0);
  });

  it('fetches Sporttery winner, correct score, and total goals odds into matching games', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          value: {
            matchInfoList: [
              {
                subMatchList: [
                  {
                    homeTeamAbbName: '捷克',
                    awayTeamAbbName: '南非',
                    had: { h: '2.20', d: '3.20', a: '3.40' },
                    crs: { s01s00: '6.60', s01s01: '7.00' },
                    ttg: { s2: '3.40', s7: '60.00' },
                  },
                ],
              },
            ],
          },
        }),
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.clear(screen.getByLabelText('球队数据 JSON'));
    await user.click(screen.getByLabelText('球队数据 JSON'));
    await user.paste(`[
      [
        {"team":"捷克","attack":63,"defense":66,"stability":61,"pace":53},
        {"team":"南非","attack":56,"defense":54,"stability":52,"pace":58}
      ]
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入' }));

    await user.click(screen.getByRole('button', { name: '拉取竞彩赔率' }));

    expect(await screen.findByText(/竞彩接口已拉取 1 场，已匹配 1 场赔率/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '赔率详情 捷克 vs 南非' }));
    const oddsDialog = screen.getByRole('dialog', { name: '捷克 vs 南非 赔率详情' });
    expect(within(oddsDialog).getByText('胜平负价值')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('波胆赔率')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('总进球数赔率')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('1-0')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('2球')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('7+球')).toBeInTheDocument();
  });

  it('marks matches that qualify as 7-15x middle-odds candidates', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.clear(screen.getByLabelText('球队数据 JSON'));
    await user.click(screen.getByLabelText('球队数据 JSON'));
    await user.paste(`[
      [
        {"team":"加拿大","attack":66,"defense":60,"stability":62,"pace":64},
        {"team":"卡塔尔","attack":54,"defense":51,"stability":49,"pace":47}
      ]
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入' }));

    await user.click(screen.getByRole('button', { name: '导入赔率数据' }));
    await user.clear(screen.getByLabelText('赔率数据 JSON'));
    await user.click(screen.getByLabelText('赔率数据 JSON'));
    await user.paste(`[
      {
        "teamA": "加拿大",
        "teamB": "卡塔尔",
        "odds": {
          "winner": { "teamAWin": 2.10, "draw": 3.60, "teamBWin": 3.70 }
        }
      }
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入赔率' }));

    expect(screen.getByLabelText('加拿大 vs 卡塔尔 中赔候选')).toHaveTextContent(/中赔候选 [4-7]\/7/);
  });

  it('can disable odds usage without deleting imported odds data', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.clear(screen.getByLabelText('球队数据 JSON'));
    await user.click(screen.getByLabelText('球队数据 JSON'));
    await user.paste(`[
      [
        {"team":"捷克","attack":63,"defense":66,"stability":61,"pace":53},
        {"team":"南非","attack":56,"defense":54,"stability":52,"pace":58}
      ],
      [
        {"team":"瑞士","attack":68,"defense":82,"stability":80,"pace":44},
        {"team":"波黑","attack":65,"defense":59,"stability":57,"pace":56}
      ]
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入' }));

    await user.click(screen.getByRole('button', { name: '导入赔率数据' }));
    await user.clear(screen.getByLabelText('赔率数据 JSON'));
    await user.click(screen.getByLabelText('赔率数据 JSON'));
    await user.paste(`[
      {
        "teamA": "捷克",
        "teamB": "南非",
        "odds": {
          "winner": { "teamAWin": 2.20, "draw": 3.20, "teamBWin": 3.40 },
          "correctScores": [{ "score": "1-0", "odds": 6.60 }]
        }
      }
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入赔率' }));

    expect(screen.getByLabelText('使用赔率数据')).toBeChecked();
    expect(screen.getByLabelText('捷克 vs 南非 胜平负价值')).toBeInTheDocument();
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).not.toHaveTextContent('赔 6.60');
    expect(screen.getAllByText(/赔 6\.60/).length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText('使用赔率数据'));

    expect(screen.getByLabelText('使用赔率数据')).not.toBeChecked();
    expect(screen.queryByLabelText('捷克 vs 南非 胜平负价值')).not.toBeInTheDocument();
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).not.toHaveTextContent('赔 6.60');
    expect(screen.queryByText(/赔 6\.60/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '赔率详情 捷克 vs 南非' })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('使用赔率数据'));

    expect(screen.getByLabelText('使用赔率数据')).toBeChecked();
    expect(screen.getByLabelText('捷克 vs 南非 胜平负价值')).toBeInTheDocument();
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).not.toHaveTextContent('赔 6.60');
  });

  it('can filter the score board with the odds value strategy', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.clear(screen.getByLabelText('球队数据 JSON'));
    await user.click(screen.getByLabelText('球队数据 JSON'));
    await user.paste(`[
      [
        {"team":"捷克","attack":63,"defense":66,"stability":61,"pace":53},
        {"team":"南非","attack":56,"defense":54,"stability":52,"pace":58}
      ],
      [
        {"team":"瑞士","attack":68,"defense":82,"stability":80,"pace":44},
        {"team":"波黑","attack":65,"defense":59,"stability":57,"pace":56}
      ]
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入' }));

    await user.click(screen.getByRole('button', { name: '导入赔率数据' }));
    await user.clear(screen.getByLabelText('赔率数据 JSON'));
    await user.click(screen.getByLabelText('赔率数据 JSON'));
    await user.paste(`[
      {
        "teamA": "捷克",
        "teamB": "南非",
        "odds": {
          "correctScores": [{ "score": "4-1", "odds": 24.00 }, { "score": "1-1", "odds": 5.00 }]
        }
      },
      {
        "teamA": "瑞士",
        "teamB": "波黑",
        "odds": {
          "correctScores": [{ "score": "2-1", "odds": 12.00 }, { "score": "1-0", "odds": 5.50 }]
        }
      }
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入赔率' }));
    await user.click(screen.getByRole('button', { name: '策略筛选 赔率价值' }));

    expect(screen.getByRole('button', { name: '策略筛选 赔率价值' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText(/赔率价值/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/价值/).length).toBeGreaterThan(0);
  });

  it('sorts and filters the score board by odds data', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '导入球队数据' }));
    await user.clear(screen.getByLabelText('球队数据 JSON'));
    await user.click(screen.getByLabelText('球队数据 JSON'));
    await user.paste(`[
      [
        {"team":"捷克","attack":63,"defense":66,"stability":61,"pace":53},
        {"team":"南非","attack":56,"defense":54,"stability":52,"pace":58}
      ],
      [
        {"team":"瑞士","attack":68,"defense":82,"stability":80,"pace":44},
        {"team":"波黑","attack":65,"defense":59,"stability":57,"pace":56}
      ]
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入' }));

    await user.click(screen.getByRole('button', { name: '导入赔率数据' }));
    await user.clear(screen.getByLabelText('赔率数据 JSON'));
    await user.click(screen.getByLabelText('赔率数据 JSON'));
    await user.paste(`[
      {
        "teamA": "捷克",
        "teamB": "南非",
        "odds": {
          "correctScores": [{ "score": "1-0", "odds": 6.60 }, { "score": "3-1", "odds": 22.00 }]
        }
      },
      {
        "teamA": "瑞士",
        "teamB": "波黑",
        "odds": {
          "correctScores": [{ "score": "1-0", "odds": 5.50 }]
        }
      }
    ]`);
    await user.click(screen.getByRole('button', { name: '确认导入赔率' }));

    expect(screen.queryByText(/大组合/)).not.toBeInTheDocument();
    const czechGroup = screen.getByLabelText('捷克 vs 南非 比分组');
    expect(within(czechGroup).getByRole('button', { name: /收起 捷克 vs 南非/ })).toBeInTheDocument();
    expect(czechGroup).toHaveTextContent('赔 6.60');

    await user.click(screen.getByRole('button', { name: '赔率' }));
    const firstScore = within(czechGroup).getAllByLabelText(/比分选项/)[0];
    expect(firstScore).toHaveTextContent('1-0');
    expect(firstScore).toHaveTextContent('赔 6.60');

    await user.click(screen.getByRole('button', { name: '策略筛选 大比分' }));
    expect(screen.getByLabelText('比分池列表')).toHaveTextContent('大比分');
  });

  it('shows metric insights on collapsed match cards and opens the global guide modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '克罗地亚');

    const metricRegion = screen.getByLabelText('英格兰 vs 克罗地亚 指标解读');
    expect(metricRegion).toHaveTextContent('xG');
    expect(metricRegion).toHaveTextContent('节奏');
    expect(metricRegion).toHaveTextContent('Top1');
    expect(document.querySelector('.match-verdict')).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: '展开赛事 英格兰 vs 克罗地亚' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('球队A进攻')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('球队A节奏')).not.toBeInTheDocument();
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

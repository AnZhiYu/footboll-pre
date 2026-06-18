import { render, screen, within } from '@testing-library/react';
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
    expect(screen.queryByRole('button', { name: '主线串' })).not.toBeInTheDocument();

    const resultsPanel = screen.getByLabelText('比分池工作台');
    expect(within(resultsPanel).getByLabelText('胜平负方向')).toBeInTheDocument();
    expect(within(resultsPanel).getByLabelText('2.5 大小球')).toBeInTheDocument();
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

  it('keeps score-board strategy filters in the recommended order', async () => {
    render(<App />);

    expect(screen.getByText(/至少选择 1 场比赛/)).toBeInTheDocument();
  });

  it('keeps score-board strategy filters in the recommended order after selecting a match', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');

    const strategyButtons = ['全部', '主线', '备选', '大比分', '冷门防守', '赔率价值'].map((name) =>
      screen.getByRole('button', { name: `策略筛选 ${name}` }),
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

    expect(screen.getAllByText('主线').length).toBeGreaterThan(0);
    expect(screen.getByText('备选比分')).toBeInTheDocument();
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
    expect(templateValue).toContain('乌兹别克斯坦');
    expect(templateValue).toContain('南非');
    expect(templateValue).toContain('哥伦比亚');

    await user.click(screen.getByRole('button', { name: '确认导入' }));

    expect(screen.getAllByText('乌兹别克斯坦 vs 哥伦比亚').length).toBeGreaterThan(0);
    expect(screen.getAllByText('捷克 vs 南非').length).toBeGreaterThan(0);
    expect(screen.getAllByText('瑞士 vs 波黑').length).toBeGreaterThan(0);
    expect(screen.getAllByText('加拿大 vs 卡塔尔').length).toBeGreaterThan(0);
    expect(screen.getAllByText('墨西哥 vs 韩国').length).toBeGreaterThan(0);
    expect(screen.getByText(/已导入 5 场比赛/)).toBeInTheDocument();
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
          "correctScores": [{ "score": "1-0", "odds": 6.60 }]
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
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).toHaveTextContent('模型');
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).toHaveTextContent('赔 6.60');
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).toHaveTextContent('价值');
    await user.click(screen.getByRole('button', { name: '查看赔率详情 捷克 vs 南非' }));
    const oddsDialog = screen.getByRole('dialog', { name: '捷克 vs 南非 赔率详情' });
    expect(oddsDialog).toBeInTheDocument();
    expect(within(oddsDialog).getByText('胜平负价值')).toBeInTheDocument();
    expect(within(oddsDialog).getByText('波胆赔率')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭赔率详情' }));
    expect(screen.getAllByText(/赔 6\.60|赔 6\.30/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/盘口/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/价值/).length).toBeGreaterThan(0);
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
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).toHaveTextContent('赔 6.60');
    expect(screen.getAllByText(/赔 6\.60/).length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText('使用赔率数据'));

    expect(screen.getByLabelText('使用赔率数据')).not.toBeChecked();
    expect(screen.queryByLabelText('捷克 vs 南非 胜平负价值')).not.toBeInTheDocument();
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).not.toHaveTextContent('赔 6.60');
    expect(screen.queryByText(/赔 6\.60/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看赔率详情 捷克 vs 南非' })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('使用赔率数据'));

    expect(screen.getByLabelText('使用赔率数据')).toBeChecked();
    expect(screen.getByLabelText('捷克 vs 南非 胜平负价值')).toBeInTheDocument();
    expect(screen.getByLabelText('捷克 vs 南非 比分分层推荐')).toHaveTextContent('赔 6.60');
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
    await user.click(within(czechGroup).getByRole('button', { name: /展开 捷克 vs 南非/ }));
    expect(czechGroup).toHaveTextContent('赔 6.60');

    await user.click(screen.getByRole('button', { name: '赔率' }));
    const firstScore = within(czechGroup).getAllByLabelText(/比分选项/)[0];
    expect(firstScore).toHaveTextContent('3-1');
    expect(firstScore).toHaveTextContent('赔 22.00');

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

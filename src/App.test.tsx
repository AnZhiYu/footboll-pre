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
      await user.click(screen.getByLabelText(`选择 球队A${index} vs 球队B${index}`));
    }

    await user.click(screen.getByRole('button', { name: '5串1' }));

    expect(screen.getByRole('button', { name: '5串1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/大组合 1/)).toBeInTheDocument();
    expect(screen.getByText(/Top 5 比分方案/)).toBeInTheDocument();
  });

  it('shows goals and random strategy controls and can refresh random picks', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '英格兰', '美国');
    await user.click(screen.getByLabelText('选择 英格兰 vs 美国'));
    await addMatch(user, '巴西', '墨西哥');
    await user.click(screen.getByLabelText('选择 巴西 vs 墨西哥'));

    expect(screen.queryByRole('button', { name: '最稳' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '大小球倾向' }));
    expect(screen.getByRole('button', { name: '大小球倾向' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/大组合 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '大比分激进' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '策略随机' }));
    expect(screen.getByRole('button', { name: '刷新随机' })).toBeInTheDocument();
    expect(screen.getAllByText(/策略:/).length).toBeGreaterThan(0);

    const before = screen.getAllByText(/策略:/).map((node) => node.textContent).join('|');
    await user.click(screen.getByRole('button', { name: '刷新随机' }));
    const after = screen.getAllByText(/策略:/).map((node) => node.textContent).join('|');

    expect(after).not.toEqual(before);
  });

  it('removes deleted matches from selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addMatch(user, '巴西', '墨西哥');
    await user.click(screen.getByLabelText('选择 巴西 vs 墨西哥'));
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
    expect(screen.getByText('攻 66 / 防 67 / 稳 68')).toBeInTheDocument();
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
  });

  it('does not crash when old localStorage state has no version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ matchPool: [{ id: 'old' }] }));

    render(<App />);

    expect(screen.getByText('比赛池为空')).toBeInTheDocument();
  });
});

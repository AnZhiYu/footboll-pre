import { describe, expect, it } from 'vitest';
import { analyzeMatch } from './poisson';
import { getBigScoreCandidates, getBigScoreSignal } from './bigScore';

describe('big score signal', () => {
  it('marks fast open matches as high big-score candidates', () => {
    const analysis = analyzeMatch({
      id: 'm_1',
      homeName: '进攻队A',
      awayName: '进攻队B',
      homeStats: { attack: 86, defense: 62, stability: 72, pace: 82 },
      awayStats: { attack: 82, defense: 60, stability: 70, pace: 78 },
    });

    const signal = getBigScoreSignal(analysis);

    expect(signal.level).toBe('high');
    expect(signal.reasons).toContain('总xG≥3.0');
    expect(signal.reasons).toContain('节奏极快');
    expect(signal.candidates.every((pick) => pick.homeGoals + pick.awayGoals >= 4)).toBe(true);
  });

  it('surfaces single-side pressure as a big-score warning', () => {
    const analysis = analyzeMatch({
      id: 'm_2',
      homeName: '强队',
      awayName: '弱队',
      homeStats: { attack: 92, defense: 82, stability: 78, pace: 76 },
      awayStats: { attack: 42, defense: 42, stability: 40, pace: 44 },
    });

    const signal = getBigScoreSignal(analysis);

    expect(['medium', 'high']).toContain(signal.level);
    expect(signal.reasons).toContain('单边压制');
    expect(getBigScoreCandidates(analysis, 4).map((pick) => pick.label)).toContain('4-0');
  });

  it('keeps slow low-xG matches as weak big-score signals', () => {
    const analysis = analyzeMatch({
      id: 'm_3',
      homeName: '保守队A',
      awayName: '保守队B',
      homeStats: { attack: 55, defense: 78, stability: 80, pace: 42 },
      awayStats: { attack: 54, defense: 76, stability: 79, pace: 40 },
    });

    const signal = getBigScoreSignal(analysis);

    expect(signal.level).toBe('low');
    expect(signal.reasons).toContain('大比分信号不足');
  });
});

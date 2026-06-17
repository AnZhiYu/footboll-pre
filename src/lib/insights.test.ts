import { describe, expect, it } from 'vitest';
import {
  getConfidenceInsight,
  getMatchVerdict,
  getPaceInsight,
  getXgInsight,
} from './insights';
import type { MatchAnalysis } from '../types';

describe('metric insights', () => {
  it.each([
    [0.39, '进攻瘫痪'],
    [0.4, '难越雷池'],
    [0.79, '难越雷池'],
    [0.8, '传控受阻'],
    [1.19, '传控受阻'],
    [1.2, '常规火力'],
    [1.59, '常规火力'],
    [1.6, '攻势如潮'],
    [1.99, '攻势如潮'],
    [2, '降维打击'],
    [2.59, '降维打击'],
    [2.6, '惨案临界'],
  ])('maps xG %s to %s', (value, label) => {
    expect(getXgInsight(value).label).toBe(label);
  });

  it.each([
    [0.8, '催眠闷局'],
    [0.9, '淘汰赛思维'],
    [1, '标准步调'],
    [1.1, '提速对攻'],
    [1.2, '亡命狂飙'],
  ])('maps pace factor %s to %s', (value, label) => {
    expect(getPaceInsight(value).label).toBe(label);
  });

  it.each([
    [0.0599, '诸神混乱'],
    [0.06, '群雄逐鹿'],
    [0.0799, '群雄逐鹿'],
    [0.08, '黄金基准'],
    [0.0999, '黄金基准'],
    [0.1, '方向明朗'],
    [0.1199, '方向明朗'],
    [0.12, '高度聚拢'],
    [0.1399, '高度聚拢'],
    [0.14, '铁索横江'],
    [0.1599, '铁索横江'],
    [0.16, '数学奇迹'],
  ])('maps Top1 probability %s to %s', (value, label) => {
    expect(getConfidenceInsight(value).label).toBe(label);
  });

  it('maps the target example to the expected labels', () => {
    expect(getXgInsight(1.38).label).toBe('常规火力');
    expect(getXgInsight(0.53).label).toBe('难越雷池');
    expect(getPaceInsight(0.8).label).toBe('催眠闷局');
    expect(getConfidenceInsight(0.2048).label).toBe('数学奇迹');
  });

  it('creates a compact low-score verdict for slow high-confidence matches', () => {
    const verdict = getMatchVerdict({
      paceFactor: 0.8,
      homeLambda: 1.38,
      awayLambda: 0.53,
      mostLikely: { probability: 0.2048 },
    } as MatchAnalysis);

    expect(verdict).toContain('低节奏');
    expect(verdict).toContain('高置信');
    expect(verdict).toContain('小比分锁定局');
  });
});

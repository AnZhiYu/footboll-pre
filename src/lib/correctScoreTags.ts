import type { MatchAnalysis, ScorePick } from '../types';
import { getBigScoreCandidates } from './bigScore';

export type CorrectScoreTagKey = 'reasonableNonHot' | 'middleOdds' | 'mainline' | 'highScore' | 'value';

export type CorrectScoreTag = {
  key: CorrectScoreTagKey;
  label: string;
};

export const CORRECT_SCORE_TAGS: Record<CorrectScoreTagKey, CorrectScoreTag> = {
  reasonableNonHot: { key: 'reasonableNonHot', label: '非热门合理' },
  middleOdds: { key: 'middleOdds', label: '中倍候选' },
  mainline: { key: 'mainline', label: '主推' },
  highScore: { key: 'highScore', label: '大比分' },
  value: { key: 'value', label: '性价比' },
};

const addTag = (
  tagMap: Map<string, CorrectScoreTag[]>,
  pick: ScorePick,
  tag: CorrectScoreTag,
) => {
  const current = tagMap.get(pick.label) ?? [];
  if (!current.some((item) => item.key === tag.key)) {
    tagMap.set(pick.label, [...current, tag]);
  }
};

const getCorrectScoreOdds = (analysis: MatchAnalysis) =>
  analysis.matrix.filter((pick) => typeof pick.odds === 'number' && Number.isFinite(pick.odds));

const getValueScore = (pick: ScorePick, minOdds: number, maxOdds: number) => {
  if (pick.valueIndex === undefined || pick.odds === undefined) {
    return Number.NEGATIVE_INFINITY;
  }

  const oddsRange = Math.max(maxOdds - minOdds, 1);
  const normalizedOddsScore = (pick.odds - minOdds) / oddsRange;
  return pick.valueIndex * 0.65 + normalizedOddsScore * 0.35;
};

export const getCorrectScoreTagMap = (analysis: MatchAnalysis) => {
  const tagMap = new Map<string, CorrectScoreTag[]>();
  const correctScoreOdds = getCorrectScoreOdds(analysis);
  const oddsValues = correctScoreOdds.map((pick) => pick.odds ?? 0);
  const minOdds = Math.min(...oddsValues);
  const maxOdds = Math.max(...oddsValues);

  analysis.matrix.slice(0, 3).forEach((pick) => addTag(tagMap, pick, CORRECT_SCORE_TAGS.mainline));

  getBigScoreCandidates(analysis, 8).forEach((pick) => addTag(tagMap, pick, CORRECT_SCORE_TAGS.highScore));

  correctScoreOdds
    .filter((pick) => pick.odds !== undefined && pick.odds >= 7 && pick.odds <= 15 && pick.rank <= 12)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3)
    .forEach((pick) => addTag(tagMap, pick, CORRECT_SCORE_TAGS.middleOdds));

  correctScoreOdds
    .filter(
      (pick) =>
        pick.rank >= 3 &&
        pick.rank <= 10 &&
        pick.probability >= 0.03 &&
        pick.odds !== undefined &&
        pick.odds >= 7 &&
        pick.odds <= 18 &&
        (pick.valueIndex ?? 0) >= 0.9,
    )
    .sort((a, b) => {
      const aValue = (a.valueIndex ?? 0) * 0.45 + a.probability * 3.5 + ((a.odds ?? 0) >= 9 ? 0.12 : 0);
      const bValue = (b.valueIndex ?? 0) * 0.45 + b.probability * 3.5 + ((b.odds ?? 0) >= 9 ? 0.12 : 0);
      return bValue - aValue;
    })
    .slice(0, 4)
    .forEach((pick) => addTag(tagMap, pick, CORRECT_SCORE_TAGS.reasonableNonHot));

  correctScoreOdds
    .filter((pick) => pick.valueIndex !== undefined)
    .sort((a, b) => {
      const scoreDiff = getValueScore(b, minOdds, maxOdds) - getValueScore(a, minOdds, maxOdds);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return b.probability - a.probability;
    })
    .slice(0, 3)
    .forEach((pick) => addTag(tagMap, pick, CORRECT_SCORE_TAGS.value));

  return tagMap;
};

export const getCorrectScoreReason = (pick: ScorePick, tags: CorrectScoreTag[]) => {
  if (tags.some((tag) => tag.key === 'reasonableNonHot')) {
    return `模型第${pick.rank}，赔率${pick.odds?.toFixed(2)}，不是最热但逻辑可留`;
  }

  if (tags.some((tag) => tag.key === 'mainline')) {
    return `模型第${pick.rank}，热门主推比分`;
  }

  if (tags.some((tag) => tag.key === 'highScore')) {
    return `命中大比分信号，适合扩展覆盖`;
  }

  if (tags.some((tag) => tag.key === 'value')) {
    return `价值${pick.valueIndex?.toFixed(2) ?? '-'}，赔率回报空间较高`;
  }

  if (tags.some((tag) => tag.key === 'middleOdds')) {
    return `赔率处于中倍区间，适合观察`;
  }

  return pick.rank <= 10 ? `模型第${pick.rank}，可作普通参考` : '模型排序偏后，谨慎覆盖';
};

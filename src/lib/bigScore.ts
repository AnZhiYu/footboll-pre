import type { MatchAnalysis, ScorePick } from '../types';

export type BigScoreSignalLevel = 'low' | 'medium' | 'high';

export type BigScoreSignal = {
  level: BigScoreSignalLevel;
  label: string;
  score: number;
  reasons: string[];
  candidates: ScorePick[];
  tooltip: string;
};

const uniqueByLabel = (picks: ScorePick[]) => {
  const seen = new Set<string>();
  return picks.filter((pick) => {
    if (seen.has(pick.label)) {
      return false;
    }

    seen.add(pick.label);
    return true;
  });
};

export const getBigScoreCandidates = (analysis: MatchAnalysis, limit = 8): ScorePick[] => {
  const highScores = analysis.matrix.filter((pick) => pick.homeGoals + pick.awayGoals >= 4);
  const direction = analysis.homeLambda - analysis.awayLambda;
  const alignedScores = highScores.filter((pick) => {
    if (Math.abs(direction) < 0.25) {
      return true;
    }

    return direction > 0 ? pick.homeGoals >= pick.awayGoals : pick.awayGoals >= pick.homeGoals;
  });

  return uniqueByLabel([...alignedScores, ...highScores]).slice(0, limit);
};

export const getBigScoreSignal = (analysis: MatchAnalysis): BigScoreSignal => {
  const totalXg = analysis.homeLambda + analysis.awayLambda;
  const maxLambda = Math.max(analysis.homeLambda, analysis.awayLambda);
  const minLambda = Math.min(analysis.homeLambda, analysis.awayLambda);
  const lambdaGap = Math.abs(analysis.homeLambda - analysis.awayLambda);
  const top10BigScores = analysis.matrix.slice(0, 10).filter((pick) => pick.homeGoals + pick.awayGoals >= 4);
  const bestBigScore = getBigScoreCandidates(analysis, 1)[0];
  const reasons: string[] = [];
  let score = 0;

  if (totalXg >= 3) {
    score += 2;
    reasons.push('总xG≥3.0');
  } else if (totalXg >= 2.65) {
    score += 1;
    reasons.push('总xG偏高');
  }

  if (analysis.paceFactor >= 1.2) {
    score += 1.5;
    reasons.push('节奏极快');
  } else if (analysis.paceFactor >= 1.1) {
    score += 1;
    reasons.push('节奏偏快');
  }

  if (maxLambda >= 1.8 && lambdaGap >= 0.65) {
    score += 1.5;
    reasons.push('单边压制');
  } else if (maxLambda >= 1.6) {
    score += 0.75;
    reasons.push('强侧火力足');
  }

  if (minLambda >= 1 && totalXg >= 2.6) {
    score += 1;
    reasons.push('双方有球底盘');
  }

  if (top10BigScores.length >= 2) {
    score += 1;
    reasons.push('大比分靠前');
  } else if (top10BigScores.length === 1) {
    score += 0.5;
    reasons.push('存在大比分窗口');
  }

  if (bestBigScore && bestBigScore.rank <= 8) {
    score += 1;
  } else if (bestBigScore && bestBigScore.rank <= 12) {
    score += 0.5;
  }

  const level: BigScoreSignalLevel = score >= 4 ? 'high' : score >= 2.5 ? 'medium' : 'low';
  const label = level === 'high' ? '强' : level === 'medium' ? '中' : '弱';
  const fallbackReasons = level === 'low' ? ['大比分信号不足'] : reasons;

  return {
    level,
    label,
    score,
    reasons: fallbackReasons,
    candidates: getBigScoreCandidates(analysis, 6),
    tooltip: fallbackReasons.join(' / '),
  };
};

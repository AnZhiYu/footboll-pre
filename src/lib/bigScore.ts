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

const bttsProbability = (analysis: MatchAnalysis) =>
  analysis.matrix
    .filter((pick) => pick.homeGoals > 0 && pick.awayGoals > 0)
    .reduce((sum, pick) => sum + pick.probability, 0);

const getBigScoreProfile = (analysis: MatchAnalysis) => {
  const totalXg = analysis.homeLambda + analysis.awayLambda;
  const maxLambda = Math.max(analysis.homeLambda, analysis.awayLambda);
  const minLambda = Math.min(analysis.homeLambda, analysis.awayLambda);
  const lambdaGap = Math.abs(analysis.homeLambda - analysis.awayLambda);
  const btts = bttsProbability(analysis);
  const strongerSide = analysis.homeLambda >= analysis.awayLambda ? 'home' : 'away';
  const weakDefenseWindow = maxLambda >= 1.35 && minLambda >= 0.75 && lambdaGap >= 0.45;
  const consolationWindow = btts >= 0.4 || minLambda >= 0.8;
  const collapseWindow = maxLambda >= 1.4 && lambdaGap >= 0.45;

  return {
    totalXg,
    maxLambda,
    minLambda,
    lambdaGap,
    btts,
    strongerSide,
    weakDefenseWindow,
    consolationWindow,
    collapseWindow,
  };
};

const scoreBigCandidate = (pick: ScorePick, analysis: MatchAnalysis) => {
  const profile = getBigScoreProfile(analysis);
  const totalGoals = pick.homeGoals + pick.awayGoals;
  const strongerGoals = profile.strongerSide === 'home' ? pick.homeGoals : pick.awayGoals;
  const weakerGoals = profile.strongerSide === 'home' ? pick.awayGoals : pick.homeGoals;
  const aligned = strongerGoals >= weakerGoals;
  let score = pick.probability;

  if (aligned) {
    score *= 1.18;
  } else if (profile.lambdaGap >= 0.35) {
    score *= 0.62;
  }

  if (profile.weakDefenseWindow && aligned && strongerGoals >= 3) {
    score *= 1.35;
  }

  if (profile.consolationWindow && aligned && weakerGoals >= 1 && profile.lambdaGap >= 0.35) {
    score *= 1.35;
  }

  if (profile.collapseWindow && aligned && strongerGoals >= 4) {
    score *= 1.12;
  }

  if (totalGoals === 4 || totalGoals === 5) {
    score *= 1.12;
  } else if (totalGoals >= 6) {
    score *= 0.92;
  }

  if (weakerGoals === 0 && profile.consolationWindow) {
    score *= 0.78;
  }

  return score;
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
  const candidatePool = uniqueByLabel([...alignedScores, ...highScores]);

  if (Math.abs(direction) < 0.35) {
    return candidatePool.slice(0, limit);
  }

  return candidatePool
    .sort((a, b) => {
      const bigScoreDiff = scoreBigCandidate(b, analysis) - scoreBigCandidate(a, analysis);
      if (bigScoreDiff !== 0) {
        return bigScoreDiff;
      }

      return b.probability - a.probability;
    })
    .slice(0, limit);
};

export const getBigScoreSignal = (analysis: MatchAnalysis): BigScoreSignal => {
  const profile = getBigScoreProfile(analysis);
  const top10BigScores = analysis.matrix.slice(0, 10).filter((pick) => pick.homeGoals + pick.awayGoals >= 4);
  const bestBigScore = getBigScoreCandidates(analysis, 1)[0];
  const reasons: string[] = [];
  let score = 0;

  if (profile.totalXg >= 3) {
    score += 2;
    reasons.push('总xG≥3.0');
  } else if (profile.totalXg >= 2.65) {
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

  if (profile.maxLambda >= 1.8 && profile.lambdaGap >= 0.65) {
    score += 1.5;
    reasons.push('单边压制');
  } else if (profile.maxLambda >= 1.6) {
    score += 0.75;
    reasons.push('强侧火力足');
  }

  if (profile.minLambda >= 1 && profile.totalXg >= 2.6) {
    score += 1;
    reasons.push('双方有球底盘');
  }

  if (profile.weakDefenseWindow) {
    score += 0.9;
    reasons.push('弱侧防线脆弱');
  }

  if (profile.consolationWindow && profile.collapseWindow) {
    score += 0.8;
    reasons.push('弱侧有反击进球窗口');
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

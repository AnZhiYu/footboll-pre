import type { MatchAnalysis, ScorePick } from '../types';

export type TotalGoalsProbability = {
  goals: number | '7+';
  probability: number;
};

const sumProbability = (matrix: ScorePick[], predicate: (pick: ScorePick) => boolean) =>
  matrix.filter(predicate).reduce((total, pick) => total + pick.probability, 0);

export const getBttsProbabilities = (analysis: MatchAnalysis) => {
  const yes = sumProbability(analysis.matrix, (pick) => pick.homeGoals > 0 && pick.awayGoals > 0);

  return {
    yes,
    no: Math.max(0, 1 - yes),
  };
};

export const getTotalGoalsProbabilities = (analysis: MatchAnalysis): TotalGoalsProbability[] => {
  const goalsBuckets: Array<number | '7+'> = [0, 1, 2, 3, 4, 5, 6, '7+'];
  const buckets: TotalGoalsProbability[] = goalsBuckets.map((goals) => ({
    goals,
    probability: 0,
  }));

  analysis.matrix.forEach((pick) => {
    const totalGoals = pick.homeGoals + pick.awayGoals;
    const key = totalGoals >= 7 ? '7+' : totalGoals;
    const bucket = buckets.find((item) => item.goals === key);

    if (bucket) {
      bucket.probability += pick.probability;
    }
  });

  return buckets;
};

export const getLeadingTotalGoalsProbabilities = (analysis: MatchAnalysis, limit = 3) =>
  [...getTotalGoalsProbabilities(analysis)]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, limit);

export const formatTotalGoalsLabel = (goals: number | '7+') => (goals === '7+' ? '7+' : `${goals}球`);

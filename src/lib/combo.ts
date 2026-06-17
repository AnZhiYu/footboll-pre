import type {
  BaseComboStrategy,
  ComboGroup,
  ComboPlan,
  ComboPlanPick,
  ComboStrategy,
  MatchAnalysis,
  ScorePick,
} from '../types';

export const STRATEGY_LABELS: Record<BaseComboStrategy, string> = {
  safe: '最稳',
  balanced: '混合串',
  underdog: '防冷串',
  goals: '覆盖串',
  highScore: '大比分激进',
  mainline: '主线串',
  coverage: '覆盖串',
  upset: '防冷串',
  mixed: '混合串',
};

const BASE_STRATEGIES: BaseComboStrategy[] = ['mainline', 'coverage', 'upset', 'mixed'];

export const combinations = <T>(items: T[], size: number): T[][] => {
  if (size <= 0 || size > items.length) {
    return [];
  }

  if (size === items.length) {
    return [items];
  }

  const result: T[][] = [];
  const walk = (start: number, selected: T[]) => {
    if (selected.length === size) {
      result.push([...selected]);
      return;
    }

    for (let index = start; index <= items.length - (size - selected.length); index += 1) {
      selected.push(items[index]);
      walk(index + 1, selected);
      selected.pop();
    }
  };

  walk(0, []);
  return result;
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

const sortByProbability = (picks: ScorePick[]) => picks.sort((a, b) => b.probability - a.probability);

const getLikelyHighScores = (analysis: MatchAnalysis) => analysis.matrix
  .filter((pick) => pick.homeGoals + pick.awayGoals >= 3)
  .slice(0, 12);

const getCoverageScores = (analysis: MatchAnalysis) => {
  const midScorePool = analysis.matrix.filter((pick) => pick.homeGoals + pick.awayGoals === 3).slice(0, 2);
  return uniqueByLabel([...analysis.matrix.slice(0, 3), ...midScorePool]).slice(0, 5);
};

const getUpsetScores = (analysis: MatchAnalysis) => {
  const basePool = analysis.matrix.slice(3, 6);
  const highScorePool = getLikelyHighScores(analysis).slice(0, 4);
  return uniqueByLabel([...basePool, ...highScorePool, ...analysis.matrix.slice(6)]).slice(0, 5);
};

export const getScoreLayers = (analysis: MatchAnalysis) => {
  const mainline = analysis.matrix.slice(0, 2);
  const coverage = getCoverageScores(analysis);
  const upset = getUpsetScores(analysis);
  const mixed = uniqueByLabel([...mainline, ...coverage, ...upset]).slice(0, 6);

  return { mainline, coverage, upset, mixed };
};

export const getStrategyCandidates = (
  analysis: MatchAnalysis,
  strategy: BaseComboStrategy,
): ScorePick[] => {
  if (strategy === 'safe') {
    return analysis.matrix.slice(0, 1);
  }

  if (strategy === 'balanced') {
    return analysis.matrix.slice(0, 3);
  }

  if (strategy === 'mainline') {
    return getScoreLayers(analysis).mainline;
  }

  if (strategy === 'coverage') {
    return getScoreLayers(analysis).coverage;
  }

  if (strategy === 'upset') {
    return getScoreLayers(analysis).upset;
  }

  if (strategy === 'mixed') {
    return getScoreLayers(analysis).mixed;
  }

  if (strategy === 'goals') {
    const midScorePool = analysis.matrix.filter((pick) => pick.homeGoals + pick.awayGoals === 3).slice(0, 3);
    const highScorePool = analysis.matrix.filter((pick) => pick.homeGoals + pick.awayGoals >= 4).slice(0, 6);
    const lowScorePool = analysis.matrix.filter((pick) => pick.homeGoals + pick.awayGoals <= 2).slice(0, 3);
    const merged = sortByProbability(uniqueByLabel([
      analysis.mostLikely,
      ...midScorePool,
      ...highScorePool,
      ...lowScorePool,
    ]));
    return uniqueByLabel([...merged, ...analysis.matrix]).slice(0, 10);
  }

  if (strategy === 'highScore') {
    const direction = analysis.homeLambda - analysis.awayLambda;
    const highScores = getLikelyHighScores(analysis);
    const alignedScores = highScores.filter((pick) => {
      if (Math.abs(direction) < 0.15) {
        return true;
      }

      return direction > 0 ? pick.homeGoals >= pick.awayGoals : pick.awayGoals >= pick.homeGoals;
    });

    return uniqueByLabel([...alignedScores, ...highScores]).slice(0, 8);
  }

  const basePool = analysis.matrix.slice(3, 6);
  const highScorePool = getStrategyCandidates(analysis, 'highScore');
  const merged = sortByProbability(uniqueByLabel([...basePool, ...highScorePool]))
    .slice(0, 8);

  if (merged.length >= 3) {
    return merged;
  }

  const filled = uniqueByLabel([...merged, ...analysis.matrix.slice(6)]).slice(0, 3);
  return filled.length > 0 ? filled : analysis.matrix.slice(0, 1);
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const getRandomStrategy = (seed: number, groupId: string, matchId: string): BaseComboStrategy => {
  const stableIndex = (hashString(`${groupId}:${matchId}`) + seed) % BASE_STRATEGIES.length;
  return BASE_STRATEGIES[stableIndex];
};

const resolveStrategy = (
  strategy: ComboStrategy,
  seed: number,
  groupId: string,
  matchId: string,
): BaseComboStrategy => (strategy === 'random' ? getRandomStrategy(seed, groupId, matchId) : strategy);

const PLAN_LIMIT = 5;

type PartialComboPlan = {
  picks: ComboPlanPick[];
  jointProbability: number;
};

const crossProductPlans = (
  matches: MatchAnalysis[],
  strategy: ComboStrategy,
  randomSeed: number,
  groupId: string,
): ComboPlan[] => {
  const candidates = matches.map((match) => {
    const strategyUsed = resolveStrategy(strategy, randomSeed, groupId, match.matchId);
    return {
      strategyUsed,
      scores: getStrategyCandidates(match, strategyUsed),
    };
  });

  let beam: PartialComboPlan[] = [{ picks: [], jointProbability: 1 }];

  matches.forEach((match, matchIndex) => {
    const expanded: PartialComboPlan[] = [];

    for (const plan of beam) {
      for (const score of candidates[matchIndex].scores) {
        expanded.push({
          picks: [
            ...plan.picks,
            {
              matchId: match.matchId,
              homeName: match.homeName,
              awayName: match.awayName,
              score,
              strategyUsed: candidates[matchIndex].strategyUsed,
            },
          ],
          jointProbability: plan.jointProbability * score.probability,
        });
      }
    }

    beam = expanded.sort((a, b) => b.jointProbability - a.jointProbability).slice(0, PLAN_LIMIT);
  });

  return beam.map((plan) => ({
    id: plan.picks.map((pick) => `${pick.matchId}:${pick.score.label}`).join('|'),
    picks: plan.picks,
    jointProbability: plan.jointProbability,
  }));
};

export const buildComboGroups = (
  analyses: MatchAnalysis[],
  comboType: number,
  strategy: ComboStrategy,
  randomSeed = 0,
): ComboGroup[] => {
  const groups = combinations(analyses, comboType).map((matches, index) => {
    const groupId = matches.map((match) => match.matchId).join('-') || `group-${index + 1}`;
    const plans = crossProductPlans(matches, strategy, randomSeed, groupId);
    return {
      id: groupId,
      matches,
      plans,
      bestJointProbability: plans[0]?.jointProbability ?? 0,
    };
  });

  return groups.sort((a, b) => b.bestJointProbability - a.bestJointProbability);
};

export const formatProbability = (value: number) => `${(value * 100).toFixed(2)}%`;

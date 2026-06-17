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
  balanced: '平衡',
  underdog: '博冷',
  goals: '大小球倾向',
  highScore: '大比分激进',
};

const BASE_STRATEGIES: BaseComboStrategy[] = ['balanced', 'underdog', 'goals', 'highScore'];

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

  if (strategy === 'goals') {
    const highScorePool = analysis.matrix.filter((pick) => pick.homeGoals + pick.awayGoals >= 4).slice(0, 3);
    const lowScorePool = analysis.matrix.filter((pick) => pick.homeGoals + pick.awayGoals <= 2).slice(0, 3);
    const merged = uniqueByLabel([analysis.mostLikely, ...highScorePool, ...lowScorePool])
      .sort((a, b) => b.probability - a.probability);
    return uniqueByLabel([...merged, ...analysis.matrix]).slice(0, 6);
  }

  if (strategy === 'highScore') {
    const highScores = analysis.matrix.filter((pick) => pick.homeGoals + pick.awayGoals >= 4);
    return uniqueByLabel(highScores).slice(0, 6);
  }

  const basePool = analysis.matrix.slice(3, 6);
  const highScorePool = analysis.matrix.filter((pick) => pick.homeGoals + pick.awayGoals >= 4);
  const merged = uniqueByLabel([...basePool, ...highScorePool])
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 6);

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
  const plans: ComboPlan[] = [];

  const walk = (matchIndex: number, picks: ComboPlanPick[], jointProbability: number) => {
    if (matchIndex === matches.length) {
      plans.push({
        id: picks.map((pick) => `${pick.matchId}:${pick.score.label}`).join('|'),
        picks: [...picks],
        jointProbability,
      });
      return;
    }

    const match = matches[matchIndex];
    for (const score of candidates[matchIndex].scores) {
      picks.push({
        matchId: match.matchId,
        homeName: match.homeName,
        awayName: match.awayName,
        score,
        strategyUsed: candidates[matchIndex].strategyUsed,
      });
      walk(matchIndex + 1, picks, jointProbability * score.probability);
      picks.pop();
    }
  };

  walk(0, [], 1);
  return plans.sort((a, b) => b.jointProbability - a.jointProbability).slice(0, 5);
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

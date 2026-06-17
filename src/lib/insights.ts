import type { MatchAnalysis } from '../types';

export type InsightTone = 'muted' | 'low' | 'normal' | 'high' | 'extreme';

export type MetricInsight = {
  range: string;
  label: string;
  short: string;
  tooltip: string;
  bettingHint: string;
  tone: InsightTone;
};

type InsightBand = MetricInsight & {
  min?: number;
  max?: number;
};

export const XG_INSIGHT_BANDS: InsightBand[] = [
  {
    max: 0.4,
    range: '< 0.40',
    label: '进攻瘫痪',
    short: '纯摆大巴',
    tooltip: '全场龟缩防守，基本放弃主动进攻，破门只能依赖对手巨大失误。',
    bettingHint: '单边绝对无球，适合关注单队 0 球。',
    tone: 'muted',
  },
  {
    min: 0.4,
    max: 0.8,
    range: '0.40 ~ 0.79',
    label: '难越雷池',
    short: '破门乏术',
    tooltip: '零星远射或勉强头球为主，缺乏真正的门前绝对机会。',
    bettingHint: '单边上限极难破 1，适合看 0-1 球。',
    tone: 'low',
  },
  {
    min: 0.8,
    max: 1.2,
    range: '0.80 ~ 1.19',
    label: '传控受阻',
    short: '临门欠佳',
    tooltip: '能推进到禁区附近，但打不透防线，容易出现得势不得分。',
    bettingHint: '常见干打雷不下雨，进 1 球较合理。',
    tone: 'low',
  },
  {
    min: 1.2,
    max: 1.6,
    range: '1.20 ~ 1.59',
    label: '常规火力',
    short: '均势拉锯',
    tooltip: '战术正常运转，全场能创造 1-2 次标准机会。',
    bettingHint: '稳健基准线，单边 1-2 球更自然。',
    tone: 'normal',
  },
  {
    min: 1.6,
    max: 2,
    range: '1.60 ~ 1.99',
    label: '攻势如潮',
    short: '压制防线',
    tooltip: '边路突击和中路渗透频繁，对手防线开始顾此失彼。',
    bettingHint: '单边 2 球稳，破 3 球概率抬头。',
    tone: 'high',
  },
  {
    min: 2,
    max: 2.6,
    range: '2.00 ~ 2.59',
    label: '降维打击',
    short: '狂轰滥炸',
    tooltip: '强队持续高压，射门次数极多，对手防线随时可能崩溃。',
    bettingHint: '单边大球信号，3 球起步倾向增强。',
    tone: 'high',
  },
  {
    min: 2.6,
    range: '≥ 2.60',
    label: '惨案临界',
    short: '毁灭倾泻',
    tooltip: '极端实力悬殊，比赛可能变成半场攻防演练。',
    bettingHint: '惨案局，单边可关注 4+ 或 5+。',
    tone: 'extreme',
  },
];

export const PACE_INSIGHT_BANDS: InsightBand[] = [
  {
    min: 0.8,
    max: 0.85,
    range: '0.8',
    label: '催眠闷局',
    short: '窒息缠斗',
    tooltip: '双方极度保守，节奏被压慢，中场缠斗和犯规拖碎比赛。',
    bettingHint: '极度利好 2.5 小，甚至 1.5 小。',
    tone: 'muted',
  },
  {
    min: 0.85,
    max: 0.95,
    range: '0.9',
    label: '淘汰赛思维',
    short: '极度谨慎',
    tooltip: '不犯错优先，防守站位紧凑，主要依赖反击或定位球。',
    bettingHint: '倾向平局、0-0、1-1、1-0。',
    tone: 'low',
  },
  {
    min: 0.95,
    max: 1.05,
    range: '1.0',
    label: '标准步调',
    short: '联赛常态',
    tooltip: '攻防按常规节奏拉锯，阵地战和转换都有空间。',
    bettingHint: '概率分布均衡，主要看硬实力。',
    tone: 'normal',
  },
  {
    min: 1.05,
    max: 1.15,
    range: '1.1',
    label: '提速对攻',
    short: '战术开放',
    tooltip: '球权转换频繁，投入进攻人数增加，进球机会明显抬头。',
    bettingHint: '2.5 大球信号，双方破门概率提升。',
    tone: 'high',
  },
  {
    min: 1.15,
    range: '1.2 ~ 1.3',
    label: '亡命狂飙',
    short: '彻底失控',
    tooltip: '互爆局，防守中场被放弃，后防线暴露巨大空间。',
    bettingHint: '更容易诞生 3-2、4-2 等大比分。',
    tone: 'extreme',
  },
];

export const CONFIDENCE_INSIGHT_BANDS: InsightBand[] = [
  {
    max: 0.06,
    range: '< 6.00%',
    label: '诸神混乱',
    short: '乱战神仙局',
    tooltip: '比分概率极度扁平，模型对任何特定比分都没有把握。',
    bettingHint: '剧本发散，谨慎押单一精准比分。',
    tone: 'extreme',
  },
  {
    min: 0.06,
    max: 0.08,
    range: '6.00% ~ 7.99%',
    label: '群雄逐鹿',
    short: '多线分流',
    tooltip: '胜负难料，多种比分概率接近，比赛剧本较多。',
    bettingHint: '更适合多比分覆盖。',
    tone: 'high',
  },
  {
    min: 0.08,
    max: 0.1,
    range: '8.00% ~ 9.99%',
    label: '黄金基准',
    short: '普通常态',
    tooltip: '标准足球比分概率，Top1 多为 1-0、1-1 或 2-1。',
    bettingHint: '经典数学期望区间。',
    tone: 'normal',
  },
  {
    min: 0.1,
    max: 0.12,
    range: '10.00% ~ 11.99%',
    label: '方向明朗',
    short: '优势倾斜',
    tooltip: '数据开始靠拢，变量减少，优势或低比分倾向变清晰。',
    bettingHint: '可围绕 Top1/Top2 做主线。',
    tone: 'normal',
  },
  {
    min: 0.12,
    max: 0.14,
    range: '12.00% ~ 13.99%',
    label: '高度聚拢',
    short: '精准狙击',
    tooltip: '模型对特定比分信心较高，其他冷门比分被明显压低。',
    bettingHint: '高信心精准比分区间。',
    tone: 'high',
  },
  {
    min: 0.14,
    max: 0.16,
    range: '14.00% ~ 15.99%',
    label: '铁索横江',
    short: '极端死锚',
    tooltip: '战术变量被压到很窄，比分强烈收敛到一个或两个结果。',
    bettingHint: '可重点关注 Top1 和邻近比分。',
    tone: 'extreme',
  },
  {
    min: 0.16,
    range: '≥ 16.00%',
    label: '数学奇迹',
    short: '绝对锁定',
    tooltip: '理论极限级别收敛，模型几乎在单挑某一个确定赛果。',
    bettingHint: '极高置信，但仍只作为概率参考。',
    tone: 'extreme',
  },
];

const findBand = (value: number, bands: InsightBand[]) =>
  bands.find((band) => (band.min === undefined || value >= band.min) && (band.max === undefined || value < band.max)) ??
  bands[bands.length - 1];

export const getXgInsight = (lambda: number): MetricInsight => findBand(lambda, XG_INSIGHT_BANDS);

export const getPaceInsight = (paceFactor: number): MetricInsight => findBand(paceFactor, PACE_INSIGHT_BANDS);

export const getConfidenceInsight = (top1Probability: number): MetricInsight =>
  findBand(top1Probability, CONFIDENCE_INSIGHT_BANDS);

export const getMatchVerdict = (analysis: MatchAnalysis) => {
  const totalXg = analysis.homeLambda + analysis.awayLambda;
  const confidence = analysis.mostLikely.probability;

  if (analysis.paceFactor <= 0.8 && confidence >= 0.16) {
    return '低节奏 + 高置信收敛，本场更偏向小比分锁定局。';
  }

  if (analysis.paceFactor <= 0.9 && totalXg <= 2.2) {
    return '节奏谨慎且总 xG 偏低，本场更像低比分缠斗。';
  }

  if (analysis.paceFactor >= 1.1 && totalXg >= 3) {
    return '节奏开放且火力充足，本场大球和多比分分流更明显。';
  }

  if (Math.abs(analysis.homeLambda - analysis.awayLambda) >= 1) {
    return '双方火力差拉开，比赛更偏单边压制剧本。';
  }

  return '指标处于常规区间，本场更适合结合 Top3 比分做均衡覆盖。';
};

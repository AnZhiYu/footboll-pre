import { Clipboard, Database, Upload } from 'lucide-react';
import { useState } from 'react';
import { parseMatchPairs, parseTeamProfiles } from '../lib/teamImport';
import type { TeamProfile } from '../types';

const TEMPLATE = `[
  [
    {
      "team": "捷克",
      "attack": 67,
      "defense": 64,
      "stability": 64,
      "pace": 48
    },
    {
      "team": "南非",
      "attack": 59,
      "defense": 60,
      "stability": 58,
      "pace": 50
    }
  ],
  [
    {
      "team": "瑞士",
      "attack": 75,
      "defense": 80,
      "stability": 83,
      "pace": 46
    },
    {
      "team": "波黑",
      "attack": 66,
      "defense": 60,
      "stability": 61,
      "pace": 54
    }
  ],
  [
    {
      "team": "加拿大",
      "attack": 74,
      "defense": 65,
      "stability": 67,
      "pace": 61
    },
    {
      "team": "卡塔尔",
      "attack": 50,
      "defense": 50,
      "stability": 48,
      "pace": 45
    }
  ],
  [
    {
      "team": "墨西哥",
      "attack": 74,
      "defense": 73,
      "stability": 75,
      "pace": 52
    },
    {
      "team": "韩国",
      "attack": 75,
      "defense": 68,
      "stability": 71,
      "pace": 59
    }
  ],
  [
    {
      "team": "美国",
      "attack": 79,
      "defense": 74,
      "stability": 72,
      "pace": 68
    },
    {
      "team": "澳大利亚",
      "attack": 67,
      "defense": 73,
      "stability": 76,
      "pace": 52
    }
  ],
  [
    {
      "team": "苏格兰",
      "attack": 69,
      "defense": 71,
      "stability": 72,
      "pace": 55
    },
    {
      "team": "摩洛哥",
      "attack": 82,
      "defense": 85,
      "stability": 84,
      "pace": 58
    }
  ],
  [
    {
      "team": "巴西",
      "attack": 91,
      "defense": 84,
      "stability": 82,
      "pace": 67
    },
    {
      "team": "海地",
      "attack": 46,
      "defense": 42,
      "stability": 44,
      "pace": 56
    }
  ],
  [
    {
      "team": "土耳其",
      "attack": 74,
      "defense": 72,
      "stability": 71,
      "pace": 60
    },
    {
      "team": "巴拉圭",
      "attack": 68,
      "defense": 76,
      "stability": 77,
      "pace": 49
    }
  ]
]`;

const AI_SCORING_PROMPT = `你是一名职业足球数据分析师，熟悉世界杯、洲际杯与国家队战术体系。

请基于我提供的比赛列表，对每支球队进行量化评分，并严格输出可导入工具的 JSON。

核心要求：
- 评分范围全部为 0~100 的整数。
- 必须按照现实比赛风格评估，不要只按球星名气或纸面身价。
- 必须考虑国家队大赛环境：更谨慎、更低容错、更重视防守纪律。
- 防守强队不一定进攻高；控球型球队可能久攻不下；防反球队节奏可能快但控球不高。
- pace 表示比赛节奏倾向，50 为中性平均值；低于 50 偏谨慎保守，高于 50 偏开放提速。
- 不要输出 Markdown，不要输出解释，不要输出注释，不要在 JSON 外输出任何文字。

评分维度：
1. attack：进球能力、射门效率、反击速度、关键球能力。
2. defense：防守稳定性、丢球控制、门将能力、防线组织。
3. stability：大赛抗压、是否容易崩盘、发挥波动、战术执行一致性。
4. pace：控球推进、高压逼抢、开放程度、转换速度、保守程度。

参考区间：
- 世界顶级强队：85~95
- 一流强队：75~85
- 中上游球队：65~75
- 中游球队：55~65
- 弱队：40~55
- 明显鱼腩：30~40

输出格式必须是 JSON 数组。若我提供的是比赛对阵，请输出二维数组，每一场正好两个球队对象：
[
  [
    {
      "team": "球队A",
      "attack": 0,
      "defense": 0,
      "stability": 0,
      "pace": 50
    },
    {
      "team": "球队B",
      "attack": 0,
      "defense": 0,
      "stability": 0,
      "pace": 50
    }
  ]
]

现在请分析以下比赛，并只返回严格 JSON：

北京时间：请填入日期
比赛列表：
1. 球队A vs 球队B
2. 球队C vs 球队D`;

type TeamImportPanelProps = {
  teams: TeamProfile[];
  onImportTeams: (profiles: TeamProfile[]) => void;
  onImportMatches: (pairs: [TeamProfile, TeamProfile][]) => void;
  onUseTeam: (profile: TeamProfile) => void;
};

export function TeamImportPanel({ teams, onImportTeams, onImportMatches, onUseTeam }: TeamImportPanelProps) {
  const [open, setOpen] = useState(false);
  const [rawValue, setRawValue] = useState(TEMPLATE);
  const [message, setMessage] = useState('');

  const copyAiPrompt = async () => {
    await navigator.clipboard?.writeText(AI_SCORING_PROMPT);
    setMessage('AI评分提示词已复制，可直接粘贴给 AI 生成导入 JSON');
  };

  const importTeams = () => {
    const matchPairs = parseMatchPairs(rawValue);
    if (matchPairs.ok) {
      onImportMatches(matchPairs.pairs);
      setMessage(`已导入 ${matchPairs.pairs.length} 场比赛`);
      setOpen(false);
      return;
    }

    const parsed = parseTeamProfiles(rawValue);
    if (!parsed.ok) {
      setMessage(`${matchPairs.error}；${parsed.error}`);
      return;
    }

    onImportTeams(parsed.profiles);
    setMessage(`已导入 ${parsed.profiles.length} 支球队`);
    setOpen(false);
  };

  return (
    <section className="panel team-panel">
      <div className="panel-heading">
        <div>
          <p>球队库</p>
          <strong>{teams.length} 支</strong>
        </div>
        <button className="secondary-button" type="button" onClick={() => setOpen((value) => !value)}>
          <Upload size={17} />
          导入球队数据
        </button>
      </div>

      {open ? (
        <div className="team-import-box">
          <label>
            球队数据 JSON
            <textarea
              aria-label="球队数据 JSON"
              value={rawValue}
              onChange={(event) => setRawValue(event.target.value)}
              rows={9}
            />
          </label>
          <div className="import-actions">
            <button className="secondary-button" type="button" onClick={() => setRawValue(TEMPLATE)}>
              <Clipboard size={16} />
              填入模版
            </button>
            <button className="secondary-button" type="button" onClick={copyAiPrompt}>
              <Clipboard size={16} />
              复制AI评分提示词
            </button>
            <button className="primary-button" type="button" onClick={importTeams}>
              <Database size={16} />
              确认导入
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="import-message">{message}</p> : null}

      {teams.length > 0 ? (
        <div className="team-list">
          {teams.map((team) => (
            <button
              className="team-chip"
              type="button"
              key={team.team}
              aria-label={`使用球队 ${team.team}`}
              onClick={() => onUseTeam(team)}
            >
              <strong>{team.team}</strong>
              <span>
                攻 {team.attack} / 防 {team.defense} / 稳 {team.stability} / 节 {team.pace ?? 50}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

import { Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { Match, TeamProfile, TeamStats } from '../types';

const defaultStats = { attack: 70, defense: 70, stability: 70 };

type MatchFormProps = {
  onAddMatch: (match: Match) => void;
  selectedTeam?: TeamProfile | null;
};

const createId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function MatchForm({ onAddMatch, selectedTeam }: MatchFormProps) {
  const [homeName, setHomeName] = useState('');
  const [awayName, setAwayName] = useState('');
  const [homeStats, setHomeStats] = useState<TeamStats>({ ...defaultStats });
  const [awayStats, setAwayStats] = useState<TeamStats>({ ...defaultStats });
  const [nextSide, setNextSide] = useState<'home' | 'away'>('home');

  useEffect(() => {
    if (!selectedTeam) {
      return;
    }

    const profileStats = {
      attack: selectedTeam.attack,
      defense: selectedTeam.defense,
      stability: selectedTeam.stability,
    };
    if (nextSide === 'home') {
      setHomeName(selectedTeam.team);
      setHomeStats(profileStats);
      setNextSide('away');
    } else {
      setAwayName(selectedTeam.team);
      setAwayStats(profileStats);
      setNextSide('home');
    }
  }, [selectedTeam]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedHome = homeName.trim();
    const trimmedAway = awayName.trim();
    if (!trimmedHome || !trimmedAway) {
      return;
    }

    onAddMatch({
      id: createId(),
      homeName: trimmedHome,
      awayName: trimmedAway,
      homeStats: { ...homeStats },
      awayStats: { ...awayStats },
    });
    setHomeName('');
    setAwayName('');
    setHomeStats({ ...defaultStats });
    setAwayStats({ ...defaultStats });
    setNextSide('home');
  };

  return (
    <form className="match-form" onSubmit={handleSubmit}>
      <label>
        球队A名称
        <input
          aria-label="球队A名称"
          value={homeName}
          placeholder="例如 英格兰"
          onChange={(event) => setHomeName(event.target.value)}
        />
      </label>
      <label>
        球队B名称
        <input
          aria-label="球队B名称"
          value={awayName}
          placeholder="例如 美国"
          onChange={(event) => setAwayName(event.target.value)}
        />
      </label>
      <button className="primary-button" type="submit">
        <Plus size={18} />
        新增赛事
      </button>
    </form>
  );
}

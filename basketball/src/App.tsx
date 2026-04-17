import { useEffect, useState } from 'react';
import './App.css';

const STATS = ['Fouls', 'Points', 'Rebounds', 'Assists'] as const;
type Stat = (typeof STATS)[number];

const STAT_LABELS: Record<Stat, string> = {
  Fouls: 'FOUL',
  Points: 'PTS',
  Rebounds: 'REB',
  Assists: 'AST',
};

type PlayerStats = Record<Stat, number>;

interface Player {
  id: number;
  name: string;
  stats: PlayerStats;
}

interface StoredState {
  players: Player[];
  nextId: number;
}

const STORAGE_KEY = 'basketball-stats-tracker:v1';

function emptyStats(): PlayerStats {
  return { Fouls: 0, Points: 0, Rebounds: 0, Assists: 0 };
}

function loadState(): StoredState {
  if (typeof window === 'undefined') return { players: [], nextId: 1 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { players: [], nextId: 1 };
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const players = Array.isArray(parsed.players)
      ? parsed.players.map((p) => ({
          id: Number(p.id),
          name: String(p.name),
          stats: { ...emptyStats(), ...(p.stats ?? {}) },
        }))
      : [];
    const maxId = players.reduce((m, p) => Math.max(m, p.id), 0);
    const nextId =
      typeof parsed.nextId === 'number' && parsed.nextId > maxId
        ? parsed.nextId
        : maxId + 1;
    return { players, nextId };
  } catch {
    return { players: [], nextId: 1 };
  }
}

export default function App() {
  const initial = loadState();
  const [players, setPlayers] = useState<Player[]>(initial.players);
  const [nameInput, setNameInput] = useState('');
  const [nextId, setNextId] = useState(initial.nextId);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ players, nextId }),
      );
    } catch {
      // Storage full or disabled; ignore.
    }
  }, [players, nextId]);

  function addPlayer() {
    const name = nameInput.trim();
    if (!name) return;
    setPlayers((prev) => [...prev, { id: nextId, name, stats: emptyStats() }]);
    setNextId((n) => n + 1);
    setNameInput('');
  }

  function increment(playerId: number, stat: Stat) {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, stats: { ...p.stats, [stat]: p.stats[stat] + 1 } }
          : p,
      ),
    );
  }

  function decrement(playerId: number, stat: Stat) {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? {
              ...p,
              stats: { ...p.stats, [stat]: Math.max(0, p.stats[stat] - 1) },
            }
          : p,
      ),
    );
  }

  function removePlayer(playerId: number) {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }

  function resetAll() {
    setPlayers((prev) => prev.map((p) => ({ ...p, stats: emptyStats() })));
  }

  return (
    <div className="app">
      <header>
        <h1>Basketball Stats Tracker</h1>
      </header>

      <section className="controls">
        <input
          type="text"
          placeholder="Player name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addPlayer();
          }}
        />
        <button onClick={addPlayer} disabled={!nameInput.trim()}>
          Add Player
        </button>
        {players.length > 0 && (
          <button className="secondary" onClick={resetAll}>
            Reset Stats
          </button>
        )}
      </section>

      {players.length === 0 ? (
        <p className="empty">Add a player to get started.</p>
      ) : (
        <div className="grid-wrapper">
          <table className="grid">
            <thead>
              <tr>
                <th className="player-col">Player</th>
                {STATS.map((s) => (
                  <th key={s}>{STAT_LABELS[s]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td className="player-col">
                    <span className="player-name">{p.name}</span>
                    <button
                      className="remove-btn"
                      onClick={() => removePlayer(p.id)}
                      aria-label={`Remove ${p.name}`}
                    >
                      ×
                    </button>
                  </td>
                  {STATS.map((s) => (
                    <td key={s} className="stat-cell">
                      <button
                        className="stat-btn"
                        onClick={() => increment(p.id, s)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          decrement(p.id, s);
                        }}
                        title="Tap to add. Right-click to subtract."
                      >
                        {p.stats[s]}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">
            Tap a cell to +1. Right-click (or long-press) to -1.
          </p>
        </div>
      )}
    </div>
  );
}

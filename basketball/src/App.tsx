import { useState } from 'react';
import './App.css';

const STATS = ['Fouls', 'Points', 'Rebounds', 'Assists'] as const;
type Stat = (typeof STATS)[number];

type PlayerStats = Record<Stat, number>;

interface Player {
  id: number;
  name: string;
  stats: PlayerStats;
}

function emptyStats(): PlayerStats {
  return { Fouls: 0, Points: 0, Rebounds: 0, Assists: 0 };
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [nextId, setNextId] = useState(1);

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
                  <th key={s}>{s}</th>
                ))}
                <th aria-label="Remove"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td className="player-col">{p.name}</td>
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
                  <td>
                    <button
                      className="remove-btn"
                      onClick={() => removePlayer(p.id)}
                      aria-label={`Remove ${p.name}`}
                    >
                      ×
                    </button>
                  </td>
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

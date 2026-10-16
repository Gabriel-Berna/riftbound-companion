import { createMatch, gameWins, matchWinner, type MatchState } from '../engine/match'
import type { AppAction } from '../store'

export function MatchOverScreen({ match, dispatch }: { match: MatchState; dispatch: (a: AppAction) => void }) {
  const winner = matchWinner(match)
  const wins = gameWins(match)
  const name = (p: 0 | 1) => match.players[p].name

  return (
    <main className="screen setup">
      <header className="brand">
        <h1>{winner === null ? 'Empate' : <><span className={`c${winner}`}>{name(winner)}</span> venceu!</>}</h1>
        {match.format === 'match' && (
          <p className="match-score">
            <span className="c0">{name(0)}</span> {wins[0]} × {wins[1]} <span className="c1">{name(1)}</span>
          </p>
        )}
      </header>

      <section className="card">
        <h2>Jogos</h2>
        <ol className="games">
          {match.games.map((g, i) => (
            <li key={i}>
              <div>
                <b>Jogo {i + 1}</b>:{' '}
                {g.result.kind === 'draw' ? 'empate' : <span className={`c${g.result.winner}`}>{name(g.result.winner)}</span>}
                {g.result.kind === 'win' && g.result.reason === 'concede' && ' (concessão)'}
              </div>
              <div className="hint">
                {g.finalPoints[0]} × {g.finalPoints[1]} · {g.battlefields.join(' e ')} · {name(g.firstPlayer)} começou
              </div>
            </li>
          ))}
        </ol>
      </section>

      <button className="primary big" onClick={() => dispatch({ type: 'newMatch', match: createMatch(match.format, match.players) })}>
        Revanche
      </button>
      <button className="secondary" onClick={() => dispatch({ type: 'quit' })}>
        Nova partida
      </button>
    </main>
  )
}

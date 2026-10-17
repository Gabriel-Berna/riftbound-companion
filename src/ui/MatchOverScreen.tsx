import { createMatch, gameWins, matchWinner, type MatchState } from '../engine/match'
import type { AppAction } from '../store'
import { findLegend } from '../data/cards'
import { Brand } from './common'

export function MatchOverScreen({ match, dispatch, onStats }: { match: MatchState; dispatch: (a: AppAction) => void; onStats: () => void }) {
  const winner = matchWinner(match)
  const wins = gameWins(match)
  const name = (p: 0 | 1) => match.players[p].name

  return (
    <main className="screen setup">
      <Brand
        title={winner === null ? 'Empate' : <><span className={`c${winner}`}>{name(winner)}</span> venceu!</>}
        subtitle={
          match.format === 'match' && (
            <span className="match-score">
              <span className="c0">{name(0)}</span> {wins[0]} × {wins[1]} <span className="c1">{name(1)}</span>
            </span>
          )
        }
      />

      {match.players.some((pl) => findLegend(pl.legend)) && (
        <section className="card">
          <h2>Lendas</h2>
          {([0, 1] as const).map((p) => {
            const legend = findLegend(match.players[p].legend)
            return (
              <p key={p} className="legend-line">
                <b className={`c${p}`}>{name(p)}</b>: {legend ? `${legend.champion} — ${legend.name}` : 'não informada'}
              </p>
            )
          })}
        </section>
      )}

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
      <button className="link" onClick={onStats}>
        Partida salva nas estatísticas · ver estatísticas
      </button>
    </main>
  )
}

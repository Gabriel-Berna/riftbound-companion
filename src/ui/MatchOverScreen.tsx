import { useState } from 'react'
import { createMatch, gameWins, matchWinner, type MatchState } from '../engine/match'
import { campaign, eventSummary, type TcgEvent } from '../engine/events'
import type { MatchRecord } from '../engine/stats'
import type { AppAction } from '../store'
import { findLegend } from '../data/cards'
import { Brand } from './common'
import { shareResult } from './share'

export function MatchOverScreen(props: {
  match: MatchState
  /** Evento desta partida, se houver; a campanha conta os registros (esta partida já está neles). */
  event: TcgEvent | null
  records: MatchRecord[]
  dispatch: (a: AppAction) => void
  onStats: () => void
  onNextRound: () => void
  onEvent: () => void
}) {
  const { match, dispatch, onStats, event } = props
  const winner = matchWinner(match)
  const wins = gameWins(match)
  const name = (p: 0 | 1) => match.players[p].name
  const [sharing, setSharing] = useState(false)
  const share = async () => {
    setSharing(true)
    try {
      await shareResult({ format: match.format, players: match.players, games: match.games, date: new Date().toISOString() })
    } catch {
      alert('Não foi possível gerar a imagem.')
    } finally {
      setSharing(false)
    }
  }

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

      {event && (
        <section className="event-banner">
          <span aria-hidden="true">🏆</span>
          <span>
            <b>
              {event.name} · Rodada {match.round}
            </b>
            <small>Campanha no evento</small>
          </span>
          <span className="event-row-campaign">{campaign(eventSummary(event, props.records).record)}</span>
        </section>
      )}

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

      <button className="secondary share-btn" onClick={share} disabled={sharing}>
        {sharing ? 'Gerando imagem…' : '📤 Compartilhar resultado'}
      </button>
      {event ? (
        <>
          {/* No evento, o próximo passo é a próxima rodada (outro oponente), não uma revanche fora do evento. */}
          {!event.closed && (
            <button className="primary big" onClick={props.onNextRound}>
              ⚔ Próxima rodada
            </button>
          )}
          <button className="secondary" onClick={props.onEvent}>
            Ver o evento
          </button>
        </>
      ) : (
        <>
          <button className="primary big" onClick={() => dispatch({ type: 'newMatch', match: createMatch(match.format, match.players, match.timer?.minutes) })}>
            Revanche
          </button>
          <button className="secondary" onClick={() => dispatch({ type: 'quit' })}>
            Nova partida
          </button>
        </>
      )}
      <button className="link" onClick={onStats}>
        Partida salva nas estatísticas · ver estatísticas
      </button>
    </main>
  )
}

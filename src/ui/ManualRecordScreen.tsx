import { useState } from 'react'
import { findLegend } from '../data/cards'
import type { CompletedGame, MatchFormat } from '../engine/match'
import { nextRound, type TcgEvent } from '../engine/events'
import type { MatchRecord } from '../engine/stats'
import type { PlayerIndex } from '../engine/types'
import { newId, type AppAction } from '../store'
import { LegendPicker, LegendTile } from './cards'
import { Brand } from './common'

type GameOutcome = 'win' | 'loss' | 'draw'

interface GameDraft {
  firstPlayer: PlayerIndex
  outcome: GameOutcome
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toGame(g: GameDraft): CompletedGame {
  return {
    result: g.outcome === 'draw' ? { kind: 'draw' } : { kind: 'win', winner: g.outcome === 'win' ? 0 : 1, reason: 'points' },
    battlefields: ['', ''],
    firstPlayer: g.firstPlayer,
    finalPoints: [0, 0],
  }
}

/** Registro de uma partida jogada sem o placar do app. */
export function ManualRecordScreen(props: {
  myName: string
  myLegend?: string
  opponents: string[]
  /** Evento em andamento: a partida registrada pode contar como a próxima rodada. */
  activeEvent: TcgEvent | null
  records: MatchRecord[]
  dispatch: (a: AppAction) => void
  onDone: () => void
}) {
  const { activeEvent } = props
  const [inEvent, setInEvent] = useState(!!activeEvent)
  const round = activeEvent ? nextRound(activeEvent, props.records) : 0
  const [date, setDate] = useState(today)
  const [myName, setMyName] = useState(props.myName)
  const [opponent, setOpponent] = useState('')
  const [legends, setLegends] = useState<[string, string]>([props.myLegend ?? '', ''])
  const [pickingLegend, setPickingLegend] = useState<0 | 1 | null>(null)
  const [format, setFormat] = useState<MatchFormat>('match')
  const [games, setGames] = useState<GameDraft[]>([{ firstPlayer: 0, outcome: 'win' }])

  const setGame = (i: number, patch: Partial<GameDraft>) => setGames((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)))

  const save = () => {
    const record: MatchRecord = {
      id: newId(),
      // Meio-dia local, para a data não mudar com o fuso horário.
      date: new Date(`${date}T12:00:00`).toISOString(),
      format,
      players: [
        { name: myName.trim() || 'Você', battlefields: ['', '', ''], ...(legends[0] && { legend: legends[0] }) },
        { name: opponent.trim() || 'Oponente', battlefields: ['', '', ''], ...(legends[1] && { legend: legends[1] }) },
      ],
      games: (format === 'duel' ? games.slice(0, 1) : games).map(toGame),
      source: 'manual',
      ...(activeEvent && inEvent && { eventId: activeEvent.id, round }),
    }
    props.dispatch({ type: 'addRecord', record })
    props.onDone()
  }

  return (
    <main className="screen setup">
      <button className="link back" onClick={props.onDone}>
        ← Voltar
      </button>
      <Brand title="Registrar partida" subtitle="Para partidas jogadas sem o placar do app" />

      <section className="card">
        <label className="field">
          <span>Data</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} />
        </label>
        <div className="segmented" role="radiogroup">
          <button className={format === 'match' ? 'on' : ''} onClick={() => setFormat('match')}>
            Melhor de 3
          </button>
          <button className={format === 'duel' ? 'on' : ''} onClick={() => setFormat('duel')}>
            Jogo único
          </button>
        </div>
      </section>

      {activeEvent && (
        <button className={`event-banner ${inEvent ? '' : 'off'}`} onClick={() => setInEvent(!inEvent)} aria-pressed={inEvent}>
          <span aria-hidden="true">🏆</span>
          <span>
            <b>{inEvent ? `${activeEvent.name} · Rodada ${round}` : 'Fora do evento'}</b>
            <small>{inEvent ? 'Toque para registrar fora do evento' : `Toque para contar como rodada ${round}`}</small>
          </span>
          <span className="event-row-campaign">{inEvent ? '✓' : '—'}</span>
        </button>
      )}

      {([0, 1] as const).map((p) => (
        <section key={p} className={`card player-card p${p}`}>
          <h2>{p === 0 ? 'Você' : 'Oponente'}</h2>
          <label className="field">
            <span>Nome</span>
            {p === 0 ? (
              <input value={myName} placeholder="Você" onChange={(e) => setMyName(e.target.value)} />
            ) : (
              <input value={opponent} placeholder="Oponente" list="opponents" onChange={(e) => setOpponent(e.target.value)} />
            )}
          </label>
          <div className="field">
            <span>Lenda</span>
            {findLegend(legends[p]) ? (
              <LegendTile legend={findLegend(legends[p])!} onClick={() => setPickingLegend(p)} />
            ) : (
              <button className="bf-slot-empty" onClick={() => setPickingLegend(p)}>
                + Escolher lenda
              </button>
            )}
          </div>
        </section>
      ))}
      <datalist id="opponents">
        {props.opponents.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      <section className="card">
        <h2>Jogos</h2>
        {(format === 'duel' ? games.slice(0, 1) : games).map((g, i) => (
          <div key={i} className="game-draft">
            <div className="game-draft-head">
              <b>Jogo {i + 1}</b>
              {games.length > 1 && format === 'match' && (
                <button className="icon-btn small" aria-label={`Remover jogo ${i + 1}`} onClick={() => setGames((gs) => gs.filter((_, j) => j !== i))}>
                  ✕
                </button>
              )}
            </div>
            <span className="field-label">Quem começou</span>
            <div className="segmented">
              <button className={g.firstPlayer === 0 ? 'on' : ''} onClick={() => setGame(i, { firstPlayer: 0 })}>
                Você
              </button>
              <button className={g.firstPlayer === 1 ? 'on' : ''} onClick={() => setGame(i, { firstPlayer: 1 })}>
                Oponente
              </button>
            </div>
            <span className="field-label">Resultado</span>
            <div className="segmented">
              {(['win', 'loss', 'draw'] as const).map((o) => (
                <button key={o} className={g.outcome === o ? 'on' : ''} onClick={() => setGame(i, { outcome: o })}>
                  {o === 'win' ? 'Vitória' : o === 'loss' ? 'Derrota' : 'Empate'}
                </button>
              ))}
            </div>
          </div>
        ))}
        {format === 'match' && games.length < 5 && (
          <button
            className="secondary"
            onClick={() =>
              setGames((gs) => {
                // Quem perdeu o jogo anterior costuma escolher começar (TR 407.4).
                const last = gs.at(-1)!
                const firstPlayer: PlayerIndex = last.outcome === 'win' ? 1 : last.outcome === 'loss' ? 0 : last.firstPlayer
                return [...gs, { firstPlayer, outcome: 'win' }]
              })
            }
          >
            + Adicionar jogo
          </button>
        )}
      </section>

      <button className="primary big" onClick={save}>
        Salvar partida
      </button>

      {pickingLegend !== null && (
        <LegendPicker
          onPick={(legend) => {
            setLegends((ls) => {
              const next = [...ls] as [string, string]
              next[pickingLegend] = legend
              return next
            })
            setPickingLegend(null)
          }}
          onClose={() => setPickingLegend(null)}
        />
      )}
    </main>
  )
}

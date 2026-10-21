import { useState } from 'react'
import { cardImage, findLegend, legendImage } from '../data/cards'
import type { Deck } from '../engine/deck'
import { campaign, EVENT_KINDS, eventName, eventSummary, nextRound, type TcgEvent } from '../engine/events'
import { gameWins, type MatchState } from '../engine/match'
import { computeStats, matchOutcome, type MatchRecord } from '../engine/stats'
import { newId, type AppAction } from '../store'
import { Brand } from './common'

const OUTCOME = { win: 'V', loss: 'D', draw: 'E' } as const

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

/** Criação de evento: tipo, nome (sugerido pelo tipo e pela data), data e deck. */
function EventForm(props: { decks: Deck[]; onSave: (e: TcgEvent) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<string>(EVENT_KINDS[0])
  const [date, setDate] = useState(today)
  // Enquanto o nome não for editado, ele acompanha o tipo e a data.
  const [customName, setCustomName] = useState<string | null>(null)
  const [deck, setDeck] = useState(props.decks[0]?.name ?? '')
  const name = customName ?? eventName(kind, new Date(`${date}T12:00:00`))

  return (
    <section className="card event-form">
      <h2>Novo evento</h2>
      <div className="chips" role="radiogroup" aria-label="Tipo de evento">
        {EVENT_KINDS.map((k) => (
          <button key={k} role="radio" aria-checked={kind === k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
            {k}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Nome</span>
        <input value={name} onChange={(e) => setCustomName(e.target.value)} aria-label="Nome do evento" />
      </label>
      <label className="field">
        <span>Data</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} />
      </label>
      {props.decks.length > 0 && (
        <div className="field">
          <span>Deck</span>
          <div className="chips">
            {props.decks.map((d) => (
              <button key={d.id} className={`chip ${deck === d.name ? 'on' : ''}`} onClick={() => setDeck(deck === d.name ? '' : d.name)}>
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className="primary"
        onClick={() =>
          props.onSave({
            id: newId(),
            name: name.trim() || eventName(kind, new Date()),
            date: new Date(`${date}T12:00:00`).toISOString(),
            ...(deck && { deck }),
          })
        }
      >
        Começar evento
      </button>
      <button className="link" onClick={props.onCancel}>
        Cancelar
      </button>
    </section>
  )
}

/** Um evento: campanha, rodadas jogadas e ações. */
function EventCard(props: {
  event: TcgEvent
  records: MatchRecord[]
  active: boolean
  onPlay: () => void
  dispatch: (a: AppAction) => void
}) {
  const { event, records, dispatch } = props
  const summary = eventSummary(event, records)
  const games = computeStats(records, { eventId: event.id }).games
  const myLegend = findLegend(summary.rounds.at(-1)?.players[0].legend)
  const round = nextRound(event, records)

  return (
    <section className={`card event-card ${props.active ? 'active' : ''}`}>
      <header
        className={`event-head ${myLegend ? 'has-art' : ''}`}
        style={myLegend ? { backgroundImage: `url("${legendImage(myLegend, summary.rounds.at(-1)?.players[0].legendArt, 700)}")` } : undefined}
      >
        <span className="event-titles">
          {props.active && <span className="event-live">● Em andamento</span>}
          <b>{event.name}</b>
          <small>
            {formatDate(event.date)}
            {event.deck && ` · ${event.deck}`}
          </small>
        </span>
        <span className="event-campaign" aria-label={`Campanha: ${summary.record.wins} vitórias, ${summary.record.losses} derrotas`}>
          {campaign(summary.record)}
          <small>{games.played ? `jogos ${games.wins}-${games.losses}${games.draws ? `-${games.draws}` : ''}` : 'sem partidas'}</small>
        </span>
      </header>

      {summary.rounds.length > 0 && (
        <ol className="event-rounds">
          {summary.rounds.map((r) => {
            const outcome = matchOutcome(r)
            const [mine, theirs] = gameWins({ format: r.format, games: r.games } as MatchState)
            const opp = findLegend(r.players[1].legend)
            return (
              <li key={r.id} className={`recent-item ${outcome}`}>
                <span className="event-round-no">R{r.round ?? '?'}</span>
                <span className="recent-art" style={opp ? { backgroundImage: `url("${cardImage(opp, 160)}")` } : undefined} />
                <span className="recent-main">
                  <b>vs {r.players[1].name}</b>
                  <small>{opp ? opp.champion : 'Lenda não informada'}</small>
                </span>
                <span className={`recent-score ${outcome}`}>
                  {OUTCOME[outcome]} {mine}×{theirs}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {props.active ? (
        <>
          <button className="primary" onClick={props.onPlay}>
            ⚔ Jogar rodada {round}
          </button>
          <button className="secondary" onClick={() => confirm(`Encerrar "${event.name}"? As próximas partidas não entram mais nele.`) && dispatch({ type: 'closeEvent', id: event.id })}>
            Encerrar evento
          </button>
        </>
      ) : (
        <div className="row-buttons">
          <button className="secondary" onClick={() => dispatch({ type: 'saveEvent', event: { ...event, closed: false }, activate: true })}>
            Retomar
          </button>
          <button
            className="secondary"
            onClick={() => confirm(`Apagar "${event.name}"? As partidas continuam nas estatísticas, sem o evento.`) && dispatch({ type: 'deleteEvent', id: event.id })}
          >
            Apagar
          </button>
        </div>
      )}
    </section>
  )
}

export function EventsScreen(props: {
  events: TcgEvent[]
  records: MatchRecord[]
  decks: Deck[]
  activeEventId: string | null
  dispatch: (a: AppAction) => void
  onPlay: () => void
  onBack: () => void
}) {
  const { events, records, dispatch } = props
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const active = events.find((e) => e.id === props.activeEventId)
  const past = events.filter((e) => e !== active)

  return (
    <main className="screen setup events">
      <button className="link back" onClick={props.onBack}>
        ← Início
      </button>
      <Brand title="Eventos" subtitle={active ? 'Partidas novas entram no evento em andamento' : 'Nexus Night, ligas e torneios'} />

      {creating ? (
        <EventForm
          decks={props.decks}
          onSave={(event) => {
            if (active) dispatch({ type: 'closeEvent', id: active.id })
            dispatch({ type: 'saveEvent', event, activate: true })
            setCreating(false)
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <>
          {active && <EventCard event={active} records={records} active onPlay={props.onPlay} dispatch={dispatch} />}
          {!active && events.length === 0 && (
            <section className="card">
              <p>Vai a uma Nexus Night ou a um torneio? Comece um evento e cada partida entra nele como uma rodada, com a sua campanha (2-1, 3-0…).</p>
              <p className="hint">Depois, os eventos aparecem nas estatísticas.</p>
            </section>
          )}
          <button className={active ? 'secondary' : 'primary big'} onClick={() => setCreating(true)}>
            + Novo evento
          </button>
        </>
      )}

      {past.length > 0 && (
        <section className="event-past">
          <h2>Eventos anteriores</h2>
          {past.map((e) => {
            const s = eventSummary(e, records)
            return open === e.id ? (
              <EventCard key={e.id} event={e} records={records} active={false} onPlay={props.onPlay} dispatch={dispatch} />
            ) : (
              <button key={e.id} className="event-row" onClick={() => setOpen(e.id)}>
                <span>
                  <b>{e.name}</b>
                  <small>
                    {formatDate(e.date)} · {s.rounds.length} rodada{s.rounds.length === 1 ? '' : 's'}
                  </small>
                </span>
                <span className="event-row-campaign">{campaign(s.record)}</span>
              </button>
            )
          })}
        </section>
      )}
    </main>
  )
}

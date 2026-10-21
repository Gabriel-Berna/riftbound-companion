import { matchOutcome, type MatchRecord, type Tally } from './stats'

/** Evento com várias rodadas (ex.: Nexus Night, liga, regional). As partidas apontam para ele por `eventId`. */
export interface TcgEvent {
  id: string
  name: string
  /** Data do evento em ISO 8601. */
  date: string
  /** Deck salvo levado ao evento (nome), se houver. */
  deck?: string
  /** Encerrado: as próximas partidas não entram mais nele. */
  closed?: boolean
}

export interface EventSummary {
  event: TcgEvent
  /** Rodadas jogadas, da primeira à última. */
  rounds: MatchRecord[]
  /** Campanha em partidas (V-D-E). */
  record: Tally
}

/** Tipos comuns de evento, sugeridos ao criar um. */
export const EVENT_KINDS = ['Nexus Night', 'Liga', 'Pré-lançamento', 'Regional', 'Torneio'] as const

/** Nome padrão: o tipo e a data (ex.: "Nexus Night · 24/10"). */
export function eventName(kind: string, date: Date): string {
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${kind} · ${day}`
}

export function eventSummary(event: TcgEvent, records: MatchRecord[]): EventSummary {
  const rounds = records
    .filter((r) => r.eventId === event.id)
    .sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || a.date.localeCompare(b.date))
  const record: Tally = { played: 0, wins: 0, losses: 0, draws: 0 }
  for (const r of rounds) {
    if (r.games.length === 0) continue
    const o = matchOutcome(r)
    record.played += 1
    if (o === 'win') record.wins += 1
    else if (o === 'loss') record.losses += 1
    else record.draws += 1
  }
  return { event, rounds, record }
}

/** Número da próxima rodada: uma a mais que a última registrada. */
export function nextRound(event: TcgEvent, records: MatchRecord[]): number {
  return records.reduce((max, r) => (r.eventId === event.id ? Math.max(max, r.round ?? 0) : max), 0) + 1
}

/** Campanha no formato de torneio: "2-1" ou, com empates, "2-1-1". */
export const campaign = (t: Tally): string => `${t.wins}-${t.losses}${t.draws ? `-${t.draws}` : ''}`

/** Confere se um objeto importado tem o formato de um evento. */
export function isTcgEvent(x: unknown): x is TcgEvent {
  const e = x as TcgEvent
  return typeof e === 'object' && e !== null && typeof e.id === 'string' && typeof e.name === 'string' && typeof e.date === 'string'
}

import { describe, expect, it } from 'vitest'
import { campaign, eventName, eventSummary, isTcgEvent, nextRound, type TcgEvent } from './events'
import { createMatch } from './match'
import { computeStats, recordFromMatch, type MatchRecord } from './stats'
import type { PlayerIndex } from './types'

const nexus: TcgEvent = { id: 'ev1', name: 'Nexus Night · 24/10', date: '2026-10-24T19:00:00.000Z' }

let seq = 0
const round = (eventId: string | undefined, roundNo: number | undefined, winners: (PlayerIndex | 'draw')[]): MatchRecord => ({
  id: `r${++seq}`,
  date: new Date(2026, 9, 24, 19, seq).toISOString(),
  format: 'match',
  players: [
    { name: 'Ana', battlefields: ['A1', 'A2', 'A3'] },
    { name: `Oponente ${seq}`, battlefields: ['B1', 'B2', 'B3'] },
  ],
  games: winners.map((w) => ({
    result: w === 'draw' ? { kind: 'draw' } : { kind: 'win', winner: w, reason: 'points' },
    battlefields: ['A1', 'B1'],
    firstPlayer: 0,
    finalPoints: [0, 0],
  })),
  source: 'app',
  ...(eventId && { eventId, round: roundNo }),
})

describe('eventos', () => {
  const records = [
    round('ev1', 2, [1, 1]),
    round('ev1', 1, [0, 0]),
    round(undefined, undefined, [1, 1]),
    round('ev1', 3, [0, 1, 0]),
    round('outro', 1, [1, 1]),
  ]

  it('junta as rodadas do evento em ordem e conta a campanha em partidas', () => {
    const s = eventSummary(nexus, records)
    expect(s.rounds.map((r) => r.round)).toEqual([1, 2, 3])
    expect(s.record).toEqual({ played: 3, wins: 2, losses: 1, draws: 0 })
    expect(campaign(s.record)).toBe('2-1')
    expect(campaign({ played: 4, wins: 2, losses: 1, draws: 1 })).toBe('2-1-1')
  })

  it('a próxima rodada vem depois da última registrada', () => {
    expect(nextRound(nexus, records)).toBe(4)
    expect(nextRound({ ...nexus, id: 'novo' }, records)).toBe(1)
  })

  it('a partida jogada no evento leva o evento e a rodada para o registro', () => {
    const m = { ...createMatch('match', records[0].players), eventId: 'ev1', round: 4 }
    const r = recordFromMatch(m, 'x', new Date())
    expect([r.eventId, r.round]).toEqual(['ev1', 4])
    expect(recordFromMatch(createMatch('match', records[0].players), 'y', new Date())).not.toHaveProperty('eventId')
  })

  it('as estatísticas podem considerar só um evento', () => {
    expect(computeStats(records, { eventId: 'ev1' }).matches).toEqual({ played: 3, wins: 2, losses: 1, draws: 0 })
    expect(computeStats(records).matches.played).toBe(5)
  })

  it('nome padrão com o tipo e a data; backup só aceita eventos válidos', () => {
    expect(eventName('Nexus Night', new Date(2026, 9, 24))).toBe('Nexus Night · 24/10')
    expect(isTcgEvent(nexus)).toBe(true)
    expect(isTcgEvent({ name: 'sem id' })).toBe(false)
  })
})

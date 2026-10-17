import { describe, expect, it } from 'vitest'
import type { CompletedGame } from './match'
import { computeStats, isMatchRecord, matchOutcome, matchupKey, matchupMatrix, mergeRecords, winRate, winRateTimeline, type MatchRecord } from './stats'
import type { PlayerIndex } from './types'

const game = (winner: PlayerIndex | 'draw', firstPlayer: PlayerIndex, bfs: [string, string] = ['A1', 'B1']): CompletedGame => ({
  result: winner === 'draw' ? { kind: 'draw' } : { kind: 'win', winner, reason: 'points' },
  battlefields: bfs,
  firstPlayer,
  finalPoints: [0, 0],
})

let seq = 0
const record = (opponent: string, myLegend: string | undefined, theirLegend: string | undefined, games: CompletedGame[]): MatchRecord => ({
  id: `r${++seq}`,
  date: new Date(2026, 9, seq).toISOString(),
  format: 'match',
  players: [
    { name: 'Eu', legend: myLegend, battlefields: ['A1', 'A2', 'A3'] },
    { name: opponent, legend: theirLegend, battlefields: ['B1', 'B2', 'B3'] },
  ],
  games,
  source: 'app',
})

describe('estatísticas', () => {
  const records = [
    record('Bruno', 'Loose Cannon', 'Nine-Tailed Fox', [game(0, 0), game(1, 1, ['A2', 'B2']), game(0, 0, ['A3', 'B3'])]),
    record('Carla', 'Loose Cannon', 'Blind Monk', [game(1, 1), game(1, 0, ['A2', 'B2'])]),
    record('Bruno', 'Daughter of the Void', 'Nine-Tailed Fox', [game(0, 1), game('draw', 1, ['A2', 'B2']), game(0, 1, ['A2', 'B2'])]),
  ]

  it('conta partidas e jogos do seu ponto de vista', () => {
    const s = computeStats(records)
    expect(s.matches).toEqual({ played: 3, wins: 2, losses: 1, draws: 0 })
    expect(s.games).toEqual({ played: 8, wins: 4, losses: 3, draws: 1 })
  })

  it('separa jogos em que você começou dos que o oponente começou', () => {
    const s = computeStats(records)
    expect(s.goingFirst).toEqual({ played: 3, wins: 2, losses: 1, draws: 0 })
    expect(s.goingSecond).toEqual({ played: 5, wins: 2, losses: 2, draws: 1 })
  })

  it('agrupa por lenda sua, lenda do oponente, oponente e battlefield', () => {
    const s = computeStats(records)
    expect(s.byMyLegend.map((r) => [r.key, r.played, r.wins])).toEqual([
      ['Loose Cannon', 5, 2],
      ['Daughter of the Void', 3, 2],
    ])
    expect(s.byOpponentLegend.find((r) => r.key === 'Nine-Tailed Fox')).toMatchObject({ played: 6, wins: 4, losses: 1, draws: 1 })
    expect(s.byOpponent.find((r) => r.key === 'Bruno')).toMatchObject({ played: 2, wins: 2 })
    expect(s.byMyBattlefield.find((r) => r.key === 'A2')).toMatchObject({ played: 4, wins: 1, losses: 2, draws: 1 })
  })

  it('filtra pela sua lenda', () => {
    const s = computeStats(records, { myLegend: 'Loose Cannon' })
    expect(s.matches.played).toBe(2)
    expect(s.byOpponent.map((r) => r.key)).toEqual(['Bruno', 'Carla'])
  })

  it('ignora battlefields com nome automático', () => {
    const s = computeStats([record('Davi', 'L', 'L', [game(0, 0, ['Battlefield A1', 'Battlefield B1'])])])
    expect(s.byMyBattlefield).toEqual([])
  })

  it('ignora lendas não informadas nos agrupamentos', () => {
    const s = computeStats([record('Davi', undefined, undefined, [game(0, 0)])])
    expect(s.games.played).toBe(1)
    expect(s.byMyLegend).toEqual([])
  })

  it('partida com jogos empatados em vitórias termina empatada', () => {
    expect(matchOutcome(record('X', 'L', 'L', [game(0, 0), game(1, 1)]))).toBe('draw')
  })

  it('percentual de vitórias conta empates como não vitória', () => {
    expect(winRate({ played: 4, wins: 1, losses: 2, draws: 1 })).toBe(0.25)
    expect(winRate({ played: 0, wins: 0, losses: 0, draws: 0 })).toBeNull()
  })
})

describe('gráficos', () => {
  const a = record('Bruno', 'Loose Cannon', 'Nine-Tailed Fox', [game(0, 0), game(1, 1)])
  const b = record('Carla', 'Loose Cannon', 'Blind Monk', [game(0, 0)])
  const c = record('Bruno', 'Daughter of the Void', 'Nine-Tailed Fox', [game('draw', 1)])

  it('evolução da % de vitórias segue a ordem cronológica dos jogos', () => {
    const t = winRateTimeline([c, a, b]) // fora de ordem de propósito
    expect(t.map((p) => p.outcome)).toEqual(['win', 'loss', 'win', 'draw'])
    expect(t.map((p) => p.rate)).toEqual([1, 0.5, 2 / 3, 0.5])
  })

  it('a evolução respeita o filtro de lenda', () => {
    expect(winRateTimeline([a, b, c], { myLegend: 'Daughter of the Void' })).toHaveLength(1)
  })

  it('matriz de confrontos conta jogos por par de lendas, mais jogadas primeiro', () => {
    const m = matchupMatrix([a, b, c])
    expect(m.myLegends).toEqual(['Loose Cannon', 'Daughter of the Void'])
    expect(m.opponentLegends).toEqual(['Nine-Tailed Fox', 'Blind Monk'])
    expect(m.cells.get(matchupKey('Loose Cannon', 'Nine-Tailed Fox'))).toEqual({ played: 2, wins: 1, losses: 1, draws: 0 })
    expect(m.cells.get(matchupKey('Daughter of the Void', 'Blind Monk'))).toBeUndefined()
  })

  it('a matriz ignora partidas sem as duas lendas', () => {
    expect(matchupMatrix([record('X', 'L', undefined, [game(0, 0)])]).myLegends).toEqual([])
  })
})

describe('backup', () => {
  it('importação não duplica registros e ordena do mais recente', () => {
    const a = record('A', 'L', 'L', [game(0, 0)])
    const b = record('B', 'L', 'L', [game(0, 0)])
    const merged = mergeRecords([a], [a, b])
    expect(merged.map((r) => r.id)).toEqual([b.id, a.id])
  })

  it('valida o formato dos registros importados', () => {
    expect(isMatchRecord(record('A', 'L', 'L', [game(0, 0)]))).toBe(true)
    expect(isMatchRecord({ id: 'x' })).toBe(false)
    expect(isMatchRecord(null)).toBe(false)
  })
})

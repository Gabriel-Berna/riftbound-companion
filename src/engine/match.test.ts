import { describe, expect, it } from 'vitest'
import {
  availableBattlefields,
  createMatch,
  firstPlayerRule,
  gameWins,
  isMatchOver,
  matchReducer,
  matchWinner,
  type MatchAction,
  type MatchState,
} from './match'
import type { PlayerIndex } from './types'

const newMatch = (format: 'duel' | 'match' = 'match') =>
  createMatch(format, [
    { name: 'Ana', battlefields: ['A1', 'A2', 'A3'] },
    { name: 'Bruno', battlefields: ['B1', 'B2', 'B3'] },
  ])

const run = (m: MatchState, ...actions: MatchAction[]) => actions.reduce(matchReducer, m)

function playGame(m: MatchState, bfs: [string, string], firstPlayer: PlayerIndex, outcome: PlayerIndex | 'draw'): MatchState {
  return run(
    m,
    { type: 'startGame', battlefieldNames: bfs, firstPlayer },
    {
      type: 'game',
      action: outcome === 'draw' ? { type: 'declareDraw' } : { type: 'concede', player: outcome === 0 ? 1 : 0 },
    },
    { type: 'finishGame' },
  )
}

describe('melhor de 3 (CR 488)', () => {
  it('o primeiro jogo tem sorteio; depois, quem perdeu escolhe (TR 407)', () => {
    let m = newMatch()
    expect(firstPlayerRule(m)).toEqual({ kind: 'random' })
    m = playGame(m, ['A1', 'B1'], 0, 0)
    expect(firstPlayerRule(m)).toEqual({ kind: 'chooser', player: 1 })
  })

  it('battlefields de um jogo com vencedor não voltam', () => {
    const m = playGame(newMatch(), ['A2', 'B3'], 0, 1)
    expect(availableBattlefields(m, 0)).toEqual(['A1', 'A3'])
    expect(availableBattlefields(m, 1)).toEqual(['B1', 'B2'])
  })

  it('após empate, os battlefields podem voltar e quem começou continua começando', () => {
    const m = playGame(newMatch(), ['A2', 'B3'], 1, 'draw')
    expect(availableBattlefields(m, 0)).toEqual(['A1', 'A2', 'A3'])
    expect(firstPlayerRule(m)).toEqual({ kind: 'fixed', firstPlayer: 1 })
    expect(isMatchOver(m)).toBe(false)
  })

  it('vence quem ganhar 2 jogos; empates não contam', () => {
    let m = playGame(newMatch(), ['A1', 'B1'], 0, 0)
    m = playGame(m, ['A2', 'B2'], 1, 'draw')
    m = playGame(m, ['A2', 'B2'], 1, 1)
    expect(gameWins(m)).toEqual([1, 1])
    expect(matchWinner(m)).toBeNull()
    m = playGame(m, ['A3', 'B3'], 0, 0)
    expect(matchWinner(m)).toBe(0)
    expect(isMatchOver(m)).toBe(true)
    expect(run(m, { type: 'startGame', battlefieldNames: ['A1', 'B1'], firstPlayer: 0 }).game).toBeNull()
  })

  it('registra os pontos finais de cada jogo', () => {
    let m = run(newMatch(), { type: 'startGame', battlefieldNames: ['A1', 'B1'], firstPlayer: 0 })
    m = run(m, { type: 'game', action: { type: 'adjustPoints', player: 1, delta: 5 } }, { type: 'game', action: { type: 'concede', player: 1 } }, { type: 'finishGame' })
    expect(m.games[0].finalPoints).toEqual([0, 5])
  })

  it('não encerra um jogo sem resultado', () => {
    const m = run(newMatch(), { type: 'startGame', battlefieldNames: ['A1', 'B1'], firstPlayer: 0 })
    expect(run(m, { type: 'finishGame' })).toBe(m)
  })
})

describe('melhor de 1 (CR 487)', () => {
  it('termina após um jogo, mesmo empatado', () => {
    const m = playGame(newMatch('duel'), ['A1', 'B1'], 0, 'draw')
    expect(isMatchOver(m)).toBe(true)
    expect(matchWinner(m)).toBeNull()
  })

  it('uma vitória basta', () => {
    expect(matchWinner(playGame(newMatch('duel'), ['A1', 'B1'], 0, 1))).toBe(1)
  })
})

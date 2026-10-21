import { describe, expect, it } from 'vitest'
import {
  availableBattlefields,
  createMatch,
  firstPlayerRule,
  gameWins,
  isMatchOver,
  matchReducer,
  matchWinner,
  scoreBreakdown,
  timeLeft,
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

describe('origem dos pontos e duração do jogo', () => {
  const g = (action: object) => ({ type: 'game', action }) as MatchAction

  it('guarda quantos pontos vieram de Hold, Conquer e outros (CR 471)', () => {
    const m = run(
      newMatch(),
      { type: 'startGame', battlefieldNames: ['A1', 'B1'], firstPlayer: 0 },
      g({ type: 'score', player: 0, kind: 'hold' }),
      g({ type: 'score', player: 0, kind: 'conquer' }),
      g({ type: 'score', player: 1, kind: 'conquer' }),
      g({ type: 'adjustPoints', player: 0, delta: 2 }),
      g({ type: 'burnOut', player: 0 }),
      g({ type: 'concede', player: 1 }),
      { type: 'finishGame' },
    )
    expect(m.games[0].finalPoints).toEqual([4, 2])
    expect(m.games[0].scoring).toEqual({ hold: [1, 0], conquer: [1, 1], other: [2, 1] })
  })

  it('correções com −1 descontam dos pontos de outras origens, sem ficar negativo', () => {
    const log = [
      { kind: 'hold', player: 0, points: 1 },
      { kind: 'hold', player: 0, points: 2 },
    ] as const
    expect(scoreBreakdown([...log], [1, 0])).toEqual({ hold: [2, 0], conquer: [0, 0], other: [0, 0] })
  })

  it('mede a duração do início do jogo até o resultado', () => {
    const m = run(
      newMatch(),
      { type: 'startGame', battlefieldNames: ['A1', 'B1'], firstPlayer: 0, now: 1_000 },
      g({ type: 'concede', player: 1 }),
      { type: 'finishGame', now: 1_000 + 25 * 60_000 },
    )
    expect(m.games[0].durationMs).toBe(25 * 60_000)
  })

  it('sem horário de início, a duração fica em branco', () => {
    const m = playGame(newMatch(), ['A1', 'B1'], 0, 0)
    expect(m.games[0].durationMs).toBeUndefined()
  })
})

describe('relógio da rodada (TR 408)', () => {
  const timed = () => createMatch('match', newMatch().players, 60)

  it('começa com o primeiro jogo e desconta as pausas', () => {
    let m = run(timed(), { type: 'startGame', battlefieldNames: ['A1', 'B1'], firstPlayer: 0, now: 0 })
    expect(timeLeft(m, 10 * 60_000)).toBe(50 * 60_000)
    m = run(m, { type: 'pauseTimer', now: 10 * 60_000 }, { type: 'resumeTimer', now: 15 * 60_000 })
    expect(timeLeft(m, 20 * 60_000)).toBe(45 * 60_000)
  })

  it('sem timer, não há tempo restante', () => {
    expect(timeLeft(run(newMatch(), { type: 'startGame', battlefieldNames: ['A1', 'B1'], firstPlayer: 0, now: 0 }), 1000)).toBeNull()
  })

  it('tempo esgotado durante o jogo inicia os turnos extras', () => {
    const m = run(timed(), { type: 'startGame', battlefieldNames: ['A1', 'B1'], firstPlayer: 0, now: 0 }, { type: 'timeUp' })
    expect(m.game?.timeUp).toBe(true)
    expect(isMatchOver(m)).toBe(false)
  })

  it('tempo esgotado entre jogos encerra a partida: vence quem tem mais vitórias (TR 408.2.d, 408.3.a)', () => {
    let m = playGame(timed(), ['A1', 'B1'], 0, 1)
    m = run(m, { type: 'timeUp' })
    expect(isMatchOver(m)).toBe(true)
    expect(matchWinner(m)).toBe(1)
    expect(run(m, { type: 'startGame', battlefieldNames: ['A2', 'B2'], firstPlayer: 0 }).game).toBeNull()
  })

  it('tempo esgotado entre jogos com vitórias iguais é empate', () => {
    const m = run(playGame(timed(), ['A1', 'B1'], 0, 'draw'), { type: 'timeUp' })
    expect(isMatchOver(m)).toBe(true)
    expect(matchWinner(m)).toBeNull()
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

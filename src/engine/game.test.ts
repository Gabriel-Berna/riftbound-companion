import { describe, expect, it } from 'vitest'
import { createGame, gameReducer, migrateGame, needsFinalPointCheck, type GameAction } from './game'
import type { GameState } from './types'

const newGame = (firstPlayer: 0 | 1 = 0) =>
  createGame({ playerNames: ['Ana', 'Bruno'], battlefieldNames: ['Targon', 'Zaun'], firstPlayer })

const run = (s: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, s)

const hold = (player: 0 | 1): GameAction => ({ type: 'score', player, kind: 'hold' })
const conquer = (player: 0 | 1, scoredAllBattlefields?: boolean): GameAction => ({ type: 'score', player, kind: 'conquer', scoredAllBattlefields })

const withPoints = (s: GameState, a: number, b: number): GameState => {
  const next = structuredClone(s)
  next.players[0].points = a
  next.players[1].points = b
  return next
}

describe('Hold e Conquer (CR 471)', () => {
  it('cada toque dá 1 ponto e fica no histórico com o tipo', () => {
    const s = run(newGame(), hold(0), conquer(0), conquer(1))
    expect(s.players.map((p) => p.points)).toEqual([2, 1])
    expect(s.log.map((e) => e.kind)).toEqual(['hold', 'conquer', 'conquer'])
  })

  it('XP é um recurso à parte e nunca fica negativo', () => {
    const s = run(newGame(), { type: 'adjustXp', player: 0, delta: 3 }, { type: 'adjustXp', player: 1, delta: -1 })
    expect(s.players.map((p) => p.xp)).toEqual([3, 0])
  })
})

describe('regra do Ponto Final (CR 473.1.b)', () => {
  it('só se aplica a quem está a 1 ponto da vitória', () => {
    expect(needsFinalPointCheck(withPoints(newGame(), 6, 7), 0)).toBe(false)
    expect(needsFinalPointCheck(withPoints(newGame(), 6, 7), 1)).toBe(true)
  })

  it('Conquer sem ter pontuado todos os battlefields no turno não dá o ponto final', () => {
    const s = run(withPoints(newGame(), 7, 2), conquer(0, false))
    expect(s.players[0].points).toBe(7)
    expect(s.result).toBeNull()
    expect(s.log.at(-1)?.kind).toBe('final-point-blocked')
  })

  it('sem a resposta, o ponto final também é barrado', () => {
    expect(run(withPoints(newGame(), 7, 2), conquer(0)).players[0].points).toBe(7)
  })

  it('tendo pontuado todos os battlefields no turno, o Conquer dá o ponto final', () => {
    const s = run(withPoints(newGame(), 7, 2), conquer(0, true))
    expect(s.result).toEqual({ kind: 'win', winner: 0, reason: 'points' })
  })

  it('Hold, efeitos de carta e Burn Out não sofrem a restrição (CR 473.1.a.1)', () => {
    expect(run(withPoints(newGame(), 7, 2), hold(0)).result?.kind).toBe('win')
    expect(run(withPoints(newGame(), 7, 2), { type: 'adjustPoints', player: 0, delta: 1 }).result?.kind).toBe('win')
    expect(run(withPoints(newGame(), 7, 2), { type: 'burnOut', player: 1 }).result).toEqual({ kind: 'win', winner: 0, reason: 'points' })
  })
})

describe('vitória (CR 194.2)', () => {
  it('é preciso ter mais pontos que o oponente: empate em 8 continua', () => {
    let s = run(withPoints(newGame(), 7, 8), hold(0))
    expect(s.result).toBeNull()
    s = run(s, hold(0))
    expect(s.result).toEqual({ kind: 'win', winner: 0, reason: 'points' })
  })

  it('pontos nunca ficam abaixo de 0 (CR 194.4)', () => {
    const s = run(newGame(), { type: 'adjustPoints', player: 0, delta: -1 })
    expect(s.players[0].points).toBe(0)
    expect(s.log).toEqual([])
  })

  it('depois do resultado, novas ações são ignoradas', () => {
    const s = run(newGame(), { type: 'concede', player: 1 })
    expect(s.result).toEqual({ kind: 'win', winner: 0, reason: 'concede' })
    expect(run(s, hold(1))).toBe(s)
  })
})

describe('battlefields que alteram a vitória', () => {
  const climb = () => createGame({ playerNames: ['Ana', 'Bruno'], battlefieldNames: ["Aspirant's Climb", 'Zaun'], firstPlayer: 0 })

  it("Aspirant's Climb aumenta em 1 os pontos para vencer", () => {
    const s = climb()
    expect(s.victoryScore).toBe(9)
    expect(run(withPoints(s, 7, 2), hold(0)).result).toBeNull()
  })

  it('a regra do Ponto Final usa o novo alvo', () => {
    expect(needsFinalPointCheck(withPoints(climb(), 7, 2), 0)).toBe(false)
    expect(needsFinalPointCheck(withPoints(climb(), 8, 2), 0)).toBe(true)
  })

  it('vitória por efeito de carta encerra o jogo', () => {
    expect(run(newGame(), { type: 'winByEffect', player: 1 }).result).toEqual({ kind: 'win', winner: 1, reason: 'effect' })
  })
})

describe('tempo da rodada (TR 408.2)', () => {
  it('o fim do tempo é registrado uma vez e o jogo continua nos turnos extras', () => {
    const s = run(newGame(), { type: 'timeUp' }, hold(0), { type: 'timeUp' })
    expect(s.timeUp).toBe(true)
    expect(s.log.filter((e) => e.kind === 'time-up')).toHaveLength(1)
    expect(s.result).toBeNull()
  })

  it('ao fim dos turnos extras, vence quem tem 2+ pontos de vantagem', () => {
    const s = run(withPoints(run(newGame(), { type: 'timeUp' }), 5, 3), { type: 'endByTime' })
    expect(s.result).toEqual({ kind: 'win', winner: 0, reason: 'time' })
  })

  it('com menos de 2 pontos de vantagem, o jogo empata', () => {
    const s = run(withPoints(run(newGame(), { type: 'timeUp' }), 5, 4), { type: 'endByTime' })
    expect(s.result).toEqual({ kind: 'draw' })
  })

  it('o jogo ainda pode terminar normalmente durante os turnos extras', () => {
    const s = run(withPoints(run(newGame(), { type: 'timeUp' }), 4, 7), hold(1))
    expect(s.result).toEqual({ kind: 'win', winner: 1, reason: 'points' })
  })
})

describe('Burn Out (CR 432)', () => {
  it('o oponente de quem sofreu Burn Out ganha 1 ponto', () => {
    const s = run(newGame(), { type: 'burnOut', player: 0 })
    expect(s.players.map((p) => p.points)).toEqual([0, 1])
  })
})

describe('jogo salvo pela versão com turnos', () => {
  it('converte battlefields e histórico e mantém o placar', () => {
    const legacy = {
      victoryScore: 8,
      players: [
        { name: 'Ana', points: 3, xp: 1, energy: 2, power: {} },
        { name: 'Bruno', points: 2, xp: 0, energy: 0, power: {} },
      ],
      battlefields: [
        { id: 'bf0', name: 'Targon', owner: 0, controller: 0 },
        { id: 'bf1', name: 'Zaun', owner: 1, controller: null },
      ],
      firstPlayer: 1,
      turn: 4,
      active: 0,
      log: [
        { kind: 'turn-start', turn: 1, player: 1 },
        { kind: 'conquer', turn: 1, player: 1, battlefield: 'Targon', points: 1 },
      ],
      result: null,
      timeUpTurn: 3,
    }
    const g = migrateGame(legacy)!
    expect(g.battlefields).toEqual(['Targon', 'Zaun'])
    expect(g.players).toEqual([
      { name: 'Ana', points: 3, xp: 1 },
      { name: 'Bruno', points: 2, xp: 0 },
    ])
    expect(g.log.map((e) => e.kind)).toEqual(['conquer'])
    expect(g.timeUp).toBe(true)
    expect(run(g, hold(0)).players[0].points).toBe(4)
  })
})

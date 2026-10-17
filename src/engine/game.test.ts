import { describe, expect, it } from 'vitest'
import { conquerOutcome, createGame, gameReducer, runesToChannel, type GameAction } from './game'
import type { GameState } from './types'

const newGame = (firstPlayer: 0 | 1 = 0) =>
  createGame({ playerNames: ['Ana', 'Bruno'], battlefieldNames: ['Targon', 'Zaun'], firstPlayer })

const run = (s: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, s)

const pass: GameAction = { type: 'passTurn' }

const withPoints = (s: GameState, a: number, b: number): GameState => {
  const next = structuredClone(s)
  next.players[0].points = a
  next.players[1].points = b
  return next
}

describe('estrutura do turno', () => {
  it('passar a vez dá o turno ao oponente', () => {
    let s = newGame(0)
    expect(s.active).toBe(0)
    s = run(s, pass)
    expect(s.active).toBe(1)
    expect(s.turn).toBe(2)
    s = run(s, pass)
    expect(s.active).toBe(0)
    expect(s.turn).toBe(3)
  })

  it('quem joga em segundo canaliza 1 runa extra só no primeiro turno (CR 487.7)', () => {
    let s = newGame(1)
    expect(runesToChannel(s)).toBe(2) // Bruno começa: 2 runas
    s = run(s, pass) // primeiro turno da Ana
    expect(s.active).toBe(0)
    expect(runesToChannel(s)).toBe(3)
    s = run(s, pass, pass) // segundo turno da Ana
    expect(runesToChannel(s)).toBe(2)
  })

  it('esvazia o rune pool de todos no fim do turno (CR 167)', () => {
    let s = run(newGame(0), { type: 'adjustEnergy', player: 0, delta: 3 }, { type: 'adjustPower', player: 1, kind: 'fury', delta: 1 })
    s = run(s, pass)
    expect(s.players[0].energy).toBe(0)
    expect(s.players[1].power.fury).toBe(0)
  })

  it('XP não é zerado entre turnos', () => {
    const s = run(newGame(0), { type: 'adjustXp', player: 0, delta: 4 }, pass)
    expect(s.players[0].xp).toBe(4)
  })
})

describe('Hold (CR 471.2)', () => {
  it('ao começar o turno, o jogador segura os battlefields que controla', () => {
    let s = run(newGame(0), { type: 'setControl', battlefieldId: 'bf0', controller: 0 }, { type: 'setControl', battlefieldId: 'bf1', controller: 1 })
    s = run(s, pass) // turno do Bruno
    expect(s.players[1].points).toBe(1)
    expect(s.players[0].points).toBe(0)
    expect(s.scoredThisTurn[1]).toEqual(['bf1'])
    s = run(s, pass) // turno da Ana
    expect(s.players[0].points).toBe(1)
  })

  it('o battlefield segurado não pode ser pontuado de novo por Conquer no mesmo turno', () => {
    let s = run(newGame(0), { type: 'setControl', battlefieldId: 'bf1', controller: 1 }, pass)
    s = run(s, { type: 'conquer', player: 0, battlefieldId: 'bf1' }, { type: 'conquer', player: 1, battlefieldId: 'bf1' })
    expect(s.players[1].points).toBe(1)
    expect(s.log.at(-1)?.kind).toBe('already-scored')
  })

  it('Hold não sofre a restrição do Ponto Final (CR 473.1.a.1)', () => {
    let s = withPoints(run(newGame(1), { type: 'setControl', battlefieldId: 'bf0', controller: 0 }), 7, 3)
    s = run(s, pass)
    expect(s.result).toEqual({ kind: 'win', winner: 0, reason: 'points' })
  })
})

describe('Conquer (CR 471.1)', () => {
  it('conquistar dá o controle e 1 ponto', () => {
    const s = run(newGame(0), { type: 'conquer', player: 0, battlefieldId: 'bf1' })
    expect(s.battlefields[1].controller).toBe(0)
    expect(s.players[0].points).toBe(1)
  })

  it('cada battlefield pontua no máximo uma vez por turno (CR 472)', () => {
    const s = run(
      newGame(0),
      { type: 'conquer', player: 0, battlefieldId: 'bf1' },
      { type: 'conquer', player: 1, battlefieldId: 'bf1' },
      { type: 'conquer', player: 0, battlefieldId: 'bf1' },
    )
    expect(s.players[0].points).toBe(1)
    expect(s.players[1].points).toBe(1)
    expect(s.battlefields[1].controller).toBe(0)
    expect(s.log.at(-1)?.kind).toBe('already-scored')
  })

  it('o battlefield pode pontuar de novo no turno seguinte', () => {
    let s = run(newGame(0), { type: 'conquer', player: 0, battlefieldId: 'bf1' }, pass)
    s = run(s, { type: 'conquer', player: 1, battlefieldId: 'bf1' }, { type: 'conquer', player: 0, battlefieldId: 'bf1' })
    expect(s.players[0].points).toBe(2)
  })
})

describe('regra do Ponto Final (CR 473.1.b)', () => {
  it('a 1 ponto da vitória, conquistar sem ter pontuado todos os battlefields não dá ponto', () => {
    let s = withPoints(newGame(0), 7, 2)
    expect(conquerOutcome(s, 0, 'bf1')).toBe('blocked')
    s = run(s, { type: 'conquer', player: 0, battlefieldId: 'bf1' })
    expect(s.players[0].points).toBe(7)
    expect(s.battlefields[1].controller).toBe(0)
    expect(s.result).toBeNull()
    expect(s.log.at(-1)?.kind).toBe('final-point-blocked')
  })

  it('o Conquer barrado ainda conta como pontuado no turno', () => {
    let s = withPoints(newGame(0), 7, 2)
    s = run(s, { type: 'conquer', player: 0, battlefieldId: 'bf1' }, { type: 'conquer', player: 0, battlefieldId: 'bf1' })
    expect(s.log.at(-1)?.kind).toBe('already-scored')
  })

  it('tendo pontuado o outro battlefield no turno, o Conquer dá o ponto final', () => {
    let s = withPoints(run(newGame(1), { type: 'setControl', battlefieldId: 'bf0', controller: 0 }), 6, 2)
    s = run(s, pass) // turno da Ana: Hold em bf0, 7 pontos
    expect(s.players[0].points).toBe(7)
    s = run(s, { type: 'conquer', player: 0, battlefieldId: 'bf1' })
    expect(s.players[0].points).toBe(8)
    expect(s.result).toEqual({ kind: 'win', winner: 0, reason: 'points' })
  })

  it('pontos de efeito de carta e de Burn Out não sofrem a restrição', () => {
    expect(run(withPoints(newGame(0), 7, 2), { type: 'adjustPoints', player: 0, delta: 1 }).result?.kind).toBe('win')
    expect(run(withPoints(newGame(0), 7, 2), { type: 'burnOut', player: 1 }).result).toEqual({ kind: 'win', winner: 0, reason: 'points' })
  })
})

describe('vitória (CR 194.2)', () => {
  it('é preciso ter mais pontos que o oponente: empate em 8 continua', () => {
    let s = withPoints(newGame(0), 7, 8)
    s = run(s, { type: 'adjustPoints', player: 0, delta: 1 })
    expect(s.result).toBeNull()
    s = run(s, { type: 'adjustPoints', player: 0, delta: 1 })
    expect(s.result).toEqual({ kind: 'win', winner: 0, reason: 'points' })
  })

  it('pontos nunca ficam abaixo de 0 (CR 194.4)', () => {
    const s = run(newGame(0), { type: 'adjustPoints', player: 0, delta: -1 })
    expect(s.players[0].points).toBe(0)
    expect(s.log.at(-1)?.kind).toBe('turn-start')
  })

  it('depois do resultado, novas ações são ignoradas', () => {
    let s = run(newGame(0), { type: 'concede', player: 1 })
    expect(s.result).toEqual({ kind: 'win', winner: 0, reason: 'concede' })
    expect(run(s, { type: 'adjustPoints', player: 1, delta: 3 })).toBe(s)
  })
})

describe('Burn Out (CR 432)', () => {
  it('o oponente de quem sofreu Burn Out ganha 1 ponto', () => {
    const s = run(newGame(0), { type: 'burnOut', player: 0 })
    expect(s.players[1].points).toBe(1)
    expect(s.players[0].points).toBe(0)
  })
})

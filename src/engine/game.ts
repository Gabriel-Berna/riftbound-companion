import {
  DOMAINS,
  type Battlefield,
  type GameResult,
  type GameState,
  type LogEntry,
  type PlayerIndex,
  type PlayerState,
  type PowerKind,
  type PowerPool,
} from './types'

export const VICTORY_SCORE_1V1 = 8

export type GameAction =
  /** Encerra o turno atual e começa o do oponente. */
  | { type: 'passTurn' }
  | { type: 'conquer'; player: PlayerIndex; battlefieldId: string }
  | { type: 'hold'; player: PlayerIndex; battlefieldId: string }
  /** Corrige o controle sem pontuar (ex.: o jogador ficou sem unidades no battlefield). */
  | { type: 'setControl'; battlefieldId: string; controller: PlayerIndex | null }
  /** Pontos ganhos ou perdidos por efeitos de cartas. */
  | { type: 'adjustPoints'; player: PlayerIndex; delta: number }
  /** `player` sofreu Burn Out: o oponente ganha 1 ponto. */
  | { type: 'burnOut'; player: PlayerIndex }
  | { type: 'adjustXp'; player: PlayerIndex; delta: number }
  | { type: 'adjustEnergy'; player: PlayerIndex; delta: number }
  | { type: 'adjustPower'; player: PlayerIndex; kind: PowerKind; delta: number }
  | { type: 'clearPool'; player: PlayerIndex }
  | { type: 'concede'; player: PlayerIndex }
  | { type: 'declareDraw' }

export interface NewGameOptions {
  playerNames: [string, string]
  /** Nome do battlefield que cada jogador escolheu para este jogo. */
  battlefieldNames: [string, string]
  firstPlayer: PlayerIndex
  victoryScore?: number
}

export const other = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0)

const emptyPower = (): PowerPool =>
  Object.fromEntries([...DOMAINS, 'universal'].map((k) => [k, 0])) as PowerPool

const newPlayer = (name: string): PlayerState => ({ name, points: 0, xp: 0, energy: 0, power: emptyPower() })

export function createGame(opts: NewGameOptions): GameState {
  const battlefields: Battlefield[] = opts.battlefieldNames.map((name, i) => ({
    id: `bf${i}`,
    name,
    owner: i as PlayerIndex,
    controller: null,
  }))
  return {
    victoryScore: opts.victoryScore ?? VICTORY_SCORE_1V1,
    players: [newPlayer(opts.playerNames[0]), newPlayer(opts.playerNames[1])],
    battlefields,
    firstPlayer: opts.firstPlayer,
    turn: 1,
    active: opts.firstPlayer,
    turnsTaken: opts.firstPlayer === 0 ? [1, 0] : [0, 1],
    scoredThisTurn: [[], []],
    log: [{ kind: 'turn-start', turn: 1, player: opts.firstPlayer }],
    result: null,
  }
}

/** Runas a canalizar na Channel Phase: 2, mais 1 no primeiro turno de quem joga em segundo (CR 487.7). */
export function runesToChannel(s: GameState): number {
  const isSecondPlayersFirstTurn = s.active !== s.firstPlayer && s.turnsTaken[s.active] === 1
  return isSecondPlayersFirstTurn ? 3 : 2
}

/** Se um Conquer agora daria o ponto ao jogador, ou se seria barrado pela regra do Ponto Final. */
export function conquerOutcome(s: GameState, player: PlayerIndex, battlefieldId: string): 'point' | 'blocked' | 'already-scored' {
  const scored = s.scoredThisTurn[player]
  if (scored.includes(battlefieldId)) return 'already-scored'
  if (s.players[player].points < s.victoryScore - 1) return 'point'
  const scoredAll = s.battlefields.every((bf) => bf.id === battlefieldId || scored.includes(bf.id))
  return scoredAll ? 'point' : 'blocked'
}

export function gameReducer(s: GameState, a: GameAction): GameState {
  if (s.result) return s
  const next = structuredClone(s)
  apply(next, a)
  return next
}

function apply(s: GameState, a: GameAction): void {
  switch (a.type) {
    case 'passTurn':
      return passTurn(s)

    case 'conquer': {
      const bf = findBattlefield(s, a.battlefieldId)
      const outcome = conquerOutcome(s, a.player, bf.id)
      bf.controller = a.player
      if (outcome === 'already-scored') {
        log(s, { kind: 'already-scored', turn: s.turn, player: a.player, battlefield: bf.name })
        return
      }
      s.scoredThisTurn[a.player].push(bf.id)
      if (outcome === 'blocked') {
        log(s, { kind: 'final-point-blocked', turn: s.turn, player: a.player, battlefield: bf.name })
        return
      }
      gainPoints(s, a.player, 1)
      log(s, { kind: 'conquer', turn: s.turn, player: a.player, battlefield: bf.name, points: s.players[a.player].points })
      return checkVictory(s)
    }

    case 'hold': {
      const bf = findBattlefield(s, a.battlefieldId)
      if (bf.controller !== a.player || s.scoredThisTurn[a.player].includes(bf.id)) return
      holdBattlefield(s, a.player, bf)
      return checkVictory(s)
    }

    case 'setControl': {
      const bf = findBattlefield(s, a.battlefieldId)
      if (bf.controller === a.controller) return
      bf.controller = a.controller
      log(s, { kind: 'control', turn: s.turn, player: a.controller, battlefield: bf.name })
      return
    }

    case 'adjustPoints': {
      const before = s.players[a.player].points
      gainPoints(s, a.player, a.delta)
      const delta = s.players[a.player].points - before
      if (delta === 0) return
      log(s, { kind: 'points', turn: s.turn, player: a.player, delta, points: s.players[a.player].points })
      return checkVictory(s)
    }

    case 'burnOut': {
      const beneficiary = other(a.player)
      gainPoints(s, beneficiary, 1)
      log(s, { kind: 'burn-out', turn: s.turn, player: a.player, beneficiary, points: s.players[beneficiary].points })
      return checkVictory(s)
    }

    case 'adjustXp': {
      const p = s.players[a.player]
      p.xp = Math.max(0, p.xp + a.delta)
      return
    }

    case 'adjustEnergy': {
      const p = s.players[a.player]
      p.energy = Math.max(0, p.energy + a.delta)
      return
    }

    case 'adjustPower': {
      const p = s.players[a.player]
      p.power[a.kind] = Math.max(0, p.power[a.kind] + a.delta)
      return
    }

    case 'clearPool':
      return clearPool(s.players[a.player])

    case 'concede':
      return finish(s, { kind: 'win', winner: other(a.player), reason: 'concede' })

    case 'declareDraw':
      return finish(s, { kind: 'draw' })
  }
}

function passTurn(s: GameState): void {
  // Ending Phase: o rune pool esvazia (CR 317.2.d).
  s.players.forEach(clearPool)
  s.active = other(s.active)
  s.turn += 1
  s.turnsTaken[s.active] += 1
  s.scoredThisTurn = [[], []]
  log(s, { kind: 'turn-start', turn: s.turn, player: s.active })
  // Scoring Step da Beginning Phase: o novo jogador segura os battlefields que controla (CR 315.2.b).
  for (const bf of s.battlefields) {
    if (bf.controller === s.active) holdBattlefield(s, s.active, bf)
  }
  checkVictory(s)
}

function holdBattlefield(s: GameState, player: PlayerIndex, bf: Battlefield): void {
  // Hold não está sujeito à restrição do Ponto Final (CR 473.1.a.1).
  s.scoredThisTurn[player].push(bf.id)
  gainPoints(s, player, 1)
  log(s, { kind: 'hold', turn: s.turn, player, battlefield: bf.name, points: s.players[player].points })
}

/** Vitória: pontos ≥ Victory Score e mais pontos que o oponente (CR 194.2). Empate acima do alvo continua. */
function checkVictory(s: GameState): void {
  const [a, b] = s.players.map((p) => p.points)
  if (a >= s.victoryScore && a > b) finish(s, { kind: 'win', winner: 0, reason: 'points' })
  else if (b >= s.victoryScore && b > a) finish(s, { kind: 'win', winner: 1, reason: 'points' })
}

function finish(s: GameState, result: GameResult): void {
  s.result = result
  log(s, { kind: 'result', turn: s.turn, result })
}

/** Pontos nunca ficam abaixo de 0 (CR 194.4). */
function gainPoints(s: GameState, player: PlayerIndex, delta: number): void {
  const p = s.players[player]
  p.points = Math.max(0, p.points + delta)
}

function clearPool(p: PlayerState): void {
  p.energy = 0
  p.power = emptyPower()
}

function findBattlefield(s: GameState, id: string): Battlefield {
  const bf = s.battlefields.find((b) => b.id === id)
  if (!bf) throw new Error(`Battlefield desconhecido: ${id}`)
  return bf
}

function log(s: GameState, entry: LogEntry): void {
  s.log.push(entry)
}

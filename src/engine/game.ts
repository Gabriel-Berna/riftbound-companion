import type { GameResult, GameState, LogEntry, PlayerIndex, PlayerState, ScoreKind } from './types'

export const VICTORY_SCORE_1V1 = 8

/** Battlefields que alteram os pontos necessários para vencer enquanto estão em jogo. */
const VICTORY_SCORE_MODIFIERS: Record<string, number> = {
  // "Increase the points needed to win the game by 1."
  "Aspirant's Climb": 1,
}

export type GameAction =
  /**
   * Ponto por Hold ou Conquer. Num Conquer a 1 ponto da vitória, `scoredAllBattlefields` diz se o jogador
   * já pontuou todos os battlefields neste turno; sem isso, o ponto é barrado (CR 473.1.b).
   */
  | { type: 'score'; player: PlayerIndex; kind: ScoreKind; scoredAllBattlefields?: boolean }
  /** Pontos ganhos ou perdidos por efeitos de cartas, ou correções. */
  | { type: 'adjustPoints'; player: PlayerIndex; delta: number }
  /** `player` sofreu Burn Out: o oponente ganha 1 ponto. */
  | { type: 'burnOut'; player: PlayerIndex }
  | { type: 'adjustXp'; player: PlayerIndex; delta: number }
  | { type: 'concede'; player: PlayerIndex }
  /** Vitória concedida por um efeito de carta (ex.: battlefield que dá a vitória com 7+ unidades). */
  | { type: 'winByEffect'; player: PlayerIndex }
  /** O tempo da rodada acabou durante o jogo (TR 408.2). */
  | { type: 'timeUp' }
  /** Os turnos extras acabaram: decide pelo placar (TR 408.2.b). */
  | { type: 'endByTime' }
  | { type: 'declareDraw' }

export interface NewGameOptions {
  playerNames: [string, string]
  /** Nome do battlefield que cada jogador escolheu para este jogo. */
  battlefieldNames: [string, string]
  firstPlayer: PlayerIndex
  victoryScore?: number
}

export const other = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0)

/** Turnos extras depois do fim do tempo (TR 408.2.a). */
export const EXTRA_TURNS = 3

const newPlayer = (name: string): PlayerState => ({ name, points: 0, xp: 0 })

export function createGame(opts: NewGameOptions): GameState {
  const modifier = opts.battlefieldNames.reduce((sum, name) => sum + (VICTORY_SCORE_MODIFIERS[name] ?? 0), 0)
  return {
    victoryScore: (opts.victoryScore ?? VICTORY_SCORE_1V1) + modifier,
    players: [newPlayer(opts.playerNames[0]), newPlayer(opts.playerNames[1])],
    battlefields: opts.battlefieldNames,
    firstPlayer: opts.firstPlayer,
    log: [],
    result: null,
  }
}

/** Um Conquer agora cai na regra do Ponto Final: o jogador está a 1 ponto da vitória (CR 473.1.b). */
export function needsFinalPointCheck(s: GameState, player: PlayerIndex): boolean {
  return s.players[player].points === s.victoryScore - 1
}

export function gameReducer(s: GameState, a: GameAction): GameState {
  if (s.result) return s
  const next = structuredClone(s)
  apply(next, a)
  return next
}

function apply(s: GameState, a: GameAction): void {
  switch (a.type) {
    case 'score': {
      // Hold não está sujeito ao Ponto Final (CR 473.1.a.1); Conquer, só com todos os battlefields pontuados.
      if (a.kind === 'conquer' && needsFinalPointCheck(s, a.player) && !a.scoredAllBattlefields) {
        log(s, { kind: 'final-point-blocked', player: a.player })
        return
      }
      gainPoints(s, a.player, 1)
      log(s, { kind: a.kind, player: a.player, points: s.players[a.player].points })
      return checkVictory(s)
    }

    case 'adjustPoints': {
      const before = s.players[a.player].points
      gainPoints(s, a.player, a.delta)
      const delta = s.players[a.player].points - before
      if (delta === 0) return
      log(s, { kind: 'points', player: a.player, delta, points: s.players[a.player].points })
      return checkVictory(s)
    }

    case 'burnOut': {
      const beneficiary = other(a.player)
      gainPoints(s, beneficiary, 1)
      log(s, { kind: 'burn-out', player: a.player, beneficiary, points: s.players[beneficiary].points })
      return checkVictory(s)
    }

    case 'adjustXp': {
      const p = s.players[a.player]
      p.xp = Math.max(0, p.xp + a.delta)
      return
    }

    case 'concede':
      return finish(s, { kind: 'win', winner: other(a.player), reason: 'concede' })

    case 'winByEffect':
      return finish(s, { kind: 'win', winner: a.player, reason: 'effect' })

    case 'timeUp':
      if (s.timeUp) return
      s.timeUp = true
      log(s, { kind: 'time-up' })
      return

    case 'endByTime':
      return finishByTime(s)

    case 'declareDraw':
      return finish(s, { kind: 'draw' })
  }
}

/** Fim dos turnos extras: vence quem tiver 2 ou mais pontos de vantagem; senão, empate (TR 408.2.b). */
function finishByTime(s: GameState): void {
  const [a, b] = s.players.map((p) => p.points)
  if (a - b >= 2) finish(s, { kind: 'win', winner: 0, reason: 'time' })
  else if (b - a >= 2) finish(s, { kind: 'win', winner: 1, reason: 'time' })
  else finish(s, { kind: 'draw' })
}

/** Vitória: pontos ≥ Victory Score e mais pontos que o oponente (CR 194.2). Empate acima do alvo continua. */
function checkVictory(s: GameState): void {
  const [a, b] = s.players.map((p) => p.points)
  if (a >= s.victoryScore && a > b) finish(s, { kind: 'win', winner: 0, reason: 'points' })
  else if (b >= s.victoryScore && b > a) finish(s, { kind: 'win', winner: 1, reason: 'points' })
}

function finish(s: GameState, result: GameResult): void {
  s.result = result
  log(s, { kind: 'result', result })
}

/** Pontos nunca ficam abaixo de 0 (CR 194.4). */
function gainPoints(s: GameState, player: PlayerIndex, delta: number): void {
  const p = s.players[player]
  p.points = Math.max(0, p.points + delta)
}

function log(s: GameState, entry: LogEntry): void {
  s.log.push(entry)
}

/** Jogo salvo por uma versão anterior do app (com turnos e battlefields como objetos): converte para o formato atual. */
export function migrateGame(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Omit<GameState, 'battlefields'> & { battlefields: (string | { name: string })[]; timeUpTurn?: number | null }
  if (!Array.isArray(g.players) || !Array.isArray(g.battlefields)) return null
  const names = g.battlefields.map((b) => (typeof b === 'string' ? b : b.name)) as [string, string]
  const knownKinds = new Set(['hold', 'conquer', 'final-point-blocked', 'points', 'burn-out', 'time-up', 'result'])
  return {
    victoryScore: g.victoryScore,
    players: g.players.map((p) => ({ name: p.name, points: p.points, xp: p.xp ?? 0 })) as GameState['players'],
    battlefields: names,
    firstPlayer: g.firstPlayer,
    log: (g.log ?? []).filter((e) => knownKinds.has(e.kind)),
    result: g.result,
    timeUp: g.timeUp ?? g.timeUpTurn != null,
  }
}

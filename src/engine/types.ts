export type PlayerIndex = 0 | 1

export const DOMAINS = ['fury', 'calm', 'mind', 'body', 'chaos', 'order'] as const
export type Domain = (typeof DOMAINS)[number]
/** Power de domínio específico, mais o Power universal ([A], paga qualquer domínio). */
export type PowerKind = Domain | 'universal'
export type PowerPool = Record<PowerKind, number>

export interface Battlefield {
  id: string
  name: string
  /** Jogador que trouxe este battlefield no deck. */
  owner: PlayerIndex
  controller: PlayerIndex | null
}

export interface PlayerState {
  name: string
  points: number
  xp: number
  /** Energy e Power acumulados no rune pool (CR 165–167). */
  energy: number
  power: PowerPool
}

export type GameResult =
  | { kind: 'win'; winner: PlayerIndex; reason: 'points' | 'concede' | 'effect' | 'time' }
  | { kind: 'draw' }

export type LogEntry =
  | { kind: 'hold' | 'conquer'; turn: number; player: PlayerIndex; battlefield: string; points: number }
  /** Conquer sem ponto: jogador a 1 ponto da vitória sem ter pontuado todos os battlefields (CR 473.1.b). */
  | { kind: 'final-point-blocked'; turn: number; player: PlayerIndex; battlefield: string }
  /** Conquer de um battlefield já pontuado neste turno (CR 472). */
  | { kind: 'already-scored'; turn: number; player: PlayerIndex; battlefield: string }
  | { kind: 'control'; turn: number; player: PlayerIndex | null; battlefield: string }
  | { kind: 'points'; turn: number; player: PlayerIndex; delta: number; points: number }
  /** `player` sofreu Burn Out; `beneficiary` ganhou o ponto (CR 432). */
  | { kind: 'burn-out'; turn: number; player: PlayerIndex; beneficiary: PlayerIndex; points: number }
  | { kind: 'turn-start'; turn: number; player: PlayerIndex }
  | { kind: 'time-up'; turn: number; player: PlayerIndex }
  | { kind: 'result'; turn: number; result: GameResult }

export interface GameState {
  victoryScore: number
  players: [PlayerState, PlayerState]
  battlefields: Battlefield[]
  firstPlayer: PlayerIndex
  /** Contador global de turnos, começando em 1. */
  turn: number
  active: PlayerIndex
  /** Quantos turnos cada jogador já começou (para o ajuste do primeiro turno). */
  turnsTaken: [number, number]
  /** IDs dos battlefields que cada jogador pontuou neste turno (CR 472). */
  scoredThisTurn: [string[], string[]]
  log: LogEntry[]
  result: GameResult | null
  /** Turno em que o tempo da rodada acabou (TR 408.2); `null` enquanto houver tempo. */
  timeUpTurn?: number | null
}

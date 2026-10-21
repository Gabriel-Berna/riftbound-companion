export type PlayerIndex = 0 | 1

export const DOMAINS = ['fury', 'calm', 'mind', 'body', 'chaos', 'order'] as const
export type Domain = (typeof DOMAINS)[number]

export interface PlayerState {
  name: string
  points: number
  /** Recurso público e sem limite (CR 728–733). */
  xp: number
}

export type GameResult =
  | { kind: 'win'; winner: PlayerIndex; reason: 'points' | 'concede' | 'effect' | 'time' }
  | { kind: 'draw' }

/** Como o ponto veio: segurando (Hold) ou conquistando (Conquer) um battlefield (CR 471). */
export type ScoreKind = 'hold' | 'conquer'

export type LogEntry =
  | { kind: ScoreKind; player: PlayerIndex; points: number }
  /** Conquer sem ponto: a 1 ponto da vitória, sem ter pontuado todos os battlefields no turno (CR 473.1.b). */
  | { kind: 'final-point-blocked'; player: PlayerIndex }
  | { kind: 'points'; player: PlayerIndex; delta: number; points: number }
  /** `player` sofreu Burn Out; `beneficiary` ganhou o ponto (CR 432). */
  | { kind: 'burn-out'; player: PlayerIndex; beneficiary: PlayerIndex; points: number }
  | { kind: 'time-up' }
  | { kind: 'result'; result: GameResult }

/**
 * Placar de um jogo. O app não acompanha turnos nem quem controla cada battlefield:
 * os jogadores registram cada ponto com um toque, e o app aplica as regras de pontuação.
 */
export interface GameState {
  victoryScore: number
  players: [PlayerState, PlayerState]
  /** Battlefield escolhido por cada jogador para este jogo. */
  battlefields: [string, string]
  firstPlayer: PlayerIndex
  log: LogEntry[]
  result: GameResult | null
  /** O tempo da rodada acabou: os jogadores terminam o turno e jogam os turnos extras (TR 408.2). */
  timeUp?: boolean
  /** Início do jogo (ms desde 1970), para medir a duração. */
  startedAt?: number
}

import { createGame, gameReducer, type GameAction } from './game'
import type { GameResult, GameState, PlayerIndex } from './types'

/** 'duel' = 1v1 Duel, melhor de 1 (CR 487). 'match' = 1v1 Match, melhor de 3 (CR 488). */
export type MatchFormat = 'duel' | 'match'

export interface MatchPlayer {
  name: string
  /** Nome (título) da lenda do jogador, como na galeria oficial. */
  legend?: string
  /** Arte escolhida para a lenda (URL de uma das artes dela); sem ela, usa a principal. */
  legendArt?: string
  /** Os 3 battlefields do deck do jogador. */
  battlefields: [string, string, string]
}

export interface CompletedGame {
  result: GameResult
  battlefields: [string, string]
  firstPlayer: PlayerIndex
  finalPoints: [number, number]
}

/** Relógio da rodada, baseado no horário real (sobrevive a recarregar o app). */
export interface RoundTimer {
  minutes: number
  /** Início do relógio (ms desde 1970), ao começar o primeiro jogo. */
  startedAt: number | null
  /** Momento da pausa atual, se pausado. */
  pausedAt: number | null
  /** Tempo total em pausas anteriores (ms). */
  pausedMs: number
}

export interface MatchState {
  format: MatchFormat
  players: [MatchPlayer, MatchPlayer]
  games: CompletedGame[]
  /** Battlefields já usados em jogos com vencedor, que não podem voltar nesta partida (CR 488.5). */
  removed: [string[], string[]]
  game: GameState | null
  timer?: RoundTimer | null
  /** O tempo da rodada acabou: nenhum jogo novo começa (TR 408.2.d). */
  timeUp?: boolean
}

/** Quem define quem começa o próximo jogo (TR 407). */
export type FirstPlayerRule =
  /** Primeiro jogo: um sorteio define quem escolhe. */
  | { kind: 'random' }
  /** Quem perdeu o jogo anterior escolhe. */
  | { kind: 'chooser'; player: PlayerIndex }
  /** O jogo anterior empatou: mantém-se quem começou. */
  | { kind: 'fixed'; firstPlayer: PlayerIndex }

export type MatchAction =
  | { type: 'startGame'; battlefieldNames: [string, string]; firstPlayer: PlayerIndex; now?: number }
  | { type: 'pauseTimer'; now: number }
  | { type: 'resumeTimer'; now: number }
  /** O relógio da rodada chegou a zero. */
  | { type: 'timeUp' }
  | { type: 'game'; action: GameAction }
  /** Registra o resultado do jogo encerrado e libera o próximo. */
  | { type: 'finishGame' }

export function createMatch(format: MatchFormat, players: [MatchPlayer, MatchPlayer], timerMinutes?: number): MatchState {
  const timer = timerMinutes ? { minutes: timerMinutes, startedAt: null, pausedAt: null, pausedMs: 0 } : null
  return { format, players, games: [], removed: [[], []], game: null, timer, timeUp: false }
}

/** Tempo restante da rodada em ms (pode ser negativo); `null` sem timer ou antes de começar. */
export function timeLeft(m: MatchState, now: number): number | null {
  const t = m.timer
  if (!t || t.startedAt === null) return null
  const paused = t.pausedMs + (t.pausedAt !== null ? now - t.pausedAt : 0)
  return t.minutes * 60_000 - (now - t.startedAt - paused)
}

export const winsNeeded = (m: MatchState): number => (m.format === 'duel' ? 1 : 2)

export function gameWins(m: MatchState): [number, number] {
  const wins: [number, number] = [0, 0]
  for (const g of m.games) if (g.result.kind === 'win') wins[g.result.winner] += 1
  return wins
}

export function matchWinner(m: MatchState): PlayerIndex | null {
  const wins = gameWins(m)
  const needed = winsNeeded(m)
  if (wins[0] >= needed) return 0
  if (wins[1] >= needed) return 1
  // Tempo esgotado entre jogos: vence quem tem mais vitórias (TR 408.3.a).
  if (m.timeUp && !m.game && wins[0] !== wins[1]) return wins[0] > wins[1] ? 0 : 1
  return null
}

/** A partida acabou: alguém venceu, o tempo esgotou entre jogos ou (melhor de 1) o único jogo terminou. */
export function isMatchOver(m: MatchState): boolean {
  if (matchWinner(m) !== null) return true
  if (m.timeUp && !m.game) return true
  return m.format === 'duel' && m.games.length > 0
}

export function availableBattlefields(m: MatchState, player: PlayerIndex): string[] {
  return m.players[player].battlefields.filter((name) => !m.removed[player].includes(name))
}

export function firstPlayerRule(m: MatchState): FirstPlayerRule {
  const last = m.games.at(-1)
  if (!last) return { kind: 'random' }
  if (last.result.kind === 'draw') return { kind: 'fixed', firstPlayer: last.firstPlayer }
  const loser: PlayerIndex = last.result.winner === 0 ? 1 : 0
  return { kind: 'chooser', player: loser }
}

export function matchReducer(m: MatchState, a: MatchAction): MatchState {
  switch (a.type) {
    case 'startGame': {
      if (m.game || isMatchOver(m)) return m
      // O relógio da rodada começa junto com o primeiro jogo.
      const timer = m.timer && m.timer.startedAt === null ? { ...m.timer, startedAt: a.now ?? Date.now() } : m.timer
      return {
        ...m,
        timer,
        game: createGame({
          playerNames: [m.players[0].name, m.players[1].name],
          battlefieldNames: a.battlefieldNames,
          firstPlayer: a.firstPlayer,
        }),
      }
    }

    case 'pauseTimer':
      if (!m.timer || m.timer.startedAt === null || m.timer.pausedAt !== null || m.timeUp) return m
      return { ...m, timer: { ...m.timer, pausedAt: a.now } }

    case 'resumeTimer':
      if (!m.timer || m.timer.pausedAt === null) return m
      return { ...m, timer: { ...m.timer, pausedAt: null, pausedMs: m.timer.pausedMs + (a.now - m.timer.pausedAt) } }

    case 'timeUp':
      if (m.timeUp) return m
      return { ...m, timeUp: true, game: m.game ? gameReducer(m.game, { type: 'timeUp' }) : null }

    case 'game':
      if (!m.game) return m
      return { ...m, game: gameReducer(m.game, a.action) }

    case 'finishGame': {
      const g = m.game
      if (!g?.result) return m
      const battlefields: [string, string] = [g.battlefields[0].name, g.battlefields[1].name]
      // Battlefields de um jogo com vencedor saem da partida; após empate, podem voltar (CR 488.5–488.5.a).
      const removed: [string[], string[]] =
        g.result.kind === 'win'
          ? [[...m.removed[0], battlefields[0]], [...m.removed[1], battlefields[1]]]
          : m.removed
      return {
        ...m,
        game: null,
        removed,
        games: [
          ...m.games,
          {
            result: g.result,
            battlefields,
            firstPlayer: g.firstPlayer,
            finalPoints: [g.players[0].points, g.players[1].points],
          },
        ],
      }
    }
  }
}

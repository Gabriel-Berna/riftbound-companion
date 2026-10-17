import type { Domain, GameState, LogEntry, PowerKind } from '../engine/types'

export const POWER_LABELS: Record<PowerKind, string> = {
  fury: 'Fury',
  calm: 'Calm',
  mind: 'Mind',
  body: 'Body',
  chaos: 'Chaos',
  order: 'Order',
  universal: 'Qualquer',
}

export const DOMAIN_COLORS: Record<Domain | 'universal', string> = {
  fury: '#e5484d',
  calm: '#46a758',
  mind: '#3e9fd6',
  body: '#f76b15',
  chaos: '#9b5de5',
  order: '#e2b93b',
  universal: '#9ba1a6',
}

const name = (g: GameState, p: 0 | 1) => g.players[p].name

/** Descrição de uma entrada do histórico do jogo. */
export function describeLog(g: GameState, e: LogEntry): string {
  switch (e.kind) {
    case 'hold':
      return `${name(g, e.player)} segurou ${e.battlefield}: +1 (${e.points})`
    case 'conquer':
      return `${name(g, e.player)} conquistou ${e.battlefield}: +1 (${e.points})`
    case 'final-point-blocked':
      return `${name(g, e.player)} conquistou ${e.battlefield}, mas o ponto final foi barrado: compra 1 carta`
    case 'already-scored':
      return `${name(g, e.player)} conquistou ${e.battlefield} (já pontuado neste turno: sem ponto)`
    case 'control':
      return e.player === null
        ? `${e.battlefield} ficou sem controle`
        : `${e.battlefield} passou para ${name(g, e.player)} (sem pontuar)`
    case 'points':
      return `${name(g, e.player)} ${e.delta > 0 ? 'ganhou' : 'perdeu'} ${Math.abs(e.delta)} ponto${Math.abs(e.delta) > 1 ? 's' : ''} por efeito (${e.points})`
    case 'burn-out':
      return `${name(g, e.player)} sofreu Burn Out: ${name(g, e.beneficiary)} +1 (${e.points})`
    case 'turn-start':
      return `Turno ${e.turn}: vez de ${name(g, e.player)}`
    case 'time-up':
      return `Tempo esgotado: ${name(g, e.player)} termina o turno e vêm mais 3 turnos`
    case 'result':
      if (e.result.kind === 'draw') return 'Jogo empatado'
      if (e.result.reason === 'concede') return `${name(g, e.result.winner === 0 ? 1 : 0)} concedeu: ${name(g, e.result.winner)} vence`
      if (e.result.reason === 'effect') return `${name(g, e.result.winner)} venceu por efeito de carta`
      if (e.result.reason === 'time') return `Fim dos turnos extras: ${name(g, e.result.winner)} vence com 2+ pontos de vantagem`
      return `${name(g, e.result.winner)} venceu o jogo`
  }
}

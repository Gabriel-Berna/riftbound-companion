import type { Domain, GameState, LogEntry } from '../engine/types'

export const POWER_LABELS: Record<Domain | 'universal', string> = {
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
      return `${name(g, e.player)} +1 por Hold (${e.points})`
    case 'conquer':
      return `${name(g, e.player)} +1 por Conquer (${e.points})`
    case 'final-point-blocked':
      return `${name(g, e.player)} conquistou, mas o ponto final foi barrado: compra 1 carta`
    case 'points':
      return `${name(g, e.player)} ${e.delta > 0 ? '+' : '−'}${Math.abs(e.delta)} por efeito ou correção (${e.points})`
    case 'burn-out':
      return `${name(g, e.player)} sofreu Burn Out: ${name(g, e.beneficiary)} +1 (${e.points})`
    case 'time-up':
      return 'Tempo esgotado: terminem o turno e joguem mais 3 turnos'
    case 'result':
      if (e.result.kind === 'draw') return 'Jogo empatado'
      if (e.result.reason === 'concede') return `${name(g, e.result.winner === 0 ? 1 : 0)} concedeu: ${name(g, e.result.winner)} vence`
      if (e.result.reason === 'effect') return `${name(g, e.result.winner)} venceu por efeito de carta`
      if (e.result.reason === 'time') return `Fim dos turnos extras: ${name(g, e.result.winner)} vence com 2+ pontos de vantagem`
      return `${name(g, e.result.winner)} venceu o jogo`
  }
}

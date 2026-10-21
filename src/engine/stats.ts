import { gameWins, type CompletedGame, type MatchFormat, type MatchPlayer, type MatchState } from './match'

/**
 * Partida encerrada, guardada para as estatísticas.
 * Convenção: `players[0]` é você (o Jogador 1, o painel de baixo); `players[1]` é o oponente.
 */
export interface MatchRecord {
  id: string
  /** Data e hora em ISO 8601. */
  date: string
  format: MatchFormat
  players: [MatchPlayer, MatchPlayer]
  games: CompletedGame[]
  /** 'app' = jogada com o placar do app; 'manual' = registrada depois. */
  source: 'app' | 'manual'
}

export type Outcome = 'win' | 'loss' | 'draw'

export interface Tally {
  played: number
  wins: number
  losses: number
  draws: number
}

export interface StatRow extends Tally {
  key: string
}

export interface Stats {
  matches: Tally
  games: Tally
  /** Jogos em que você começou / em que o oponente começou. */
  goingFirst: Tally
  goingSecond: Tally
  byMyLegend: StatRow[]
  /** Desempenho por deck salvo (só partidas em que você escolheu um deck). */
  byMyDeck: StatRow[]
  byOpponentLegend: StatRow[]
  byOpponent: StatRow[]
  /** Desempenho nos jogos disputados com cada um dos seus battlefields. */
  byMyBattlefield: StatRow[]
}

export interface StatsFilter {
  /** Considera só as partidas jogadas com esta lenda sua. */
  myLegend?: string
}

/** Nomes automáticos dados a battlefields não informados (ex.: "Battlefield A1"). */
export const isPlaceholderBattlefield = (name: string): boolean => /^Battlefield [AB]\d/.test(name)

export function recordFromMatch(m: MatchState, id: string, date: Date): MatchRecord {
  return { id, date: date.toISOString(), format: m.format, players: m.players, games: m.games, source: 'app' }
}

const emptyTally = (): Tally => ({ played: 0, wins: 0, losses: 0, draws: 0 })

function add(t: Tally, o: Outcome): void {
  t.played += 1
  if (o === 'win') t.wins += 1
  else if (o === 'loss') t.losses += 1
  else t.draws += 1
}

/** Percentual de vitórias (empates contam como não vitória); `null` sem jogos. */
export const winRate = (t: Tally): number | null => (t.played === 0 ? null : t.wins / t.played)

export function gameOutcome(g: CompletedGame): Outcome {
  if (g.result.kind === 'draw') return 'draw'
  return g.result.winner === 0 ? 'win' : 'loss'
}

/** Resultado da partida para você: quem venceu mais jogos. */
export function matchOutcome(r: MatchRecord): Outcome {
  const [mine, theirs] = gameWins({ format: r.format, games: r.games } as MatchState)
  if (mine > theirs) return 'win'
  if (theirs > mine) return 'loss'
  return 'draw'
}

/** Agrupa por chave; registros sem chave (ex.: lenda não informada) ficam de fora. */
function group(rows: Map<string, StatRow>, key: string | undefined, o: Outcome): void {
  if (!key) return
  let row = rows.get(key)
  if (!row) rows.set(key, (row = { key, ...emptyTally() }))
  add(row, o)
}

/** Mais jogadas primeiro; empate pelo nome. */
const sorted = (rows: Map<string, StatRow>): StatRow[] =>
  [...rows.values()].sort((a, b) => b.played - a.played || a.key.localeCompare(b.key))

export function computeStats(records: MatchRecord[], filter: StatsFilter = {}): Stats {
  const stats = {
    matches: emptyTally(),
    games: emptyTally(),
    goingFirst: emptyTally(),
    goingSecond: emptyTally(),
  }
  const byMyLegend = new Map<string, StatRow>()
  const byMyDeck = new Map<string, StatRow>()
  const byOpponentLegend = new Map<string, StatRow>()
  const byOpponent = new Map<string, StatRow>()
  const byMyBattlefield = new Map<string, StatRow>()

  for (const r of records) {
    const [me, opponent] = r.players
    if (filter.myLegend && me.legend !== filter.myLegend) continue
    if (r.games.length === 0) continue

    const mo = matchOutcome(r)
    add(stats.matches, mo)
    group(byOpponent, opponent.name, mo)

    for (const g of r.games) {
      const go = gameOutcome(g)
      add(stats.games, go)
      add(g.firstPlayer === 0 ? stats.goingFirst : stats.goingSecond, go)
      group(byMyLegend, me.legend, go)
      group(byMyDeck, me.deck, go)
      group(byOpponentLegend, opponent.legend, go)
      if (!isPlaceholderBattlefield(g.battlefields[0])) group(byMyBattlefield, g.battlefields[0], go)
    }
  }

  return {
    ...stats,
    byMyLegend: sorted(byMyLegend),
    byMyDeck: sorted(byMyDeck),
    byOpponentLegend: sorted(byOpponentLegend),
    byOpponent: sorted(byOpponent),
    byMyBattlefield: sorted(byMyBattlefield),
  }
}

/** Junta registros importados aos existentes, sem duplicar (mesmo `id`), do mais recente ao mais antigo. */
export function mergeRecords(current: MatchRecord[], incoming: MatchRecord[]): MatchRecord[] {
  const byId = new Map(current.map((r) => [r.id, r]))
  for (const r of incoming) if (!byId.has(r.id)) byId.set(r.id, r)
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date))
}

/** Confere se um objeto importado tem o formato de um registro de partida. */
export function isMatchRecord(x: unknown): x is MatchRecord {
  const r = x as MatchRecord
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof r.id === 'string' &&
    typeof r.date === 'string' &&
    (r.format === 'duel' || r.format === 'match') &&
    Array.isArray(r.players) &&
    r.players.length === 2 &&
    r.players.every((p) => typeof p?.name === 'string') &&
    Array.isArray(r.games) &&
    r.games.every((g) => g && (g.firstPlayer === 0 || g.firstPlayer === 1) && (g.result?.kind === 'draw' || g.result?.kind === 'win'))
  )
}

/** Pontos por origem, somados em vários jogos. */
export interface PointsSplit {
  hold: number
  conquer: number
  other: number
}

export interface ScoringRow {
  key: string
  /** Jogos com o placar detalhado. */
  games: number
  mine: PointsSplit
  theirs: PointsSplit
  /** Jogos com duração medida e a média deles (ms). */
  timedGames: number
  avgDurationMs: number | null
}

export interface ScoringStats extends Omit<ScoringRow, 'key'> {
  /** Por lenda adversária, das mais enfrentadas às menos. */
  byOpponentLegend: ScoringRow[]
}

const emptySplit = (): PointsSplit => ({ hold: 0, conquer: 0, other: 0 })

/** Total de pontos de uma divisão. */
export const splitTotal = (p: PointsSplit): number => p.hold + p.conquer + p.other

/**
 * Como os pontos saíram (Hold, Conquer, outros) e quanto duram os jogos, do seu ponto de vista.
 * Só entram jogos jogados com o placar do app (registros manuais não têm esses dados).
 */
export function scoringStats(records: MatchRecord[], filter: StatsFilter = {}): ScoringStats {
  type Acc = ScoringRow & { totalMs: number }
  const newAcc = (key: string): Acc => ({ key, games: 0, mine: emptySplit(), theirs: emptySplit(), timedGames: 0, avgDurationMs: null, totalMs: 0 })
  const total = newAcc('')
  const byLegend = new Map<string, Acc>()

  const addGame = (acc: Acc, g: CompletedGame) => {
    if (g.scoring) {
      acc.games += 1
      for (const kind of ['hold', 'conquer', 'other'] as const) {
        acc.mine[kind] += g.scoring[kind][0]
        acc.theirs[kind] += g.scoring[kind][1]
      }
    }
    if (g.durationMs !== undefined) {
      acc.timedGames += 1
      acc.totalMs += g.durationMs
    }
  }

  for (const r of records) {
    if (filter.myLegend && r.players[0].legend !== filter.myLegend) continue
    const theirs = r.players[1].legend
    for (const g of r.games) {
      if (!g.scoring && g.durationMs === undefined) continue
      addGame(total, g)
      if (theirs) {
        if (!byLegend.has(theirs)) byLegend.set(theirs, newAcc(theirs))
        addGame(byLegend.get(theirs)!, g)
      }
    }
  }

  const finish = ({ totalMs, ...acc }: Acc): ScoringRow => ({ ...acc, avgDurationMs: acc.timedGames ? totalMs / acc.timedGames : null })
  const { key: _key, ...overall } = finish(total)
  return {
    ...overall,
    byOpponentLegend: [...byLegend.values()].map(finish).sort((a, b) => b.games + b.timedGames - (a.games + a.timedGames) || a.key.localeCompare(b.key)),
  }
}

export interface TimelinePoint {
  /** Número do jogo na ordem cronológica (1, 2, 3…). */
  game: number
  date: string
  outcome: Outcome
  /** % de vitórias acumulada até este jogo (0 a 1). */
  rate: number
  wins: number
  played: number
}

/** Evolução da % de vitórias, jogo a jogo, do mais antigo ao mais recente. */
export function winRateTimeline(records: MatchRecord[], filter: StatsFilter = {}): TimelinePoint[] {
  const points: TimelinePoint[] = []
  let wins = 0
  const chronological = [...records].sort((a, b) => a.date.localeCompare(b.date))
  for (const r of chronological) {
    if (filter.myLegend && r.players[0].legend !== filter.myLegend) continue
    for (const g of r.games) {
      const outcome = gameOutcome(g)
      if (outcome === 'win') wins += 1
      const played = points.length + 1
      points.push({ game: played, date: r.date, outcome, rate: wins / played, wins, played })
    }
  }
  return points
}

export interface Matchup {
  myLegends: string[]
  opponentLegends: string[]
  /** Jogos de cada lenda sua (linha) contra cada lenda adversária (coluna). */
  cells: Map<string, Tally>
}

export const matchupKey = (mine: string, theirs: string) => `${mine}\u0000${theirs}`

/** Matriz de confrontos: suas lendas × lendas dos oponentes, contando jogos. */
export function matchupMatrix(records: MatchRecord[]): Matchup {
  const cells = new Map<string, Tally>()
  const mineCount = new Map<string, number>()
  const theirsCount = new Map<string, number>()
  for (const r of records) {
    const mine = r.players[0].legend
    const theirs = r.players[1].legend
    if (!mine || !theirs) continue
    for (const g of r.games) {
      const key = matchupKey(mine, theirs)
      const t = cells.get(key) ?? emptyTally()
      add(t, gameOutcome(g))
      cells.set(key, t)
      mineCount.set(mine, (mineCount.get(mine) ?? 0) + 1)
      theirsCount.set(theirs, (theirsCount.get(theirs) ?? 0) + 1)
    }
  }
  const byCount = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k)
  return { myLegends: byCount(mineCount), opponentLegends: byCount(theirsCount), cells }
}

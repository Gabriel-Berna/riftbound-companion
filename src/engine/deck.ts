import type { Domain } from './types'

/** O que a validação precisa saber de cada carta (a biblioteca de cartas satisfaz este formato). */
export interface DeckCard {
  name: string
  type: string
  super: string | null
  domains: Domain[]
  tags: string[]
  text: string
}

export interface DeckEntry {
  name: string
  count: number
}

export interface Deck {
  id: string
  name: string
  /** Lenda (título, como na galeria) e a arte escolhida para ela. */
  legend?: string
  legendArt?: string
  battlefields: [string, string, string]
  /** Lista de cartas (opcional): Main Deck e runas. */
  cards: DeckEntry[]
  updatedAt: string
}

export interface DeckLegend {
  champion: string
  domains: Domain[]
}

export type IssueLevel = 'error' | 'warning'

export interface DeckIssue {
  level: IssueLevel
  text: string
}

export interface DeckReport {
  mainCount: number
  runeCount: number
  battlefieldCount: number
  issues: DeckIssue[]
  /** Pronto para torneio: nenhuma pendência do tipo erro. */
  valid: boolean
}

export const MAIN_DECK_SIZE = 40
export const RUNE_DECK_SIZE = 12
const MAX_COPIES = 3
const MAX_SIGNATURES = 3

const isMain = (c: DeckCard) => c.type !== 'rune' && c.type !== 'battlefield' && c.type !== 'legend'

/**
 * Valida o deck pelas regras de construção (CR 103, TR 402.1).
 * `lookup` encontra a carta pelo nome; cartas desconhecidas viram aviso.
 */
export function validateDeck(deck: Deck, legend: DeckLegend | undefined, lookup: (name: string) => DeckCard | undefined): DeckReport {
  const issues: DeckIssue[] = []
  const error = (text: string) => issues.push({ level: 'error', text })
  const warning = (text: string) => issues.push({ level: 'warning', text })

  let mainCount = 0
  let runeCount = 0
  let signatures = 0
  let hasChampion = false
  const outside: string[] = []

  for (const entry of deck.cards) {
    const card = lookup(entry.name)
    if (!card) {
      warning(`Carta não encontrada na biblioteca: ${entry.name}`)
      continue
    }
    if (card.super === 'token') error(`${card.name} é um token e não pode estar no deck.`)
    if (card.type === 'rune') runeCount += entry.count
    else if (isMain(card)) {
      mainCount += entry.count
      // Máximo de 3 cópias por nome; Unique, só 1 (CR 103.3.b, 825.3.a).
      const max = /\[Unique\]/.test(card.text) ? 1 : MAX_COPIES
      if (entry.count > max) error(`${card.name}: ${entry.count} cópias (máximo ${max}).`)
      if (card.super === 'signature') {
        signatures += entry.count
        if (legend && !card.tags.includes(legend.champion)) error(`${card.name} é Signature de outro campeão.`)
      }
      if (legend && card.super === 'champion' && card.tags.includes(legend.champion)) hasChampion = true
    }
    // Domain Identity: só domínios da lenda (CR 103.2.b).
    if (legend && card.domains.some((d) => !legend.domains.includes(d))) outside.push(card.name)
  }

  if (!legend) error('Escolha a lenda do deck.')
  if (mainCount !== MAIN_DECK_SIZE) error(`Main Deck com ${mainCount} cartas (torneio exige exatamente ${MAIN_DECK_SIZE}).`)
  if (legend && deck.cards.length > 0 && !hasChampion) error(`Falta um Chosen Champion: uma unidade campeã de ${legend.champion}.`)
  if (signatures > MAX_SIGNATURES) error(`${signatures} cartas Signature (máximo ${MAX_SIGNATURES}).`)
  if (runeCount !== RUNE_DECK_SIZE) error(`Rune Deck com ${runeCount} runas (exatamente ${RUNE_DECK_SIZE}).`)
  if (outside.length) error(`Fora dos domínios da lenda: ${outside.join(', ')}.`)

  const battlefields = deck.battlefields.filter(Boolean)
  if (battlefields.length !== 3) error(`${battlefields.length} de 3 battlefields escolhidos.`)
  else if (new Set(battlefields).size !== 3) error('Os 3 battlefields precisam ter nomes diferentes.')

  return {
    mainCount,
    runeCount,
    battlefieldCount: battlefields.length,
    issues,
    valid: !issues.some((i) => i.level === 'error'),
  }
}

export interface ParsedList {
  entries: DeckEntry[]
  /** Linhas com quantidade cujo nome não foi encontrado. */
  unknown: string[]
  /** Lenda e battlefields encontrados na lista, se vierem junto. */
  legend?: string
  battlefields: string[]
}

const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+-\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()

type Section = 'legend' | 'battlefield' | 'rune' | 'main'

/** Cabeçalhos comuns em listas exportadas ("Legend:", "Battlefields:", "Runes:", "Main Deck:"…). */
function sectionOf(header: string): Section | null {
  const h = header.toLowerCase()
  if (/legend|lenda/.test(h)) return 'legend'
  if (/battlefield/.test(h)) return 'battlefield'
  if (/rune|runa/.test(h)) return 'rune'
  if (/deck|main|champion|campe|sideboard/.test(h)) return 'main'
  return null
}

/** Entre cartas de mesmo nome (ex.: a lenda e o equipamento "Unforgiven"), escolhe pela seção da lista. */
function pick(options: DeckCard[], section: Section): DeckCard {
  const fits = (c: DeckCard) => (section === 'main' ? isMain(c) : c.type === section)
  return options.find(fits) ?? options.find(isMain) ?? options[0]
}

/**
 * Lê uma lista colada (ex.: exportada de um site de decks). Aceita "3 Nome", "3x Nome" e "Nome x3";
 * linhas sem quantidade servem de cabeçalho de seção ou são ignoradas.
 */
export function parseDecklist(text: string, cards: DeckCard[]): ParsedList {
  const byName = new Map<string, DeckCard[]>()
  for (const c of cards) {
    const key = normalizeName(c.name)
    byName.set(key, [...(byName.get(key) ?? []), c])
  }
  const counts = new Map<string, number>()
  const unknown: string[] = []
  const battlefields: string[] = []
  let legend: string | undefined
  let section: Section = 'main'

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    let count: number
    let name: string
    let m = line.match(/^(\d+)\s*x?\s+(.+)$/i)
    if (m) {
      count = Number(m[1])
      name = m[2]
    } else if ((m = line.match(/^(.+?)\s+x\s*(\d+)$/i))) {
      name = m[1]
      count = Number(m[2])
    } else {
      section = sectionOf(line) ?? section
      continue
    }
    const options = byName.get(normalizeName(name)) ?? byName.get(normalizeName(name.replace(/\s*\(.*\)\s*$/, '')))
    if (!options) {
      unknown.push(name.trim())
      continue
    }
    const card = pick(options, section)
    if (card.type === 'legend') legend = card.name
    else if (card.type === 'battlefield') battlefields.push(card.name)
    else counts.set(card.name, (counts.get(card.name) ?? 0) + count)
  }

  return { entries: [...counts.entries()].map(([name, count]) => ({ name, count })), unknown, legend, battlefields }
}

/** Lista em texto, no mesmo formato aceito por `parseDecklist`. */
export function exportDecklist(deck: Deck, legendName?: string): string {
  const lines: string[] = []
  if (legendName) lines.push('Legend:', `1 ${legendName}`, '')
  const bfs = deck.battlefields.filter(Boolean)
  if (bfs.length) lines.push('Battlefields:', ...bfs.map((b) => `1 ${b}`), '')
  if (deck.cards.length) lines.push('Deck:', ...deck.cards.map((e) => `${e.count} ${e.name}`))
  return lines.join('\n').trim()
}

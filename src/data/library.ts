import type { Domain } from '../engine/types'

export type CardType = 'unit' | 'spell' | 'gear' | 'legend' | 'battlefield' | 'rune' | 'other'

export interface CardVariant {
  code: string
  image: string
  rarity: string | null
}

/** Carta da biblioteca (gerada por `npm run sync-cards`), uma entrada por carta, com artes alternativas. */
export interface LibraryCard {
  id: string
  name: string
  subtitle: string | null
  type: CardType
  /** champion, signature, basic, token… */
  super: string | null
  domains: Domain[]
  energy: number | null
  power: number | null
  might: number | null
  mightBonus: number | null
  tags: string[]
  set: string
  setName: string
  code: string
  rarity: string | null
  text: string
  /** Texto que vale enquanto o equipamento está anexado. */
  effect: string | null
  image: string
  orientation: 'portrait' | 'landscape'
  artist: string | null
  variants: CardVariant[]
}

export interface LibraryFilter {
  query: string
  type: CardType | 'all'
  domains: Domain[]
  set: string | 'all'
  /** Só cartas com artes alternativas. */
  withArts: boolean
}

export const EMPTY_FILTER: LibraryFilter = { query: '', type: 'all', domains: [], set: 'all', withArts: false }

let cache: Promise<LibraryCard[]> | null = null

/** Carrega a biblioteca sob demanda: o arquivo é grande e só é baixado quando a tela é aberta. */
export const loadLibrary = (): Promise<LibraryCard[]> =>
  (cache ??= import('./library.json').then((m) => m.default as LibraryCard[]))

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Aplica busca e filtros. Nomes que começam com o termo vêm antes dos que só o contêm. */
export function filterLibrary(cards: LibraryCard[], f: LibraryFilter): LibraryCard[] {
  const q = normalize(f.query.trim())
  const starts: LibraryCard[] = []
  const rest: LibraryCard[] = []
  for (const c of cards) {
    if (f.type !== 'all' && c.type !== f.type) continue
    if (f.set !== 'all' && c.set !== f.set) continue
    if (f.withArts && c.variants.length === 0) continue
    // Domínios: a carta precisa ter todos os domínios marcados.
    if (f.domains.length && !f.domains.every((d) => c.domains.includes(d))) continue
    if (!q) {
      rest.push(c)
      continue
    }
    const name = normalize(c.name)
    if (name.startsWith(q)) starts.push(c)
    else if ([name, normalize(c.text), normalize(c.effect ?? ''), ...c.tags.map(normalize), normalize(c.subtitle ?? '')].some((s) => s.includes(q)))
      rest.push(c)
  }
  return [...starts, ...rest]
}

/** Sets presentes na biblioteca, na ordem de lançamento (pelo código do primeiro aparecimento). */
export function librarySets(cards: LibraryCard[]): { id: string; name: string }[] {
  const ORDER = ['OGN', 'OGS', 'SFD', 'UNL', 'VEN', 'RAD']
  const seen = new Map<string, string>()
  for (const c of cards) if (!seen.has(c.set)) seen.set(c.set, c.setName)
  return [...seen.entries()]
    .sort((a, b) => (ORDER.indexOf(a[0]) + 1 || 99) - (ORDER.indexOf(b[0]) + 1 || 99))
    .map(([id, name]) => ({ id, name }))
}

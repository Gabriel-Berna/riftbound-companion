import type { Domain } from '../engine/types'
import battlefieldData from './battlefields.json'
import legendData from './legends.json'

/** Campos comuns às cartas da galeria oficial (geradas por `npm run sync-cards`). */
interface CardBase {
  id: string
  name: string
  set: string
  setName: string
  code: string
  text: string
  image: string
}

export type BattlefieldCard = CardBase

export interface LegendCard extends CardBase {
  champion: string
  domains: Domain[]
  /** Todas as artes da lenda: a principal primeiro, depois as alternativas. */
  arts: string[]
}

export const BATTLEFIELDS: BattlefieldCard[] = battlefieldData
export const LEGENDS = legendData as LegendCard[]

const battlefieldsByName = new Map(BATTLEFIELDS.map((b) => [b.name, b]))
const legendsByName = new Map(LEGENDS.map((l) => [l.name, l]))

/** Card oficial com esse nome, ou `undefined` se o nome foi digitado livremente. */
export const findBattlefield = (name: string): BattlefieldCard | undefined => battlefieldsByName.get(name)
export const findLegend = (name: string | undefined): LegendCard | undefined => (name ? legendsByName.get(name) : undefined)

/** Imagem da CDN da Riot redimensionada e em WebP. */
export const imageUrl = (url: string, width = 480): string => `${url}?w=${width}&fm=webp&q=75`

/** Miniatura da arte principal de uma carta. */
export const cardImage = (card: CardBase, width = 480): string => imageUrl(card.image, width)

/** Arte escolhida para a lenda, se for uma das artes dela; senão, a principal. */
export const legendImage = (legend: LegendCard, art: string | undefined, width = 480): string =>
  imageUrl(art && legend.arts.includes(art) ? art : legend.image, width)

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Busca ignorando acentos e maiúsculas. Cartas cujo nome principal começa com o termo vêm primeiro,
 * depois as que o contêm em qualquer campo pesquisável.
 */
function search<T>(list: T[], query: string, primary: (c: T) => string[], secondary: (c: T) => string[]): T[] {
  const q = normalize(query.trim())
  if (!q) return list
  const starts: T[] = []
  const contains: T[] = []
  for (const c of list) {
    const main = primary(c).map(normalize)
    if (main.some((s) => s.startsWith(q))) starts.push(c)
    else if ([...main, ...secondary(c).map(normalize)].some((s) => s.includes(q))) contains.push(c)
  }
  return [...starts, ...contains]
}

export const searchBattlefields = (query: string) =>
  search(BATTLEFIELDS, query, (b) => [b.name], (b) => [b.text])

/** Busca lendas por campeão, título, domínio ou texto. */
export const searchLegends = (query: string) =>
  search(LEGENDS, query, (l) => [l.champion, l.name], (l) => [...l.domains, l.text])

import data from './battlefields.json'

/** Battlefield da galeria oficial (gerado por `npm run sync-cards`). */
export interface BattlefieldCard {
  id: string
  name: string
  set: string
  setName: string
  code: string
  text: string
  image: string
  color: string | null
}

export const BATTLEFIELDS: BattlefieldCard[] = data

const byName = new Map(BATTLEFIELDS.map((b) => [b.name, b]))

/** Card oficial com esse nome, ou `undefined` se o nome foi digitado livremente. */
export const findBattlefield = (name: string): BattlefieldCard | undefined => byName.get(name)

/** Miniatura da arte via CDN da Riot (redimensionada e em WebP). */
export const battlefieldImage = (card: BattlefieldCard, width = 480): string =>
  `${card.image}?w=${width}&fm=webp&q=75`

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Busca por nome, ignorando acentos e maiúsculas; nomes que começam com o termo vêm primeiro. */
export function searchBattlefields(query: string): BattlefieldCard[] {
  const q = normalize(query.trim())
  if (!q) return BATTLEFIELDS
  const starts: BattlefieldCard[] = []
  const contains: BattlefieldCard[] = []
  for (const b of BATTLEFIELDS) {
    const name = normalize(b.name)
    if (name.startsWith(q)) starts.push(b)
    else if (name.includes(q) || normalize(b.text).includes(q)) contains.push(b)
  }
  return [...starts, ...contains]
}

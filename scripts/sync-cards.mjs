// Extrai battlefields e lendas da galeria oficial (playriftbound.com) para src/data/*.json.
// Uso: npm run sync-cards   (rodar de novo a cada set novo)
import { writeFile } from 'node:fs/promises'

const GALLERY_URL = 'https://playriftbound.com/en-us/card-gallery/'
const DATA_DIR = new URL('../src/data/', import.meta.url)

const html = await (await fetch(GALLERY_URL)).text()
const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)
if (!match) throw new Error('Dados da galeria não encontrados: o formato da página mudou?')

const blades = JSON.parse(match[1]).props.pageProps.page.blades
const cards = blades.find((b) => b.cards?.items)?.cards.items
if (!cards) throw new Error('Lista de cartas não encontrada na galeria.')

/** Converte o texto da carta (HTML com ícones como :rb_might:) em texto simples. */
const plainText = (html = '') =>
  html
    .replace(/<\/p>\s*<p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/:rb_might:/g, '[M]')
    .replace(/:rb_exhaust:/g, '[E]')
    .replace(/:rb_energy_(\d+):/g, '[$1]')
    .replace(/:rb_rune_rainbow:/g, '[A]')
    .replace(/:rb_rune_(\w+):/g, (_, d) => `[${d[0].toUpperCase()}${d.slice(1)}]`)
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .trim()

const isType = (c, type) => c.cardType?.type?.some((t) => t.id === type)
// Cartas token (código como UNL-T01) não podem ser escolhidas para o deck.
const isToken = (c) => /-T\d+/.test(c.publicCode)
// Artes alternativas repetem o nome; fica a primeira impressão, de raridade normal.
const isShowcase = (c) => c.rarity?.value?.id === 'showcase'

function firstPrintings(type) {
  const seen = new Set()
  return cards
    .filter((c) => isType(c, type) && !isToken(c))
    .sort((a, b) => Number(isShowcase(a)) - Number(isShowcase(b)) || a.publicCode.localeCompare(b.publicCode))
    .filter((c) => !seen.has(c.name) && seen.add(c.name))
}

const base = (c) => ({
  id: c.id,
  name: c.name,
  set: c.set.value.id,
  setName: c.set.value.label,
  code: c.publicCode,
  text: plainText(c.text?.richText?.body),
  image: c.cardImage.url.split('?')[0],
})

const battlefields = firstPrintings('battlefield')
  .map(base)
  .sort((a, b) => a.name.localeCompare(b.name))

// Unidades campeãs se chamam "Campeão, Título" (ex.: "Jinx, Rebel"); daí vêm os nomes de campeões.
const championNames = new Set(cards.filter((c) => isType(c, 'unit') && c.name.includes(',')).map((c) => c.name.split(',')[0].trim()))

/** Entre as tags da lenda (ex.: Dog, Shurima, Nasus), a do campeão é a que nomeia uma unidade campeã. */
const championOf = (c) => {
  const tags = c.tags?.tags ?? []
  return tags.find((t) => championNames.has(t)) ?? tags.at(-1) ?? c.name
}

const legends = firstPrintings('legend')
  .map((c) => ({
    ...base(c),
    champion: championOf(c),
    domains: (c.domain?.values ?? []).map((d) => d.id),
  }))
  .sort((a, b) => a.champion.localeCompare(b.champion) || a.name.localeCompare(b.name))

for (const [file, list] of [
  ['battlefields.json', battlefields],
  ['legends.json', legends],
]) {
  await writeFile(new URL(file, DATA_DIR), JSON.stringify(list, null, 2) + '\n')
  console.log(`${list.length} cartas salvas em src/data/${file}`)
}

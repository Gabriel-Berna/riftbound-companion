// Extrai os battlefields da galeria oficial (playriftbound.com) para src/data/battlefields.json.
// Uso: npm run sync-cards   (rodar de novo a cada set novo)
import { writeFile } from 'node:fs/promises'

const GALLERY_URL = 'https://playriftbound.com/en-us/card-gallery/'
const OUTPUT = new URL('../src/data/battlefields.json', import.meta.url)

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

const seen = new Set()
const battlefields = cards
  .filter((c) => c.cardType?.type?.some((t) => t.id === 'battlefield'))
  // Battlefields token (código como UNL-T01) não podem ser escolhidos para começar o jogo.
  .filter((c) => !/-T\d+/.test(c.publicCode))
  .sort((a, b) => a.publicCode.localeCompare(b.publicCode))
  // Mantém só a primeira impressão de cada nome (artes alternativas repetem o nome).
  .filter((c) => !seen.has(c.name) && seen.add(c.name))
  .map((c) => ({
    id: c.id,
    name: c.name,
    set: c.set.value.id,
    setName: c.set.value.label,
    code: c.publicCode,
    text: plainText(c.text?.richText?.body),
    image: c.cardImage.url.split('?')[0],
    color: c.cardImage.colors?.primary ?? null,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

await writeFile(OUTPUT, JSON.stringify(battlefields, null, 2) + '\n')
console.log(`${battlefields.length} battlefields salvos em src/data/battlefields.json`)

// Extrai battlefields e lendas da galeria oficial (playriftbound.com) para src/data/*.json.
// Artes promocionais (Organized Play/Nexus Night, promos, juízes), que a galeria não tem, vêm da API pública do Riftcodex.
// Uso: npm run sync-cards   (rodar de novo a cada set novo)
import { access, mkdir, writeFile } from 'node:fs/promises'

const GALLERY_URL = 'https://playriftbound.com/en-us/card-gallery/'
const RIFTCODEX_API = 'https://api.riftcodex.com'
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
/** Nome completo: unidades campeãs têm o título no subtítulo (ex.: "Jinx" + "Rebel" → "Jinx, Rebel"). */
const fullName = (c) => (c.subtitle ? `${c.name}, ${c.subtitle}` : c.name)

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

// Nomes de campeões: o nome das unidades campeãs (ex.: "Jinx" em "Jinx, Rebel").
const championNames = new Set(cards.filter((c) => c.cardType?.superType?.some((t) => t.id === 'champion')).map((c) => c.name))

/** Entre as tags da lenda (ex.: Dog, Shurima, Nasus), a do campeão é a que nomeia uma unidade campeã. */
const championOf = (c) => {
  const tags = c.tags?.tags ?? []
  return tags.find((t) => championNames.has(t)) ?? tags.at(-1) ?? c.name
}

/** Todas as artes de uma carta (a impressão principal primeiro, depois as alternativas). */
const artsOf = (name, type) =>
  cards
    .filter((c) => c.name === name && isType(c, type))
    .sort((a, b) => Number(isShowcase(a)) - Number(isShowcase(b)) || a.publicCode.localeCompare(b.publicCode))
    .map((c) => c.cardImage.url.split('?')[0])
    .filter((url, i, all) => all.indexOf(url) === i)

const legends = firstPrintings('legend')
  .map((c) => ({
    ...base(c),
    champion: championOf(c),
    domains: (c.domain?.values ?? []).map((d) => d.id),
    arts: artsOf(c.name, 'legend'),
  }))
  .sort((a, b) => a.champion.localeCompare(b.champion) || a.name.localeCompare(b.name))

const TYPES = ['unit', 'spell', 'gear', 'legend', 'battlefield', 'rune']
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'showcase', 'promo']

/** Biblioteca completa: uma entrada por nome, com as artes alternativas agrupadas. */
const byName = new Map()
for (const c of [...cards].sort((a, b) => Number(isShowcase(a)) - Number(isShowcase(b)) || a.publicCode.localeCompare(b.publicCode))) {
  const variant = { code: c.publicCode, image: c.cardImage.url.split('?')[0], rarity: c.rarity?.value?.id ?? null }
  const key = fullName(c)
  const existing = byName.get(key)
  if (existing) {
    existing.variants.push(variant)
    continue
  }
  const type = c.cardType?.type?.map((t) => t.id).find((t) => TYPES.includes(t)) ?? 'other'
  byName.set(key, {
    id: c.id,
    // Em unidades o subtítulo é o título do campeão; em feitiços e lendas, uma observação (ex.: campeão, "Starter").
    name: type === 'unit' ? key : c.name,
    subtitle: type === 'unit' ? null : (c.subtitle ?? null),
    type,
    super: c.cardType?.superType?.[0]?.id ?? null,
    domains: (c.domain?.values ?? []).map((d) => d.id).filter((d) => d !== 'colorless'),
    energy: c.energy?.value?.id ?? null,
    power: c.power?.value?.id ?? null,
    might: c.might?.value?.id ?? null,
    mightBonus: c.mightBonus?.value?.id ?? null,
    tags: c.tags?.tags ?? [],
    set: c.set.value.id,
    setName: c.set.value.label,
    code: c.publicCode,
    rarity: c.rarity?.value?.id ?? null,
    text: plainText(c.text?.richText?.body),
    // Equipamentos têm um texto extra que só vale enquanto estão anexados.
    effect: plainText(c.effect?.richText?.body) || null,
    image: variant.image,
    orientation: c.orientation,
    artist: c.illustrator?.values?.map((v) => v.label).join(', ') || null,
    variants: [variant],
  })
}
await addPromoArts()

const library = [...byName.values()]
  .map((c) => ({ ...c, variants: c.variants.length > 1 ? c.variants : [] }))
  .sort((a, b) => a.name.localeCompare(b.name))
for (const c of library) c.variants.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))

for (const [file, list] of [
  ['battlefields.json', battlefields],
  ['legends.json', legends],
  ['library.json', library],
]) {
  await writeFile(new URL(file, DATA_DIR), JSON.stringify(list, null, 2) + '\n')
  console.log(`${list.length} cartas salvas em src/data/${file}`)
}

// Cópia local das artes das lendas (mesmo domínio do app): a CDN da Riot não envia cabeçalhos CORS,
// e o navegador só exporta imagens geradas em canvas (ex.: compartilhar resultado) com imagens do próprio app.
const ART_DIR = new URL('../public/art/legends/', import.meta.url)
await mkdir(ART_DIR, { recursive: true })
let downloaded = 0
for (const url of legends.flatMap((l) => l.arts)) {
  const file = new URL(localArtName(url), ART_DIR)
  try {
    await access(file)
    continue
  } catch {
    // Ainda não baixada.
  }
  const res = await fetch(`${url}?w=540&fm=webp&q=70`)
  if (!res.ok) throw new Error(`Falha ao baixar ${url}: ${res.status}`)
  await writeFile(file, Buffer.from(await res.arrayBuffer()))
  downloaded += 1
}
console.log(`${downloaded} artes de lenda baixadas para public/art/legends/`)

/**
 * Junta as artes promocionais do Riftcodex às cartas da galeria, pelo nome.
 * Muitas promos ainda apontam para a arte normal: só entram imagens que a carta não tem.
 * Se a API falhar, a sincronização segue só com a galeria.
 */
async function addPromoArts() {
  try {
    const get = async (path) => {
      const res = await fetch(`${RIFTCODEX_API}${path}`, { signal: AbortSignal.timeout(60_000) })
      if (!res.ok) throw new Error(`${path}: ${res.status}`)
      return res.json()
    }
    const sets = (await get('/sets')).items.filter((s) => /promotional/i.test(s.name))
    const promos = []
    for (const set of sets)
      for (let page = 1; ; page++) {
        const { items } = await get(`/cards?set_id=${set.set_id}&size=100&page=${page}`)
        promos.push(...items)
        if (items.length < 100) break
      }
    let added = 0
    for (const p of promos) {
      // "Ahri - Nine-Tailed Fox (Metal)": lendas usam só o título; unidades, "Campeão, Título".
      const name = p.name.replace(/\s*\([^)]*\)$/, '')
      const type = p.classification.type.toLowerCase()
      const [champion, title] = name.split(' - ')
      const key = !title ? name : type === 'legend' ? title : `${champion}, ${title}`
      const card = [...byName.values()].find((c) => c.name === key && c.type === type)
      const image = p.media.image_url.split('?')[0]
      if (!card || card.image === image || card.variants.some((v) => v.image === image)) continue
      card.variants.push({ code: p.riftbound_id.toUpperCase(), image, rarity: 'promo' })
      if (type === 'legend') legends.find((l) => l.name === key)?.arts.push(image)
      added += 1
    }
    console.log(`${added} artes promocionais adicionadas (Riftcodex, ${promos.length} promos)`)
  } catch (e) {
    console.warn(`Artes promocionais ignoradas: ${e.message}`)
  }
}

/** Nome do arquivo local de uma arte: o identificador da imagem na CDN. */
function localArtName(url) {
  return `${url.split('/').pop().split('-')[0]}.webp`
}

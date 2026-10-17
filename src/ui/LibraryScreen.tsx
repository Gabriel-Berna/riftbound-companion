import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { keywordInfo } from '../data/keywords'
import { EMPTY_FILTER, filterLibrary, librarySets, loadLibrary, type CardType, type LibraryCard, type LibraryFilter } from '../data/library'
import { DOMAINS, type Domain } from '../engine/types'
import { DomainIcons } from './cards'
import { Brand, Sheet } from './common'
import { DOMAIN_COLORS, POWER_LABELS } from './text'

const TYPE_LABELS: Record<CardType, string> = {
  unit: 'Unidade',
  spell: 'Feitiço',
  gear: 'Equipamento',
  legend: 'Lenda',
  battlefield: 'Battlefield',
  rune: 'Runa',
  other: 'Outra',
}

const TYPE_FILTERS: [CardType | 'all', string][] = [
  ['all', 'Todas'],
  ['unit', 'Unidades'],
  ['spell', 'Feitiços'],
  ['gear', 'Equipamentos'],
  ['legend', 'Lendas'],
  ['battlefield', 'Battlefields'],
  ['rune', 'Runas'],
]

const SUPER_LABELS: Record<string, string> = { champion: 'campeã', signature: 'assinatura', token: 'token', basic: 'básica' }

const RARITY_LABELS: Record<string, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Rara',
  epic: 'Épica',
  showcase: 'Showcase',
  promo: 'Promo',
}

const PAGE = 60

const image = (url: string, width: number) => `${url}?w=${width}&fm=webp&q=75`

/** Desenha os símbolos do texto da carta: custos, Might, exaurir e palavras-chave. */
export function CardText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]$/)
        if (!m) return <Fragment key={i}>{part}</Fragment>
        const token = m[1]
        if (/^\d+$/.test(token)) return <span key={i} className="sym energy" title={`${token} Energy`}>{token}</span>
        const domain = token.toLowerCase() as Domain
        if (DOMAINS.includes(domain))
          return <i key={i} className="sym power" style={{ background: DOMAIN_COLORS[domain] }} title={`Power de ${token}`} />
        if (token === 'A') return <i key={i} className="sym power" style={{ background: DOMAIN_COLORS.universal }} title="Power de qualquer domínio" />
        if (token === 'E' || token === 'T') return <span key={i} className="sym exhaust" title="Exaurir">⟳</span>
        if (token === 'M' || token === 'S') return <span key={i} className="sym might" title="Might">⚔</span>
        if (token === '>' || token === '&gt;') return <span key={i} className="sym arrow">▸</span>
        return <span key={i} className="kw">{token}</span>
      })}
    </>
  )
}

/** Palavras-chave da carta que têm explicação no glossário. */
function cardKeywords(card: LibraryCard) {
  const found = new Map<string, string>()
  for (const [, token] of `${card.text} ${card.effect ?? ''}`.matchAll(/\[([^\]]+)\]/g)) {
    const info = keywordInfo(token)
    if (info) found.set(info.name, info.text)
  }
  return [...found.entries()]
}

function typeLine(card: LibraryCard): ReactNode {
  const parts = [TYPE_LABELS[card.type] + (card.super && SUPER_LABELS[card.super] ? ` ${SUPER_LABELS[card.super]}` : '')]
  if (card.tags.length) parts.push(card.tags.join(', '))
  return parts.join(' · ')
}

function CardDetail({ card, onClose }: { card: LibraryCard; onClose: () => void }) {
  const [art, setArt] = useState(card.image)
  const keywords = cardKeywords(card)
  const landscape = card.orientation === 'landscape'

  return (
    <Sheet title={card.name} onClose={onClose}>
      <img className={`card-big ${landscape ? 'landscape' : ''}`} src={image(art, landscape ? 900 : 700)} alt={card.name} />
      {card.variants.length > 0 && <h3 className="variants-title">Artes · {card.variants.length}</h3>}
      {card.variants.length > 0 && (
        <div className="variants" aria-label="Artes">
          {card.variants.map((v) => (
            <button key={v.code} className={`variant ${v.image === art ? 'on' : ''}`} onClick={() => setArt(v.image)} aria-label={`Arte ${v.code}`}>
              <img src={image(v.image, 220)} alt="" loading="lazy" />
              <small>{v.rarity ? RARITY_LABELS[v.rarity] ?? v.rarity : v.code}</small>
            </button>
          ))}
        </div>
      )}

      <div className="card-meta">
        <span className="card-type">
          {card.domains.length > 0 && <DomainIcons domains={card.domains} />} {typeLine(card)}
        </span>
        {card.subtitle && <span className="hint">{card.subtitle}</span>}
        <div className="card-stats">
          {card.energy !== null && (
            <span className="stat-pill">
              <span className="sym energy">{card.energy}</span> Energy
            </span>
          )}
          {card.power !== null && card.power > 0 && (
            <span className="stat-pill">
              {Array.from({ length: card.power }, (_, i) => (
                <i key={i} className="sym power" style={{ background: DOMAIN_COLORS[card.domains[0] ?? 'universal'] }} />
              ))}{' '}
              Power{card.domains[0] ? ` de ${POWER_LABELS[card.domains[0]]}` : ''}
            </span>
          )}
          {/* Em equipamentos, o Might é o bônus dado à unidade (mostrado abaixo). */}
          {card.might !== null && card.mightBonus === null && (
            <span className="stat-pill">
              <span className="sym might">⚔</span> {card.might} Might
            </span>
          )}
          {card.mightBonus !== null && <span className="stat-pill">+{card.mightBonus} Might ao anexar</span>}
        </div>
      </div>

      {card.text && (
        <p className="card-text">
          <CardText text={card.text} />
        </p>
      )}
      {card.effect && (
        <div className="card-effect">
          <h3>Enquanto anexado</h3>
          <p className="card-text">
            <CardText text={card.effect} />
          </p>
        </div>
      )}

      {keywords.length > 0 && (
        <div className="keywords">
          <h3>Palavras-chave</h3>
          {keywords.map(([name, text]) => (
            <p key={name}>
              <span className="kw">{name}</span> {text}
            </p>
          ))}
        </div>
      )}

      <p className="hint">
        {card.setName} · {card.code}
        {card.rarity && ` · ${RARITY_LABELS[card.rarity] ?? card.rarity}`}
        {card.artist && ` · Arte: ${card.artist}`}
      </p>
    </Sheet>
  )
}

/** Biblioteca de cartas: busca, filtros e detalhes. Abre como tela ou por cima da partida. */
export function LibraryScreen(props: { onClose: () => void; overlay?: boolean }) {
  const [cards, setCards] = useState<LibraryCard[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<LibraryFilter>(EMPTY_FILTER)
  const [limit, setLimit] = useState(PAGE)
  const [selected, setSelected] = useState<LibraryCard | null>(null)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadLibrary().then(setCards, () => setFailed(true))
  }, [])

  const results = useMemo(() => (cards ? filterLibrary(cards, filter) : []), [cards, filter])
  const sets = useMemo(() => (cards ? librarySets(cards) : []), [cards])

  // Mais cartas aparecem conforme a lista chega ao fim.
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && setLimit((l) => l + PAGE), { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [results])

  const update = (patch: Partial<LibraryFilter>) => {
    setFilter((f) => ({ ...f, ...patch }))
    setLimit(PAGE)
  }

  const toggleDomain = (d: Domain) =>
    update({ domains: filter.domains.includes(d) ? filter.domains.filter((x) => x !== d) : [...filter.domains, d] })

  return (
    <div className={props.overlay ? 'library-overlay' : undefined}>
      <main className="screen setup library">
        <button className="link back" onClick={props.onClose}>
          {props.overlay ? '✕ Fechar' : '← Voltar'}
        </button>
        <Brand title="Cartas" subtitle={cards ? `${results.length} de ${cards.length} cartas` : failed ? 'Não foi possível carregar' : 'Carregando…'} />

        <div className="library-filters">
          <input
            className="search"
            type="search"
            placeholder="Buscar por nome, texto ou tag…"
            value={filter.query}
            onChange={(e) => update({ query: e.target.value })}
            aria-label="Buscar carta"
          />
          <div className="chips scroll">
            <button className={`chip ${filter.withArts ? 'on' : ''}`} onClick={() => update({ withArts: !filter.withArts })} aria-pressed={filter.withArts}>
              🎨 Artes alternativas
            </button>
            {TYPE_FILTERS.map(([type, label]) => (
              <button key={type} className={`chip ${filter.type === type ? 'on' : ''}`} onClick={() => update({ type })}>
                {label}
              </button>
            ))}
          </div>
          <div className="filter-row">
            <div className="domain-toggles" role="group" aria-label="Domínios">
              {DOMAINS.map((d) => (
                <button
                  key={d}
                  className={`domain-toggle ${filter.domains.includes(d) ? 'on' : ''}`}
                  style={{ '--dc': DOMAIN_COLORS[d] } as CSSProperties}
                  onClick={() => toggleDomain(d)}
                  aria-pressed={filter.domains.includes(d)}
                  aria-label={POWER_LABELS[d]}
                  title={POWER_LABELS[d]}
                >
                  <i />
                </button>
              ))}
            </div>
            <select className="set-select" value={filter.set} onChange={(e) => update({ set: e.target.value })} aria-label="Set">
              <option value="all">Todos os sets</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {failed && <p className="hint">Abra a biblioteca uma vez com internet para guardá-la no aparelho.</p>}

        <div className="card-grid">
          {results.slice(0, limit).map((c) => (
            <button key={c.id + c.name} className={`card-thumb ${c.orientation}`} onClick={() => setSelected(c)} aria-label={c.name}>
              <img src={image(c.image, c.orientation === 'landscape' ? 480 : 300)} alt="" loading="lazy" />
              {c.variants.length > 1 && <span className="art-count">🎨 {c.variants.length}</span>}
            </button>
          ))}
        </div>
        {cards && results.length === 0 && <p className="hint text-center">Nenhuma carta encontrada.</p>}
        <div ref={sentinel} />
      </main>
      {selected && <CardDetail card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

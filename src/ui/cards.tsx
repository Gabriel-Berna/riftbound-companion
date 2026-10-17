import { useMemo, useState, type ReactNode } from 'react'
import { cardImage, findBattlefield, findLegend, imageUrl, legendImage, searchBattlefields, searchLegends, type LegendCard } from '../data/cards'
import type { Domain } from '../engine/types'
import { Sheet } from './common'
import { DOMAIN_COLORS, POWER_LABELS } from './text'

/** Fundo com a arte de uma carta do banco de dados, se houver. */
const art = (image: string | undefined) => (image ? { backgroundImage: `url("${image}")` } : undefined)

export const battlefieldArt = (name: string, width = 480) => {
  const card = findBattlefield(name)
  return art(card && cardImage(card, width))
}

export const legendArt = (name: string | undefined, width = 480, chosenArt?: string) => {
  const card = findLegend(name)
  return art(card && legendImage(card, chosenArt, width))
}

/** Escolha entre as artes de uma lenda (principal e alternativas). */
export function ArtPicker(props: { legend: LegendCard; current?: string; onPick: (art: string) => void; onClose: () => void }) {
  const current = props.current && props.legend.arts.includes(props.current) ? props.current : props.legend.image
  return (
    <Sheet title={`Artes de ${props.legend.champion}`} onClose={props.onClose}>
      <div className="art-grid">
        {props.legend.arts.map((url, i) => (
          <button key={url} className={`art-option ${url === current ? 'on' : ''}`} onClick={() => props.onPick(url)}>
            <img src={imageUrl(url, 360)} alt="" loading="lazy" />
            <small>{i === 0 ? 'Principal' : `Alternativa ${i}`}</small>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

export function DomainIcons({ domains }: { domains: Domain[] }) {
  return (
    <span className="domains">
      {domains.map((d) => (
        <i key={d} className="dot" style={{ background: DOMAIN_COLORS[d] }} title={POWER_LABELS[d]} />
      ))}
    </span>
  )
}

/** Botão com a arte do battlefield ao fundo. */
export function BattlefieldTile(props: { name: string; selected?: boolean; player?: 0 | 1; onClick?: () => void; children?: ReactNode }) {
  const card = findBattlefield(props.name)
  return (
    <button
      className={`bf-tile ${card ? 'has-art' : ''} ${props.selected ? `selected p${props.player ?? 0}` : ''}`}
      style={battlefieldArt(props.name)}
      onClick={props.onClick}
    >
      <span className="bf-tile-name">{props.name}</span>
      {card && <span className="bf-tile-set">{card.setName}</span>}
      {props.children}
    </button>
  )
}

/** Botão com a arte da lenda ao fundo. */
export function LegendTile(props: { legend: LegendCard; art?: string; onClick?: () => void; children?: ReactNode }) {
  const { legend } = props
  return (
    <button className="bf-tile legend-tile has-art" style={legendArt(legend.name, 480, props.art)} onClick={props.onClick}>
      <span className="bf-tile-name">{legend.champion}</span>
      <span className="bf-tile-set">
        <DomainIcons domains={legend.domains} /> {legend.name}
      </span>
      {props.children}
    </button>
  )
}

interface PickerOption {
  key: string
  value: string
  title: string
  subtitle: ReactNode
  text: string
  image: string
  legend?: boolean
}

function CardPicker(props: {
  title: string
  placeholder: string
  options: (query: string) => PickerOption[]
  allowCustom: boolean
  onPick: (value: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const { options } = props
  const results = useMemo(() => options(query), [options, query])
  const typed = query.trim()
  const exact = results.some((o) => o.value.toLowerCase() === typed.toLowerCase())

  return (
    <Sheet title={props.title} onClose={props.onClose}>
      <input
        className="search"
        type="search"
        autoFocus
        placeholder={props.placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={props.placeholder}
      />
      <div className="picker-list">
        {results.map((o) => (
          <button key={o.key} className={`picker-item has-art ${o.legend ? 'legend-tile' : ''}`} style={art(o.image)} onClick={() => props.onPick(o.value)}>
            <span className="bf-tile-name">{o.title}</span>
            <span className="bf-tile-set">{o.subtitle}</span>
            <span className="picker-text">{o.text}</span>
          </button>
        ))}
        {props.allowCustom && typed && !exact && (
          <button className="picker-item custom" onClick={() => props.onPick(typed)}>
            <span className="bf-tile-name">Usar “{typed}”</span>
            <span className="bf-tile-set">Nome livre, sem carta do banco de dados</span>
          </button>
        )}
        {results.length === 0 && !props.allowCustom && <p className="hint">Nenhuma carta encontrada.</p>}
      </div>
    </Sheet>
  )
}

/** Busca de battlefields no banco de cartas, com opção de nome livre. */
export function BattlefieldPicker(props: { exclude: string[]; onPick: (name: string) => void; onClose: () => void }) {
  const { exclude } = props
  const options = useMemo(
    () => (query: string) =>
      searchBattlefields(query)
        .filter((b) => !exclude.includes(b.name))
        .map((b) => ({ key: b.id, value: b.name, title: b.name, subtitle: `${b.setName} · ${b.code}`, text: b.text, image: cardImage(b) })),
    [exclude],
  )
  return <CardPicker title="Escolher battlefield" placeholder="Buscar pelo nome…" options={options} allowCustom onPick={props.onPick} onClose={props.onClose} />
}

/** Busca de lendas por campeão, título ou domínio. */
export function LegendPicker(props: { onPick: (name: string) => void; onClose: () => void }) {
  const options = useMemo(
    () => (query: string) =>
      searchLegends(query).map((l) => ({
        key: l.id,
        value: l.name,
        title: l.champion,
        subtitle: (
          <>
            <DomainIcons domains={l.domains} /> {l.name} · {l.setName}
          </>
        ),
        text: l.text,
        image: cardImage(l),
        legend: true,
      })),
    [],
  )
  return (
    <CardPicker
      title="Escolher lenda"
      placeholder="Buscar por campeão, título ou domínio…"
      options={options}
      allowCustom={false}
      onPick={props.onPick}
      onClose={props.onClose}
    />
  )
}

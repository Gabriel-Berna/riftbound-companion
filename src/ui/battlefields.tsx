import { useMemo, useState, type ReactNode } from 'react'
import { battlefieldImage, findBattlefield, searchBattlefields } from '../data/battlefields'
import { Sheet } from './common'

/** Fundo com a arte do battlefield, quando ele está no banco de cartas. */
export function artStyle(name: string, width = 480) {
  const card = findBattlefield(name)
  return card ? { backgroundImage: `url("${battlefieldImage(card, width)}")` } : undefined
}

/** Botão com a arte do battlefield ao fundo. */
export function BattlefieldTile(props: {
  name: string
  selected?: boolean
  player?: 0 | 1
  onClick?: () => void
  children?: ReactNode
}) {
  const card = findBattlefield(props.name)
  return (
    <button
      className={`bf-tile ${card ? 'has-art' : ''} ${props.selected ? `selected p${props.player ?? 0}` : ''}`}
      style={artStyle(props.name)}
      onClick={props.onClick}
    >
      <span className="bf-tile-name">{props.name}</span>
      {card && <span className="bf-tile-set">{card.setName}</span>}
      {props.children}
    </button>
  )
}

/** Busca de battlefields no banco de cartas, com opção de nome livre. */
export function BattlefieldPicker(props: { exclude: string[]; onPick: (name: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchBattlefields(query).filter((b) => !props.exclude.includes(b.name)), [query, props.exclude])
  const typed = query.trim()
  const exact = results.some((b) => b.name.toLowerCase() === typed.toLowerCase())

  return (
    <Sheet title="Escolher battlefield" onClose={props.onClose}>
      <input
        className="search"
        type="search"
        autoFocus
        placeholder="Buscar pelo nome…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar battlefield"
      />
      <div className="picker-list">
        {results.map((b) => (
          <button key={b.id} className="picker-item has-art" style={artStyle(b.name)} onClick={() => props.onPick(b.name)}>
            <span className="bf-tile-name">{b.name}</span>
            <span className="bf-tile-set">
              {b.setName} · {b.code}
            </span>
            <span className="picker-text">{b.text}</span>
          </button>
        ))}
        {typed && !exact && (
          <button className="picker-item custom" onClick={() => props.onPick(typed)}>
            <span className="bf-tile-name">Usar “{typed}”</span>
            <span className="bf-tile-set">Nome livre, sem carta do banco de dados</span>
          </button>
        )}
        {!typed && results.length === 0 && <p className="hint">Nenhum battlefield disponível.</p>}
      </div>
    </Sheet>
  )
}

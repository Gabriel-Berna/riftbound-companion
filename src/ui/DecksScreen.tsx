import { useEffect, useMemo, useState } from 'react'
import { findLegend, imageUrl, legendImage, type LegendCard } from '../data/cards'
import { EMPTY_FILTER, filterLibrary, loadLibrary, type LibraryCard } from '../data/library'
import { exportDecklist, parseDecklist, validateDeck, type Deck, type DeckEntry } from '../engine/deck'
import { newId, type AppAction } from '../store'
import { ArtPicker, BattlefieldPicker, BattlefieldTile, DomainIcons, LegendPicker, LegendTile } from './cards'
import { autoFocusSearch, Brand, Sheet } from './common'
import { CardText } from './LibraryScreen'

const GROUPS: [string, (c: LibraryCard | undefined) => boolean][] = [
  ['Campeões', (c) => c?.type === 'unit' && c.super === 'champion'],
  ['Unidades', (c) => c?.type === 'unit' && c.super !== 'champion'],
  ['Feitiços', (c) => c?.type === 'spell'],
  ['Equipamentos', (c) => c?.type === 'gear'],
  ['Runas', (c) => c?.type === 'rune'],
  ['Outras', (c) => !c || !['unit', 'spell', 'gear', 'rune'].includes(c.type)],
]

const legendLabel = (l: LegendCard) => `${l.champion} (${l.name})`

export const newDeck = (): Deck => ({ id: newId(), name: '', battlefields: ['', '', ''], cards: [], updatedAt: new Date().toISOString() })

/** Biblioteca carregada sob demanda, com busca por nome. */
function useLibrary() {
  const [cards, setCards] = useState<LibraryCard[] | null>(null)
  useEffect(() => {
    loadLibrary().then(setCards, () => setCards([]))
  }, [])
  const byName = useMemo(() => new Map((cards ?? []).map((c) => [c.name, c])), [cards])
  return { cards, byName }
}

function legendInfo(deck: Deck) {
  const legend = findLegend(deck.legend)
  return legend ? { champion: legend.champion, domains: legend.domains } : undefined
}

/** Lista de decks salvos. */
export function DecksScreen(props: { decks: Deck[]; onOpen: (deck: Deck, paste?: boolean) => void; onBack: () => void }) {
  const { byName } = useLibrary()
  return (
    <main className="screen setup">
      <button className="link back" onClick={props.onBack}>
        ← Início
      </button>
      <Brand title="Meus decks" subtitle={props.decks.length ? `${props.decks.length} deck${props.decks.length > 1 ? 's' : ''}` : 'Nenhum deck salvo'} />
      {props.decks.length === 0 && (
        <section className="card">
          <p>Salve seus decks com lenda, battlefields e lista de cartas. Na hora de jogar, é só escolher o deck.</p>
          <p className="hint">Dá para colar a lista exportada de um site de decks ou montar carta por carta.</p>
        </section>
      )}
      <div className="deck-list">
        {props.decks.map((d) => {
          const legend = findLegend(d.legend)
          const report = byName.size ? validateDeck(d, legendInfo(d), (n) => byName.get(n)) : null
          return (
            <button
              key={d.id}
              className="deck-item"
              style={legend ? { backgroundImage: `url("${legendImage(legend, d.legendArt, 600)}")` } : undefined}
              onClick={() => props.onOpen(d)}
            >
              <span className="deck-name">{d.name || 'Deck sem nome'}</span>
              <span className="deck-sub">
                {legend ? (
                  <>
                    <DomainIcons domains={legend.domains} /> {legend.champion}
                  </>
                ) : (
                  'Sem lenda'
                )}
                {report && ` · ${report.mainCount}/40 cartas`}
              </span>
              {report && <span className={`deck-badge ${report.valid ? 'ok' : 'pending'}`}>{report.valid ? '✓ Pronto' : 'Incompleto'}</span>}
            </button>
          )
        })}
      </div>
      <button className="primary big" onClick={() => props.onOpen(newDeck(), true)}>
        Importar lista
      </button>
      <button className="secondary" onClick={() => props.onOpen(newDeck())}>
        + Montar deck carta por carta
      </button>
    </main>
  )
}

/** Busca de cartas para adicionar ao deck; com lenda, mostra só os domínios dela. */
function AddCardSheet(props: {
  cards: LibraryCard[]
  deck: Deck
  onAdd: (name: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const legend = findLegend(props.deck.legend)
  const results = useMemo(
    () =>
      filterLibrary(props.cards, { ...EMPTY_FILTER, query })
        .filter((c) => ['unit', 'spell', 'gear', 'rune', 'other'].includes(c.type) && c.super !== 'token')
        .filter((c) => !legend || c.domains.every((d) => legend.domains.includes(d)))
        .slice(0, 50),
    [props.cards, query, legend],
  )
  const countOf = (name: string) => props.deck.cards.find((e) => e.name === name)?.count ?? 0
  return (
    <Sheet title="Adicionar carta" onClose={props.onClose}>
      <input
        className="search"
        type="search"
        autoFocus={autoFocusSearch}
        enterKeyHint="search"
        placeholder="Buscar por nome, texto ou tag…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label="Buscar carta"
      />
      {legend && <p className="hint">Mostrando só cartas dos domínios de {legend.champion}.</p>}
      <div className="add-list">
        {results.map((c) => (
          <button key={c.id + c.name} className="add-row" onClick={() => props.onAdd(c.name)}>
            <img src={imageUrl(c.image, 120)} alt="" loading="lazy" />
            <span className="add-main">
              <b>{c.name}</b>
              <small>
                {c.domains.length > 0 && <DomainIcons domains={c.domains} />} {c.energy !== null ? `${c.energy} Energy · ` : ''}
                <CardText text={c.text.split('\n')[0].slice(0, 70)} />
              </small>
            </span>
            {countOf(c.name) > 0 && <span className="add-count">×{countOf(c.name)}</span>}
            <span className="add-plus">+</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/** Edição de um deck: nome, lenda, battlefields e lista de cartas com validação. */
export function DeckEditor(props: { deck: Deck; saved: boolean; startWithPaste?: boolean; dispatch: (a: AppAction) => void; onClose: () => void }) {
  const [deck, setDeck] = useState<Deck>(props.deck)
  const [dirty, setDirty] = useState(false)
  const [sheet, setSheet] = useState<'legend' | 'art' | 'add' | 'paste' | { bf: number } | null>(props.startWithPaste ? 'paste' : null)
  const [pasteText, setPasteText] = useState('')
  const [pasteResult, setPasteResult] = useState<string | null>(null)
  const [imported, setImported] = useState<string | null>(null)
  const { cards, byName } = useLibrary()
  const legend = findLegend(deck.legend)

  const change = (patch: Partial<Deck>) => {
    setDeck((d) => ({ ...d, ...patch }))
    setDirty(true)
  }
  const withCount = (list: DeckEntry[], name: string, count: number) =>
    count <= 0 ? list.filter((e) => e.name !== name) : list.some((e) => e.name === name) ? list.map((e) => (e.name === name ? { ...e, count } : e)) : [...list, { name, count }]
  const setCount = (name: string, count: number) => change({ cards: withCount(deck.cards, name, count) })
  const setSideCount = (name: string, count: number) => change({ sideboard: withCount(deck.sideboard ?? [], name, count) })

  const report = useMemo(() => (cards ? validateDeck(deck, legendInfo(deck), (n) => byName.get(n)) : null), [cards, deck, byName])

  const save = () => {
    props.dispatch({ type: 'saveDeck', deck: { ...deck, name: deck.name.trim() || (legend ? `Deck de ${legend.champion}` : 'Meu deck'), updatedAt: new Date().toISOString() } })
    setDirty(false)
    props.onClose()
  }

  const back = () => {
    if (!dirty || confirm('Sair sem salvar as alterações?')) props.onClose()
  }

  const importList = () => {
    if (!cards) return
    const parsed = parseDecklist(pasteText, cards)
    if (!parsed.entries.length && !parsed.sideboard.length && !parsed.legend && !parsed.battlefields.length) {
      setPasteResult('Nenhuma carta reconhecida. Use uma linha por carta, como "3 Jinx, Rebel".')
      return
    }
    const bfs = parsed.battlefields.slice(0, 3)
    // A lista manda: se trouxer outra lenda, ela substitui a escolhida (e a arte volta à padrão).
    const newLegend = parsed.legend && parsed.legend !== deck.legend ? findLegend(parsed.legend) : undefined
    const hasCards = parsed.entries.length > 0 || parsed.sideboard.length > 0
    change({
      cards: hasCards ? parsed.entries : deck.cards,
      sideboard: hasCards ? parsed.sideboard : deck.sideboard,
      ...(newLegend && { legend: parsed.legend, legendArt: undefined }),
      ...(bfs.length && { battlefields: [bfs[0] ?? '', bfs[1] ?? '', bfs[2] ?? ''] as Deck['battlefields'] }),
    })
    const total = (list: DeckEntry[]) => list.reduce((n, e) => n + e.count, 0)
    const notes = [
      newLegend && legend && `Lenda trocada para ${legendLabel(newLegend)}, que veio na lista.`,
      parsed.unknown.length && `Não reconhecidas: ${parsed.unknown.join(', ')}.`,
    ].filter(Boolean)
    setPasteResult(notes.join(' ') || null)
    if (!parsed.unknown.length) setSheet(null)
    const runes = total(parsed.entries.filter((e) => byName.get(e.name)?.type === 'rune'))
    const parts = [`${total(parsed.entries) - runes} cartas`, runes && `${runes} runas`, parsed.sideboard.length && `${total(parsed.sideboard)} no sideboard`].filter(Boolean)
    setImported(`Importado: ${parts.join(', ')}.${notes.length ? ' ' + notes.join(' ') : ''}`)
  }

  const copyList = async () => {
    const text = exportDecklist(deck, legend?.name)
    try {
      await navigator.clipboard.writeText(text)
      alert('Lista copiada.')
    } catch {
      prompt('Copie a lista:', text)
    }
  }

  type Group = [string, DeckEntry[], (name: string, count: number) => void]
  const grouped = [
    ...GROUPS.map(([title, test]): Group => [title, deck.cards.filter((e) => test(byName.get(e.name))), setCount]),
    ['Sideboard', deck.sideboard ?? [], setSideCount] as Group,
  ].filter(([, list]) => list.length)

  return (
    <main className="screen setup deck-editor">
      <button className="link back" onClick={back}>
        ← Meus decks
      </button>
      <input className="deck-title" value={deck.name} placeholder={legend ? `Deck de ${legend.champion}` : 'Nome do deck'} onChange={(e) => change({ name: e.target.value })} aria-label="Nome do deck" />

      <section className="card">
        <h2>Lenda</h2>
        {legend ? (
          <>
            <LegendTile legend={legend} art={deck.legendArt} onClick={() => setSheet('legend')} />
            {legend.arts.length > 1 && (
              <button className="art-btn" onClick={() => setSheet('art')}>
                🎨 Arte · {legend.arts.length}
              </button>
            )}
          </>
        ) : (
          <button className="bf-slot-empty" onClick={() => setSheet('legend')}>
            + Escolher lenda
          </button>
        )}
      </section>

      <section className="card">
        <h2>Battlefields</h2>
        <div className="bf-slots">
          {deck.battlefields.map((bf, i) =>
            bf ? (
              <BattlefieldTile key={i} name={bf} onClick={() => setSheet({ bf: i })} />
            ) : (
              <button key={i} className="bf-slot-empty" onClick={() => setSheet({ bf: i })}>
                + Battlefield {i + 1}
              </button>
            ),
          )}
        </div>
      </section>

      <section className="card">
        <h2>Cartas</h2>
        {report ? (
          <div className="deck-summary">
            <span className={report.mainCount === 40 ? 'ok' : ''}>Main Deck {report.mainCount}/40</span>
            <span className={report.runeCount === 12 ? 'ok' : ''}>Runas {report.runeCount}/12</span>
            <span className={report.battlefieldCount === 3 ? 'ok' : ''}>Battlefields {report.battlefieldCount}/3</span>
            {report.sideboardCount > 0 && <span className={report.sideboardCount <= 10 ? 'ok' : ''}>Sideboard {report.sideboardCount}/10</span>}
          </div>
        ) : (
          <p className="hint">Carregando a biblioteca…</p>
        )}
        {imported && <p className="deck-imported">{imported}</p>}
        {report && report.issues.length > 0 && (
          <ul className="deck-issues">
            {report.issues.map((i, k) => (
              <li key={k} className={i.level}>
                {i.text}
              </li>
            ))}
          </ul>
        )}
        {report?.valid && <p className="deck-valid">✓ Deck pronto para torneio</p>}

        <div className="row-buttons">
          <button className="secondary" onClick={() => setSheet('add')} disabled={!cards}>
            + Adicionar carta
          </button>
          <button className="secondary" onClick={() => setSheet('paste')} disabled={!cards}>
            Colar lista
          </button>
        </div>

        {grouped.map(([title, list, set]) => (
          <div key={title} className={`deck-group ${title === 'Sideboard' ? 'sideboard' : ''}`}>
            <h3>
              {title} · {list.reduce((n, e) => n + e.count, 0)}
            </h3>
            {list.map((e) => {
              const c = byName.get(e.name)
              return (
                <div key={e.name} className="deck-row">
                  {c && <img src={imageUrl(c.image, 120)} alt="" loading="lazy" />}
                  <span className="deck-row-name">{e.name}</span>
                  <button className="step-btn" onClick={() => set(e.name, e.count - 1)} aria-label={`Tirar uma cópia de ${e.name}${title === 'Sideboard' ? ' do sideboard' : ''}`}>
                    −
                  </button>
                  <b className="deck-row-count">{e.count}</b>
                  <button className="step-btn" onClick={() => set(e.name, e.count + 1)} aria-label={`Adicionar uma cópia de ${e.name}${title === 'Sideboard' ? ' ao sideboard' : ''}`}>
                    +
                  </button>
                </div>
              )
            })}
          </div>
        ))}
        {deck.cards.length > 0 && (
          <button className="link" onClick={copyList}>
            Copiar lista
          </button>
        )}
      </section>

      <button className="primary big start-match" onClick={save}>
        Salvar deck
      </button>
      {props.saved && (
        <button
          className="link danger-link"
          onClick={() => {
            if (confirm(`Apagar o deck "${props.deck.name}"?`)) {
              props.dispatch({ type: 'deleteDeck', id: props.deck.id })
              props.onClose()
            }
          }}
        >
          Apagar deck
        </button>
      )}

      {sheet === 'legend' && (
        <LegendPicker
          onPick={(l) => {
            change({ legend: l, legendArt: undefined })
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'art' && legend && (
        <ArtPicker
          legend={legend}
          current={deck.legendArt}
          onPick={(legendArt) => {
            change({ legendArt })
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {typeof sheet === 'object' && sheet !== null && (
        <BattlefieldPicker
          exclude={deck.battlefields.filter((b, i) => b && i !== sheet.bf)}
          onPick={(name) => {
            const battlefields = [...deck.battlefields] as Deck['battlefields']
            battlefields[sheet.bf] = name
            change({ battlefields })
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'add' && cards && (
        <AddCardSheet cards={cards} deck={deck} onAdd={(name) => setCount(name, (deck.cards.find((e) => e.name === name)?.count ?? 0) + 1)} onClose={() => setSheet(null)} />
      )}
      {sheet === 'paste' && (
        <Sheet title="Colar lista" onClose={() => setSheet(null)}>
          <p className="hint">
            Cole a lista exportada (Piltover Archive e outros sites) ou escreva uma carta por linha, como "3 Jinx, Rebel". Lenda, battlefields, runas e sideboard são reconhecidos pelas seções da lista, e ela substitui as cartas atuais.
          </p>
          <textarea className="paste-box" rows={10} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={'Legend:\n1 Jinx, Loose Cannon\nMainDeck:\n3 Jinx, Rebel\n…\nSideboard:\n2 …'} />
          {pasteResult && <p className="hint">{pasteResult}</p>}
          <button className="primary" onClick={importList} disabled={!pasteText.trim()}>
            Importar
          </button>
        </Sheet>
      )}
    </main>
  )
}

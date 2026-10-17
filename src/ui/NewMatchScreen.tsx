import { useState } from 'react'
import { findLegend, legendImage } from '../data/cards'
import type { Deck } from '../engine/deck'
import { createMatch, type MatchFormat, type MatchPlayer } from '../engine/match'
import { isPlaceholderBattlefield } from '../engine/stats'
import type { AppAction } from '../store'
import { ArtPicker, BattlefieldPicker, BattlefieldTile, DomainIcons, LegendPicker } from './cards'

interface Draft {
  name: string
  /** Deck salvo escolhido (nome), se houver. */
  deck: string
  legend: string
  legendArt: string
  battlefields: [string, string, string]
}

const emptyDraft = (): Draft => ({ name: '', deck: '', legend: '', legendArt: '', battlefields: ['', '', ''] })

/** Preenche você com o nome, a lenda e os battlefields do seu perfil. */
const draftFrom = (p: MatchPlayer | null): Draft =>
  p
    ? {
        name: p.name,
        deck: '',
        legend: p.legend ?? '',
        legendArt: p.legendArt ?? '',
        // Nomes automáticos não são reaproveitados de uma partida para outra.
        battlefields: p.battlefields.map((bf) => (isPlaceholderBattlefield(bf) ? '' : bf)) as Draft['battlefields'],
      }
    : emptyDraft()

/** Completa campos vazios e garante 3 battlefields com nomes diferentes. */
function toPlayer(d: Draft, fallbackName: string, prefix: string): MatchPlayer {
  const used = new Set<string>()
  const battlefields = d.battlefields.map((raw, i) => {
    let bf = raw.trim() || `Battlefield ${prefix}${i + 1}`
    while (used.has(bf)) bf = `${bf} (${i + 1})`
    used.add(bf)
    return bf
  }) as MatchPlayer['battlefields']
  return {
    name: d.name.trim() || fallbackName,
    battlefields,
    ...(d.legend && { legend: d.legend }),
    ...(d.legend && d.legendArt && { legendArt: d.legendArt }),
    ...(d.deck && { deck: d.deck }),
  }
}

const LABELS = ['Você', 'Oponente'] as const

export function NewMatchScreen(props: {
  dispatch: (a: AppAction) => void
  profile: MatchPlayer | null
  decks: Deck[]
  /** Última lenda usada por cada oponente já enfrentado. */
  opponents: Map<string, string | undefined>
  onBack: () => void
}) {
  const { dispatch } = props
  const [format, setFormat] = useState<MatchFormat>('match')
  const [timer, setTimer] = useState(0)
  const [drafts, setDrafts] = useState<[Draft, Draft]>(() => [draftFrom(props.profile), emptyDraft()])
  const [picking, setPicking] = useState<{ player: 0 | 1; slot: number } | null>(null)
  const [pickingLegend, setPickingLegend] = useState<0 | 1 | null>(null)
  const [pickingArt, setPickingArt] = useState<0 | 1 | null>(null)

  const update = (p: 0 | 1, patch: Partial<Draft>) =>
    setDrafts((ds) => {
      const next = [...ds] as [Draft, Draft]
      next[p] = { ...next[p], ...patch }
      return next
    })

  const setBattlefield = (p: 0 | 1, slot: number, name: string) => {
    const battlefields = [...drafts[p].battlefields] as Draft['battlefields']
    battlefields[slot] = name
    update(p, { battlefields })
  }

  const setOpponentName = (name: string) => {
    // Oponente conhecido: já sugere a última lenda que ele usou.
    const knownLegend = props.opponents.get(name)
    update(1, knownLegend ? { name, legend: knownLegend, legendArt: '' } : { name })
  }

  const start = () => {
    let p1 = toPlayer(drafts[0], 'Jogador 1', 'A')
    const p2 = toPlayer(drafts[1], 'Jogador 2', 'B')
    if (p1.name === p2.name) p1 = { ...p1, name: `${p1.name} (1)` }
    dispatch({ type: 'newMatch', match: createMatch(format, [p1, p2], timer || undefined) })
  }

  const recentOpponents = [...props.opponents.keys()].slice(0, 4)
  const bfCount = (p: 0 | 1) => drafts[p].battlefields.filter(Boolean).length

  return (
    <main className="screen setup new-match-screen">
      <header className="page-head">
        <button className="link back" onClick={props.onBack}>
          ← Início
        </button>
        <h1>Nova partida</h1>
      </header>

      <div className="segmented" role="radiogroup" aria-label="Formato">
        <button role="radio" aria-checked={format === 'match'} className={format === 'match' ? 'on' : ''} onClick={() => setFormat('match')}>
          Melhor de 3
        </button>
        <button role="radio" aria-checked={format === 'duel'} className={format === 'duel' ? 'on' : ''} onClick={() => setFormat('duel')}>
          Jogo único
        </button>
      </div>

      <div className="timer-choice">
        <span className="hint">⏱ Timer de rodada</span>
        <div className="chips">
          {[0, 50, 60].map((min) => (
            <button key={min} className={`chip ${timer === min ? 'on' : ''}`} onClick={() => setTimer(min)}>
              {min ? `${min} min` : 'Sem timer'}
            </button>
          ))}
        </div>
      </div>

      {props.decks.length > 0 && (
        <div className="deck-choice">
          <span className="hint">🃏 Seu deck</span>
          <div className="chips scroll">
            {props.decks.map((d) => (
              <button
                key={d.id}
                className={`chip ${drafts[0].deck === d.name ? 'on' : ''}`}
                onClick={() =>
                  drafts[0].deck === d.name
                    ? update(0, { deck: '' })
                    : update(0, { deck: d.name, legend: d.legend ?? '', legendArt: d.legendArt ?? '', battlefields: d.battlefields })
                }
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="duel">
        {([0, 1] as const).map((p) => {
          const legend = findLegend(drafts[p].legend)
          return (
            <div key={p} className={`duelist p${p}`}>
              <span className="duelist-label">{LABELS[p]}</span>
              <button
                className={`duelist-art ${legend ? 'has-legend' : ''}`}
                style={legend ? { backgroundImage: `url("${legendImage(legend, drafts[p].legendArt, 480)}")` } : undefined}
                onClick={() => setPickingLegend(p)}
                aria-label={legend ? `Trocar lenda (${legend.champion})` : `Escolher lenda: ${LABELS[p]}`}
              >
                {legend ? (
                  <span className="duelist-legend">
                    <b>{legend.champion}</b>
                    <small>
                      <DomainIcons domains={legend.domains} /> {legend.name}
                    </small>
                  </span>
                ) : (
                  <span className="duelist-empty">
                    <span>+</span>
                    Lenda
                  </span>
                )}
              </button>
              {legend && legend.arts.length > 1 && (
                <button className="art-btn" onClick={() => setPickingArt(p)} aria-label={`Trocar arte de ${legend.champion}`}>
                  🎨 Arte · {legend.arts.length}
                </button>
              )}
              <input
                className="duelist-name"
                value={drafts[p].name}
                placeholder={`Jogador ${p + 1}`}
                aria-label={`Nome: ${LABELS[p]}`}
                list={p === 1 ? 'known-opponents' : undefined}
                onChange={(e) => (p === 1 ? setOpponentName(e.target.value) : update(0, { name: e.target.value }))}
              />
            </div>
          )
        })}
        <span className="duel-vs" aria-hidden="true">
          VS
        </span>
      </section>

      {recentOpponents.length > 0 && (
        <div className="quick-opponents">
          <span className="hint">Oponentes recentes:</span>
          <div className="chips">
            {recentOpponents.map((o) => (
              <button key={o} className={`chip ${drafts[1].name === o ? 'on' : ''}`} onClick={() => setOpponentName(o)}>
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      <details className="card bf-details">
        <summary>
          <span>Battlefields</span>
          <small>
            Você {bfCount(0)}/3 · Oponente {bfCount(1)}/3 · opcional
          </small>
        </summary>
        {([0, 1] as const).map((p) => (
          <div key={p} className="field">
            <span className={`c${p}`}>{LABELS[p]}</span>
            <div className="bf-slots">
              {drafts[p].battlefields.map((bf, i) =>
                bf ? (
                  <BattlefieldTile key={i} name={bf} onClick={() => setPicking({ player: p, slot: i })}>
                    <span
                      className="bf-tile-clear"
                      role="button"
                      aria-label={`Remover ${bf}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setBattlefield(p, i, '')
                      }}
                    >
                      ✕
                    </span>
                  </BattlefieldTile>
                ) : (
                  <button key={i} className="bf-slot-empty" onClick={() => setPicking({ player: p, slot: i })}>
                    + Battlefield {i + 1}
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </details>

      <button className="primary big start-match" onClick={start}>
        ⚔ Começar partida
      </button>

      <datalist id="known-opponents">
        {[...props.opponents.keys()].map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      {pickingLegend !== null && (
        <LegendPicker
          onPick={(legend) => {
            update(pickingLegend, pickingLegend === 0 ? { legend, legendArt: '', deck: '' } : { legend, legendArt: '' })
            setPickingLegend(null)
          }}
          onClose={() => setPickingLegend(null)}
        />
      )}
      {pickingArt !== null && findLegend(drafts[pickingArt].legend) && (
        <ArtPicker
          legend={findLegend(drafts[pickingArt].legend)!}
          current={drafts[pickingArt].legendArt}
          onPick={(legendArt) => {
            update(pickingArt, { legendArt })
            setPickingArt(null)
          }}
          onClose={() => setPickingArt(null)}
        />
      )}
      {picking && (
        <BattlefieldPicker
          exclude={drafts[picking.player].battlefields.filter((b, i) => b && i !== picking.slot)}
          onPick={(name) => {
            setBattlefield(picking.player, picking.slot, name)
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </main>
  )
}

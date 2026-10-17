import { useState } from 'react'
import { createMatch, type MatchFormat, type MatchPlayer } from '../engine/match'
import type { AppAction } from '../store'
import { findLegend } from '../data/cards'
import { BattlefieldPicker, BattlefieldTile, LegendPicker, LegendTile } from './cards'
import { Brand } from './common'

interface Draft {
  name: string
  legend: string
  battlefields: [string, string, string]
}

const emptyDraft = (): Draft => ({ name: '', legend: '', battlefields: ['', '', ''] })

/** Completa campos vazios e garante 3 battlefields com nomes diferentes. */
function toPlayer(d: Draft, fallbackName: string, prefix: string): MatchPlayer {
  const used = new Set<string>()
  const battlefields = d.battlefields.map((raw, i) => {
    let bf = raw.trim() || `Battlefield ${prefix}${i + 1}`
    while (used.has(bf)) bf = `${bf} (${i + 1})`
    used.add(bf)
    return bf
  }) as MatchPlayer['battlefields']
  return { name: d.name.trim() || fallbackName, battlefields, ...(d.legend && { legend: d.legend }) }
}

export function NewMatchScreen({ dispatch }: { dispatch: (a: AppAction) => void }) {
  const [format, setFormat] = useState<MatchFormat>('match')
  const [drafts, setDrafts] = useState<[Draft, Draft]>([emptyDraft(), emptyDraft()])
  const [picking, setPicking] = useState<{ player: 0 | 1; slot: number } | null>(null)
  const [pickingLegend, setPickingLegend] = useState<0 | 1 | null>(null)

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

  const start = () => {
    let p1 = toPlayer(drafts[0], 'Jogador 1', 'A')
    const p2 = toPlayer(drafts[1], 'Jogador 2', 'B')
    if (p1.name === p2.name) p1 = { ...p1, name: `${p1.name} (1)` }
    dispatch({ type: 'newMatch', match: createMatch(format, [p1, p2]) })
  }

  return (
    <main className="screen setup">
      <Brand subtitle="Placar e guia de partida · 1v1" />

      <section className="card">
        <h2>Formato</h2>
        <div className="segmented" role="radiogroup">
          <button role="radio" aria-checked={format === 'match'} className={format === 'match' ? 'on' : ''} onClick={() => setFormat('match')}>
            Melhor de 3
          </button>
          <button role="radio" aria-checked={format === 'duel'} className={format === 'duel' ? 'on' : ''} onClick={() => setFormat('duel')}>
            Jogo único
          </button>
        </div>
        <p className="hint">
          {format === 'match'
            ? 'Cada jogador escolhe o battlefield de cada jogo. Quem perde escolhe se começa o próximo.'
            : 'O battlefield de cada jogador é sorteado entre os 3 do deck.'}
        </p>
      </section>

      {([0, 1] as const).map((p) => (
        <section key={p} className={`card player-card p${p}`}>
          <h2>Jogador {p + 1}</h2>
          <label className="field">
            <span>Nome</span>
            <input value={drafts[p].name} placeholder={`Jogador ${p + 1}`} onChange={(e) => update(p, { name: e.target.value })} />
          </label>
          <div className="field">
            <span>Lenda (opcional)</span>
            {findLegend(drafts[p].legend) ? (
              <LegendTile legend={findLegend(drafts[p].legend)!} onClick={() => setPickingLegend(p)}>
                <span
                  className="bf-tile-clear"
                  role="button"
                  aria-label="Remover lenda"
                  onClick={(e) => {
                    e.stopPropagation()
                    update(p, { legend: '' })
                  }}
                >
                  ✕
                </span>
              </LegendTile>
            ) : (
              <button className="bf-slot-empty" onClick={() => setPickingLegend(p)}>
                + Escolher lenda
              </button>
            )}
          </div>
          <div className="field">
            <span>Battlefields do deck (opcional)</span>
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
        </section>
      ))}

      <button className="primary big" onClick={start}>
        Começar partida
      </button>

      <p className="legal">
        Riftbound Companion não é endossado pela Riot Games e não reflete as opiniões da Riot Games ou de qualquer pessoa
        envolvida na produção ou gestão de propriedades da Riot Games. Riot Games e todas as propriedades associadas são
        marcas comerciais ou registradas da Riot Games, Inc.
      </p>

      {pickingLegend !== null && (
        <LegendPicker
          onPick={(legend) => {
            update(pickingLegend, { legend })
            setPickingLegend(null)
          }}
          onClose={() => setPickingLegend(null)}
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

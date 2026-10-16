import { useState } from 'react'
import { createMatch, type MatchFormat, type MatchPlayer } from '../engine/match'
import type { AppAction } from '../store'

interface Draft {
  name: string
  battlefields: [string, string, string]
}

const emptyDraft = (): Draft => ({ name: '', battlefields: ['', '', ''] })

/** Completa campos vazios e garante 3 battlefields com nomes diferentes. */
function toPlayer(d: Draft, fallbackName: string, prefix: string): MatchPlayer {
  const used = new Set<string>()
  const battlefields = d.battlefields.map((raw, i) => {
    let bf = raw.trim() || `Battlefield ${prefix}${i + 1}`
    while (used.has(bf)) bf = `${bf} (${i + 1})`
    used.add(bf)
    return bf
  }) as MatchPlayer['battlefields']
  return { name: d.name.trim() || fallbackName, battlefields }
}

export function NewMatchScreen({ dispatch }: { dispatch: (a: AppAction) => void }) {
  const [format, setFormat] = useState<MatchFormat>('match')
  const [drafts, setDrafts] = useState<[Draft, Draft]>([emptyDraft(), emptyDraft()])

  const update = (p: 0 | 1, patch: Partial<Draft>) =>
    setDrafts((ds) => {
      const next = [...ds] as [Draft, Draft]
      next[p] = { ...next[p], ...patch }
      return next
    })

  const start = () => {
    let p1 = toPlayer(drafts[0], 'Jogador 1', 'A')
    const p2 = toPlayer(drafts[1], 'Jogador 2', 'B')
    if (p1.name === p2.name) p1 = { ...p1, name: `${p1.name} (1)` }
    dispatch({ type: 'newMatch', match: createMatch(format, [p1, p2]) })
  }

  return (
    <main className="screen setup">
      <header className="brand">
        <h1>Riftbound Companion</h1>
        <p>Placar e guia de turno para o 1v1</p>
      </header>

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
          <fieldset className="field">
            <legend>Battlefields do deck (opcional)</legend>
            {drafts[p].battlefields.map((bf, i) => (
              <input
                key={i}
                value={bf}
                placeholder={`Battlefield ${p === 0 ? 'A' : 'B'}${i + 1}`}
                aria-label={`Battlefield ${i + 1} do jogador ${p + 1}`}
                onChange={(e) => {
                  const battlefields = [...drafts[p].battlefields] as Draft['battlefields']
                  battlefields[i] = e.target.value
                  update(p, { battlefields })
                }}
              />
            ))}
          </fieldset>
        </section>
      ))}

      <button className="primary big" onClick={start}>
        Começar partida
      </button>
    </main>
  )
}

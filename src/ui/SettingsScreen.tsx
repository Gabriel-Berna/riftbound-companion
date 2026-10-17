import { useState } from 'react'
import { findLegend } from '../data/cards'
import type { MatchPlayer } from '../engine/match'
import type { AppAction, AppState, Settings } from '../store'
import { ArtPicker, LegendPicker, LegendTile } from './cards'
import { Brand } from './common'

const SETTING_LABELS: [keyof Settings, string, string][] = [
  ['sound', 'Sons', 'Ao pontuar, passar a vez e vencer.'],
  ['vibration', 'Vibração', 'Vibra ao pontuar (Android).'],
  ['keepAwake', 'Tela sempre ligada', 'Durante a partida, a tela não apaga.'],
]

/** Interruptores das preferências, usados nos Ajustes e no menu da partida. */
export function SettingsToggles({ settings, dispatch }: { settings: Settings; dispatch: (a: AppAction) => void }) {
  return (
    <div className="toggles">
      {SETTING_LABELS.map(([key, label, hint]) => (
        <label key={key} className="toggle">
          <span>
            <b>{label}</b>
            <small>{hint}</small>
          </span>
          <input type="checkbox" checked={settings[key]} onChange={(e) => dispatch({ type: 'setting', key, value: e.target.checked })} />
        </label>
      ))}
    </div>
  )
}

export function SettingsScreen(props: {
  state: AppState
  /** Perfil atual (salvo ou, na falta dele, você na última partida). */
  profile: MatchPlayer | null
  dispatch: (a: AppAction) => void
  onBack: () => void
}) {
  const { state, dispatch, onBack } = props
  const profile: MatchPlayer = props.profile ?? { name: '', battlefields: ['', '', ''] }
  const [pickingLegend, setPickingLegend] = useState(false)
  const [pickingArt, setPickingArt] = useState(false)
  const legend = findLegend(profile.legend)
  const save = (patch: Partial<MatchPlayer>) => dispatch({ type: 'setProfile', profile: { ...profile, ...patch } })

  return (
    <main className="screen setup">
      <button className="link back" onClick={onBack}>
        ← Início
      </button>
      <Brand title="Ajustes" />

      <section className="card">
        <h2>Seu perfil</h2>
        <label className="field">
          <span>Nome</span>
          <input value={profile.name} placeholder="Seu nome" onChange={(e) => save({ name: e.target.value })} />
        </label>
        <div className="field">
          <span>Lenda principal</span>
          {legend ? (
            <>
              <LegendTile legend={legend} art={profile.legendArt} onClick={() => setPickingLegend(true)} />
              {legend.arts.length > 1 && (
                <button className="secondary" onClick={() => setPickingArt(true)}>
                  🎨 Escolher arte ({legend.arts.length} disponíveis)
                </button>
              )}
            </>
          ) : (
            <button className="bf-slot-empty" onClick={() => setPickingLegend(true)}>
              + Escolher lenda
            </button>
          )}
        </div>
        <p className="hint">Usados para preencher a próxima partida. O perfil também é atualizado sempre que você começa uma partida.</p>
      </section>

      <section className="card">
        <h2>Preferências</h2>
        <SettingsToggles settings={state.settings} dispatch={dispatch} />
        <label className="toggle">
          <span>
            <b>Girar o painel do oponente</b>
            <small>Para jogar frente a frente com o celular no meio da mesa.</small>
          </span>
          <input type="checkbox" checked={state.tableMode} onChange={() => dispatch({ type: 'toggleTableMode' })} />
        </label>
      </section>

      <button className="secondary" onClick={() => dispatch({ type: 'setOnboarded', value: false })}>
        Ver a introdução de novo
      </button>

      <section className="card">
        <h2>Sobre</h2>
        <p className="hint">
          Riftbound Companion é um projeto de fã, gratuito e sem fins comerciais. Regras e cartas da galeria oficial em playriftbound.com.
        </p>
        <p className="legal">
          Riftbound Companion não é endossado pela Riot Games e não reflete as opiniões da Riot Games ou de qualquer pessoa envolvida na
          produção ou gestão de propriedades da Riot Games. Riot Games e todas as propriedades associadas são marcas comerciais ou
          registradas da Riot Games, Inc.
        </p>
      </section>

      {pickingArt && legend && (
        <ArtPicker
          legend={legend}
          current={profile.legendArt}
          onPick={(legendArt) => {
            save({ legendArt })
            setPickingArt(false)
          }}
          onClose={() => setPickingArt(false)}
        />
      )}
      {pickingLegend && (
        <LegendPicker
          onPick={(l) => {
            save({ legend: l, legendArt: undefined })
            setPickingLegend(false)
          }}
          onClose={() => setPickingLegend(false)}
        />
      )}
    </main>
  )
}

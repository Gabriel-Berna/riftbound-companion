import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { conquerOutcome, runesToChannel, type GameAction } from '../engine/game'
import { gameWins, isMatchOver, matchReducer, matchWinner, type MatchState } from '../engine/match'
import { DOMAINS, type Battlefield, type Domain, type GameState, type PlayerIndex, type PowerKind } from '../engine/types'
import type { AppAction, AppState, Settings } from '../store'
import { findBattlefield, findLegend } from '../data/cards'
import { battlefieldArt, DomainIcons, legendArt } from './cards'
import { ScoreGems, Sheet, Stepper } from './common'
import { useGameFeedback, useWakeLock } from './effects'
import { accentColors, VersusIntro, VictoryScreen } from './spectacle'
import { DOMAIN_COLORS, POWER_LABELS, describeLog } from './text'

type Panel =
  | { kind: 'battlefield'; id: string }
  | { kind: 'pool'; player: PlayerIndex }
  | { kind: 'log' }
  | { kind: 'menu' }
  | null

interface Props {
  state: AppState
  match: MatchState
  game: GameState
  dispatch: (a: AppAction) => void
}

export function GameScreen({ state, match, game, dispatch }: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  // A tela de VS aparece só quando o jogo acabou de começar.
  const [intro, setIntro] = useState(() => game.log.length === 1 && !game.result)
  const closeIntro = useCallback(() => setIntro(false), [])
  const act = (action: GameAction) => dispatch({ type: 'match', action: { type: 'game', action } })
  const flipped = (p: PlayerIndex) => state.tableMode && p === 1
  useGameFeedback(game, state.settings)
  useWakeLock(state.settings.keepAwake)

  return (
    <main className="game">
      <PlayerPanel game={game} legend={match.players[1].legend} player={1} flipped={flipped(1)} act={act} openPool={() => setPanel({ kind: 'pool', player: 1 })} />

      <section className="center">
        <div className="toolbar">
          <button className="tool" onClick={() => dispatch({ type: 'undo' })} disabled={state.history.length === 0}>
            ↶ Desfazer
          </button>
          <button className="tool" onClick={() => setPanel({ kind: 'log' })}>
            Histórico
          </button>
          <button className="tool" onClick={() => setPanel({ kind: 'menu' })} aria-label="Menu">
            ⋯
          </button>
        </div>
        <div className="battlefields">
          {game.battlefields.map((bf) => (
            <BattlefieldCard key={bf.id} game={game} bf={bf} onClick={() => setPanel({ kind: 'battlefield', id: bf.id })} />
          ))}
        </div>
        <TurnStrip game={game} flipped={flipped(game.active)} act={act} />
      </section>

      <PlayerPanel game={game} legend={match.players[0].legend} player={0} flipped={false} act={act} openPool={() => setPanel({ kind: 'pool', player: 0 })} />

      <Toast game={game} />

      {panel?.kind === 'battlefield' && (
        <BattlefieldSheet game={game} id={panel.id} act={act} onClose={() => setPanel(null)} />
      )}
      {panel?.kind === 'pool' && (
        <PoolSheet game={game} legend={match.players[panel.player].legend} player={panel.player} flipped={flipped(panel.player)} act={act} onClose={() => setPanel(null)} />
      )}
      {panel?.kind === 'log' && (
        <Sheet title="Histórico do jogo" onClose={() => setPanel(null)}>
          <ol className="log">
            {[...game.log].reverse().map((e, i) => (
              <li key={i} className={`log-${e.kind}`}>
                <span className="log-turn">T{e.turn}</span> {describeLog(game, e)}
              </li>
            ))}
          </ol>
        </Sheet>
      )}
      {panel?.kind === 'menu' && (
        <MenuSheet state={state} game={game} act={act} dispatch={dispatch} onClose={() => setPanel(null)} />
      )}
      {game.result && <GameOver match={match} game={game} dispatch={dispatch} />}
      {intro && <VersusIntro match={match} game={game} onDone={closeIntro} />}
    </main>
  )
}

function PlayerPanel(props: {
  game: GameState
  legend: string | undefined
  player: PlayerIndex
  flipped: boolean
  act: (a: GameAction) => void
  openPool: () => void
}) {
  const { game, player, act } = props
  const p = game.players[player]
  const legend = findLegend(props.legend)
  const isActive = game.active === player
  const power = Object.values(p.power).reduce((a, b) => a + b, 0)
  // Com lenda, o brilho do painel usa as cores dos domínios dela.
  const [accentA, accentB] = accentColors(legend, player)

  return (
    <section
      className={`panel p${player} ${isActive ? 'active' : ''} ${props.flipped ? 'flipped' : ''} ${legend ? 'with-legend' : ''}`}
      style={legend ? ({ '--pc-a': accentA, '--pc-b': accentB } as CSSProperties) : undefined}
      aria-label={`Painel de ${p.name}`}
    >
      {legend && <div className="panel-art" style={legendArt(legend.name, 640)} aria-hidden="true" />}
      <div className="panel-head">
        <span className="panel-id">
          <span className="panel-name">{p.name}</span>
          {legend && (
            <span className="panel-legend">
              <DomainIcons domains={legend.domains} /> {legend.champion}
            </span>
          )}
        </span>
        {isActive && <span className="badge">Vez de jogar</span>}
        <button
          className="text-btn"
          onClick={() => confirm(`${p.name} sofreu Burn Out? O oponente ganha 1 ponto.`) && act({ type: 'burnOut', player })}
        >
          Burn Out
        </button>
      </div>
      <div className="score-row">
        <button className="score-btn" onClick={() => act({ type: 'adjustPoints', player, delta: -1 })} disabled={p.points === 0} aria-label={`Tirar 1 ponto de ${p.name}`}>
          −
        </button>
        <div className="score" aria-live="polite">
          {/* A key reinicia a animação a cada mudança de pontos. */}
          <b key={p.points} className="bump">
            {p.points}
          </b>
          <small>/ {game.victoryScore}</small>
        </div>
        <button className="score-btn" onClick={() => act({ type: 'adjustPoints', player, delta: 1 })} aria-label={`Dar 1 ponto a ${p.name} por efeito`} title="Ponto por efeito de carta">
          +
        </button>
      </div>
      <ScoreGems points={p.points} target={game.victoryScore} />
      <div className="res-row">
        <Stepper label="XP" value={p.xp} onChange={(delta) => act({ type: 'adjustXp', player, delta })} />
        <button className="pool-btn" onClick={props.openPool}>
          <span>⚡ {p.energy}</span>
          <span>◆ {power}</span>
          <small>Rune pool</small>
        </button>
      </div>
    </section>
  )
}

function BattlefieldCard({ game, bf, onClick }: { game: GameState; bf: Battlefield; onClick: () => void }) {
  const ctrl = bf.controller
  return (
    <button className={`bf ${ctrl === null ? 'free' : `ctrl${ctrl}`} ${findBattlefield(bf.name) ? 'has-art' : ''}`} style={battlefieldArt(bf.name)} onClick={onClick}>
      {ctrl !== null && <span key={`wave${ctrl}`} className={`bf-wave c${ctrl}`} aria-hidden="true" />}
      <span className="bf-name">{bf.name}</span>
      <span className="bf-ctrl">{ctrl === null ? 'Sem controle' : `Controle: ${game.players[ctrl].name}`}</span>
      <span className="bf-scored">
        {([0, 1] as const).map((p) =>
          game.scoredThisTurn[p].includes(bf.id) ? (
            <span key={p} className={`scored c${p}`}>
              ✓ {game.players[p].name}
            </span>
          ) : null,
        )}
      </span>
    </button>
  )
}

function BattlefieldSheet(props: { game: GameState; id: string; act: (a: GameAction) => void; onClose: () => void }) {
  const { game, act } = props
  const bf = game.battlefields.find((b) => b.id === props.id)!
  const card = findBattlefield(bf.name)
  const done = (a: GameAction) => {
    act(a)
    props.onClose()
  }

  return (
    <Sheet title={bf.name} onClose={props.onClose}>
      {card && (
        <div className="bf-detail has-art" style={battlefieldArt(bf.name, 800)}>
          <p>{card.text}</p>
        </div>
      )}
      <p className="hint">
        Battlefield de {game.players[bf.owner].name}
        {card && ` · ${card.setName}`}.
      </p>
      <h3>Conquista</h3>
      <div className="actions">
        {([0, 1] as const)
          .filter((p) => bf.controller !== p)
          .map((p) => {
            const outcome = conquerOutcome(game, p, bf.id)
            return (
              <button key={p} className={`action p${p}`} onClick={() => done({ type: 'conquer', player: p, battlefieldId: bf.id })}>
                <b>{game.players[p].name} conquistou</b>
                <small className={outcome === 'blocked' ? 'warn' : ''}>
                  {outcome === 'point' && '+1 ponto'}
                  {outcome === 'blocked' && 'Ponto final barrado: ainda falta pontuar o outro battlefield neste turno. Compra 1 carta.'}
                  {outcome === 'already-scored' && 'Já pontuado neste turno: só muda o controle.'}
                </small>
              </button>
            )
          })}
      </div>
      <h3>Corrigir controle (sem pontuar)</h3>
      <div className="segmented">
        {([0, 1, null] as const).map((p) => (
          <button
            key={String(p)}
            className={bf.controller === p ? 'on' : ''}
            onClick={() => done({ type: 'setControl', battlefieldId: bf.id, controller: p })}
          >
            {p === null ? 'Ninguém' : game.players[p].name}
          </button>
        ))}
      </div>
      <p className="hint">Use quando alguém perder o controle sem conquista, por exemplo ao ficar sem unidades no battlefield.</p>
    </Sheet>
  )
}

function PoolSheet(props: {
  game: GameState
  legend: string | undefined
  player: PlayerIndex
  flipped: boolean
  act: (a: GameAction) => void
  onClose: () => void
}) {
  const { game, player, act } = props
  const p = game.players[player]
  const legend = findLegend(props.legend)
  // Com lenda definida, só os domínios dela aparecem: o deck segue a Domain Identity da lenda (CR 103.2.b).
  const kinds: PowerKind[] = [...DOMAINS, 'universal'].filter(
    (k) => !legend || k === 'universal' || legend.domains.includes(k as Domain) || p.power[k as PowerKind] > 0,
  ) as PowerKind[]
  return (
    <Sheet title={`Rune pool de ${p.name}`} flipped={props.flipped} onClose={props.onClose}>
      <p className="hint">Energy e Power acumulados. O pool esvazia sozinho quando alguém passa a vez.</p>
      <div className="pool-grid">
        <Stepper label="Energy" value={p.energy} onChange={(delta) => act({ type: 'adjustEnergy', player, delta })} />
        {kinds.map((kind) => (
          <Stepper
            key={kind}
            label={POWER_LABELS[kind]}
            color={DOMAIN_COLORS[kind]}
            value={p.power[kind]}
            onChange={(delta) => act({ type: 'adjustPower', player, kind, delta })}
          />
        ))}
      </div>
      <button className="secondary" onClick={() => act({ type: 'clearPool', player })}>
        Esvaziar pool
      </button>
    </Sheet>
  )
}

/** Faixa do turno, virada para o jogador da vez. */
function TurnStrip({ game, flipped, act }: { game: GameState; flipped: boolean; act: (a: GameAction) => void }) {
  const extraRune = runesToChannel(game) > 2
  return (
    <div className={`turnstrip p${game.active} ${flipped ? 'flipped' : ''}`}>
      <div className="turn-info">
        <span className="turn-head">
          Turno {game.turn} · vez de <b className={`c${game.active}`}>{game.players[game.active].name}</b>
        </span>
        <span className={extraRune ? 'turn-note emph' : 'turn-note'}>
          {extraRune ? 'Primeiro turno: canalize 3 runas (1 extra).' : 'Toque num battlefield para registrar uma conquista.'}
        </span>
      </div>
      <button className="primary next" onClick={() => act({ type: 'passTurn' })}>
        Passar a vez →
      </button>
    </div>
  )
}

/** Mostra por alguns segundos o que acabou de acontecer com o placar. */
function Toast({ game }: { game: GameState }) {
  const [message, setMessage] = useState<{ lines: string[]; warn: boolean } | null>(null)
  const seen = useRef(game.log.length)

  useEffect(() => {
    const fresh = game.log.slice(seen.current)
    seen.current = game.log.length
    const relevant = fresh.filter((e) => e.kind !== 'result')
    // Uma passagem de turno sem pontos não precisa de aviso.
    if (relevant.every((e) => e.kind === 'turn-start')) return
    const warn = relevant.some((e) => e.kind === 'final-point-blocked' || e.kind === 'already-scored')
    setMessage({ lines: relevant.map((e) => describeLog(game, e)), warn })
    const t = setTimeout(() => setMessage(null), warn ? 6000 : 3000)
    return () => clearTimeout(t)
  }, [game])

  if (!message) return null
  return (
    <div className={`toast ${message.warn ? 'warn' : ''}`} role="status">
      {message.lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  )
}

const SETTING_LABELS: [keyof Settings, string, string][] = [
  ['sound', 'Sons', 'Ao pontuar, passar a vez e vencer.'],
  ['vibration', 'Vibração', 'Vibra ao pontuar (Android).'],
  ['keepAwake', 'Tela sempre ligada', 'Durante a partida, a tela não apaga.'],
]

function MenuSheet(props: { state: AppState; game: GameState; act: (a: GameAction) => void; dispatch: (a: AppAction) => void; onClose: () => void }) {
  const { game, act } = props
  const close = (fn: () => void) => () => {
    fn()
    props.onClose()
  }
  return (
    <Sheet title="Menu" onClose={props.onClose}>
      <h3>Preferências</h3>
      <div className="toggles">
        {SETTING_LABELS.map(([key, label, hint]) => (
          <label key={key} className="toggle">
            <span>
              <b>{label}</b>
              <small>{hint}</small>
            </span>
            <input
              type="checkbox"
              checked={props.state.settings[key]}
              onChange={(e) => props.dispatch({ type: 'setting', key, value: e.target.checked })}
            />
          </label>
        ))}
      </div>
      <h3>Partida</h3>
      <div className="actions">
        <button className="action" onClick={close(() => props.dispatch({ type: 'toggleTableMode' }))}>
          <b>{props.state.tableMode ? 'Não girar' : 'Girar'} o painel do oponente</b>
          <small>Para quem joga frente a frente com o celular no meio da mesa.</small>
        </button>
        {([0, 1] as const).map((p) => (
          <button key={p} className="action" onClick={close(() => confirm(`${game.players[p].name} concede o jogo?`) && act({ type: 'concede', player: p }))}>
            <b>{game.players[p].name} concede</b>
          </button>
        ))}
        {([0, 1] as const).map((p) => (
          <button key={`win${p}`} className="action" onClick={close(() => confirm(`${game.players[p].name} venceu por efeito de carta?`) && act({ type: 'winByEffect', player: p }))}>
            <b>{game.players[p].name} venceu por efeito de carta</b>
            <small>Ex.: The Grand Plaza, com 7 ou mais unidades.</small>
          </button>
        ))}
        <button className="action" onClick={close(() => confirm('Declarar o jogo empatado?') && act({ type: 'declareDraw' }))}>
          <b>Declarar empate</b>
          <small>Por exemplo, quando o tempo da rodada acaba sem vantagem de 2 pontos.</small>
        </button>
        <button className="action danger" onClick={close(() => confirm('Abandonar a partida inteira?') && props.dispatch({ type: 'quit' }))}>
          <b>Abandonar partida</b>
        </button>
      </div>
    </Sheet>
  )
}

function GameOver({ match, game, dispatch }: { match: MatchState; game: GameState; dispatch: (a: AppAction) => void }) {
  const result = game.result!
  // Prévia da partida com este jogo registrado, para saber se ela termina aqui.
  const after = matchReducer(match, { type: 'finishGame' })
  const wins = gameWins(after)
  const over = isMatchOver(after)
  const champion = matchWinner(after)

  return (
    <VictoryScreen
      match={match}
      game={game}
      result={result}
      matchWins={wins}
      matchOver={over}
      champion={champion}
      onContinue={() => dispatch({ type: 'match', action: { type: 'finishGame' } })}
      onUndo={() => dispatch({ type: 'undo' })}
    />
  )
}

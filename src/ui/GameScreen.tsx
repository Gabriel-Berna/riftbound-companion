import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { EXTRA_TURNS, needsFinalPointCheck, type GameAction } from '../engine/game'
import { gameWins, isMatchOver, matchReducer, matchWinner, type MatchState } from '../engine/match'
import type { GameState, PlayerIndex, ScoreKind } from '../engine/types'
import type { AppAction, AppState } from '../store'
import { findBattlefield, findLegend } from '../data/cards'
import { battlefieldArt, DomainIcons, legendArt } from './cards'
import { ScoreGems, Sheet, Stepper } from './common'
import { useGameFeedback, useWakeLock } from './effects'
import { LibraryScreen } from './LibraryScreen'
import { RulesScreen } from './RulesScreen'
import { SettingsToggles } from './SettingsScreen'
import { accentColors, VersusIntro, VictoryScreen } from './spectacle'
import { RoundClock } from './timer'
import { describeLog } from './text'

type Panel =
  | { kind: 'final-point'; player: PlayerIndex }
  | { kind: 'player'; player: PlayerIndex }
  | { kind: 'battlefield'; name: string }
  | { kind: 'log' }
  | { kind: 'menu' }
  | { kind: 'library' }
  | { kind: 'rules' }
  | null

interface Props {
  state: AppState
  match: MatchState
  game: GameState
  dispatch: (a: AppAction) => void
}

/**
 * Placar da partida. Cada metade é de um jogador: um toque na metade esquerda da lenda registra um ponto
 * de Hold; na direita, de Conquer. O app não acompanha turnos: o jogador olha para as cartas, não para o celular.
 */
export function GameScreen({ state, match, game, dispatch }: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  // A tela de VS aparece só quando o jogo acabou de começar.
  const [intro, setIntro] = useState(() => game.log.length === 0 && !game.result)
  const closeIntro = useCallback(() => setIntro(false), [])
  const act = (action: GameAction) => dispatch({ type: 'match', action: { type: 'game', action } })
  const flipped = (p: PlayerIndex) => state.tableMode && p === 1
  useGameFeedback(game, state.settings)
  useWakeLock(state.settings.keepAwake)

  const score = (player: PlayerIndex, kind: ScoreKind) => {
    // A 1 ponto da vitória, o Conquer depende da regra do Ponto Final: pergunta antes de pontuar.
    if (kind === 'conquer' && needsFinalPointCheck(game, player)) setPanel({ kind: 'final-point', player })
    else act({ type: 'score', player, kind })
  }
  const close = () => setPanel(null)
  const playerPanel = (p: PlayerIndex) => (
    <PlayerPanel
      game={game}
      legend={match.players[p].legend}
      legendArt={match.players[p].legendArt}
      player={p}
      flipped={flipped(p)}
      onScore={(kind) => score(p, kind)}
      onOptions={() => setPanel({ kind: 'player', player: p })}
    />
  )

  return (
    <main className="game">
      {playerPanel(1)}
      <CenterBar
        match={match}
        game={game}
        canUndo={state.history.length > 0}
        onUndo={() => dispatch({ type: 'undo' })}
        onBattlefield={(name) => setPanel({ kind: 'battlefield', name })}
        onLibrary={() => setPanel({ kind: 'library' })}
        onMenu={() => setPanel({ kind: 'menu' })}
        onEndByTime={() => confirm('Os 3 turnos extras acabaram? Vence quem tiver 2 ou mais pontos de vantagem; senão, empate.') && act({ type: 'endByTime' })}
      />
      {playerPanel(0)}

      <Toast game={game} onUndo={() => dispatch({ type: 'undo' })} />

      {panel?.kind === 'final-point' && (
        <FinalPointSheet
          game={game}
          player={panel.player}
          flipped={flipped(panel.player)}
          onAnswer={(scoredAllBattlefields) => {
            act({ type: 'score', player: panel.player, kind: 'conquer', scoredAllBattlefields })
            close()
          }}
          onClose={close}
        />
      )}
      {panel?.kind === 'player' && <PlayerSheet game={game} player={panel.player} flipped={flipped(panel.player)} act={act} onClose={close} />}
      {panel?.kind === 'battlefield' && <BattlefieldSheet name={panel.name} onClose={close} />}
      {panel?.kind === 'log' && (
        <Sheet title="Histórico do jogo" onClose={close}>
          {game.log.length === 0 && <p className="hint">Nenhum ponto ainda.</p>}
          <ol className="log">
            {[...game.log].reverse().map((e, i) => (
              <li key={i} className={`log-${e.kind}`}>
                {describeLog(game, e)}
              </li>
            ))}
          </ol>
        </Sheet>
      )}
      {panel?.kind === 'menu' && (
        <MenuSheet
          state={state}
          match={match}
          game={game}
          act={act}
          dispatch={dispatch}
          onLog={() => setPanel({ kind: 'log' })}
          onRules={() => setPanel({ kind: 'rules' })}
          onClose={close}
        />
      )}
      {panel?.kind === 'library' && <LibraryScreen overlay onClose={close} />}
      {panel?.kind === 'rules' && <RulesScreen overlay onClose={close} />}
      {game.result && <GameOver match={match} game={game} dispatch={dispatch} />}
      {intro && <VersusIntro match={match} game={game} onDone={closeIntro} />}
    </main>
  )
}

function PlayerPanel(props: {
  game: GameState
  legend: string | undefined
  legendArt: string | undefined
  player: PlayerIndex
  flipped: boolean
  onScore: (kind: ScoreKind) => void
  onOptions: () => void
}) {
  const { game, player } = props
  const p = game.players[player]
  const legend = findLegend(props.legend)
  const [accentA, accentB] = accentColors(legend, player)
  // O último ponto deste jogador sobe da metade tocada; a key reinicia a animação a cada ponto.
  const last = game.log.at(-1)
  const flash = last && (last.kind === 'hold' || last.kind === 'conquer') && last.player === player ? last.kind : null

  return (
    <section
      className={`panel p${player} ${props.flipped ? 'flipped' : ''} ${legend ? 'with-legend' : ''}`}
      style={{ '--pc-a': accentA, '--pc-b': accentB } as CSSProperties}
      aria-label={`Placar de ${p.name}`}
    >
      {legend && <div className="panel-art" style={legendArt(legend.name, 720, props.legendArt)} aria-hidden="true" />}
      <header className="panel-head">
        <span className="panel-id">
          <span className="panel-name">{p.name}</span>
          {legend && (
            <span className="panel-legend">
              <DomainIcons domains={legend.domains} /> {legend.champion}
            </span>
          )}
        </span>
        {p.xp > 0 && <span className="xp-chip">XP {p.xp}</span>}
        <button className="icon-btn panel-more" onClick={props.onOptions} aria-label={`Opções de ${p.name}`}>
          ⋯
        </button>
      </header>
      <div className="tap-zones">
        <button className="tap hold" onClick={() => props.onScore('hold')} aria-label={`Hold: +1 ponto para ${p.name}`}>
          <span className="tap-label">⚑ Hold</span>
        </button>
        <button className="tap conquer" onClick={() => props.onScore('conquer')} aria-label={`Conquer: +1 ponto para ${p.name}`}>
          <span className="tap-label">⚔ Conquer</span>
        </button>
        <div className="panel-score" aria-live="polite">
          <div className="score">
            <b key={p.points} className="bump">
              {p.points}
            </b>
            <small>/ {game.victoryScore}</small>
          </div>
          <ScoreGems points={p.points} target={game.victoryScore} />
        </div>
        {flash && (
          <span key={game.log.length} className={`tap-flash ${flash}`} aria-hidden="true">
            +1 {flash === 'hold' ? '⚑' : '⚔'}
          </span>
        )}
      </div>
    </section>
  )
}

/** Faixa central: desfazer, relógio, battlefields do jogo, cartas e menu. */
function CenterBar(props: {
  match: MatchState
  game: GameState
  canUndo: boolean
  onUndo: () => void
  onBattlefield: (name: string) => void
  onLibrary: () => void
  onMenu: () => void
  onEndByTime: () => void
}) {
  const { match, game } = props
  // Só os battlefields reais do banco de cartas (nomes provisórios como "Battlefield A1" ficam de fora).
  const battlefields = game.battlefields.filter((name) => findBattlefield(name))
  return (
    <section className="center-bar">
      <div className="cb-row">
        <button className="tool" onClick={props.onUndo} disabled={!props.canUndo} aria-label="Desfazer">
          ↶
        </button>
        <div className="cb-mid">
          {match.timer && !game.timeUp ? <RoundClock match={match} /> : <span className="cb-target">Vence com {game.victoryScore}</span>}
        </div>
        <button className="tool" onClick={props.onLibrary} aria-label="Cartas">
          🃏
        </button>
        <button className="tool" onClick={props.onMenu} aria-label="Menu">
          ⋯
        </button>
      </div>
      {battlefields.length > 0 && (
        <div className="cb-bfs">
          {battlefields.map((name, i) => (
            <button key={i} className="cb-bf has-art" style={battlefieldArt(name, 360)} onClick={() => props.onBattlefield(name)}>
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
      {game.timeUp && (
        <div className="time-up">
          <span>
            ⏱ <b>Tempo esgotado.</b> Terminem o turno e joguem mais {EXTRA_TURNS} turnos.
          </span>
          <button className="secondary" onClick={props.onEndByTime}>
            Fim dos turnos extras
          </button>
        </div>
      )}
    </section>
  )
}

/** Regra do Ponto Final (CR 473.1.b): a 1 ponto da vitória, o Conquer só pontua com todos os battlefields já pontuados no turno. */
function FinalPointSheet(props: { game: GameState; player: PlayerIndex; flipped: boolean; onAnswer: (scoredAll: boolean) => void; onClose: () => void }) {
  const name = props.game.players[props.player].name
  return (
    <Sheet title="Ponto final" flipped={props.flipped} onClose={props.onClose}>
      <p>
        {name} está a 1 ponto da vitória. Pelo Conquer, o ponto só vale se {name} já pontuou <b>todos os battlefields</b> neste turno.
      </p>
      <button className="primary big" onClick={() => props.onAnswer(true)}>
        Pontuou todos: vale o ponto
      </button>
      <button className="secondary" onClick={() => props.onAnswer(false)}>
        Não pontuou: compra 1 carta
      </button>
      <p className="hint">Hold e pontos de efeitos de cartas não têm essa restrição.</p>
    </Sheet>
  )
}

/** Ajustes de um jogador: correções, efeitos de cartas, Burn Out, XP e fim do jogo. */
function PlayerSheet(props: { game: GameState; player: PlayerIndex; flipped: boolean; act: (a: GameAction) => void; onClose: () => void }) {
  const { game, player, act } = props
  const p = game.players[player]
  const opponent = game.players[player === 0 ? 1 : 0].name
  const done = (a: GameAction) => {
    act(a)
    props.onClose()
  }
  return (
    <Sheet title={p.name} flipped={props.flipped} onClose={props.onClose}>
      <h3>Pontos</h3>
      <div className="actions two">
        <button className="action" onClick={() => done({ type: 'adjustPoints', player, delta: -1 })} disabled={p.points === 0}>
          <b>−1 ponto</b>
          <small>Corrigir um toque errado</small>
        </button>
        <button className="action" onClick={() => done({ type: 'adjustPoints', player, delta: 1 })}>
          <b>+1 por efeito</b>
          <small>Carta que dá pontos</small>
        </button>
      </div>
      <Stepper label="XP" value={p.xp} onChange={(delta) => act({ type: 'adjustXp', player, delta })} />
      <h3>Jogo</h3>
      <div className="actions">
        <button className="action" onClick={() => confirm(`${p.name} sofreu Burn Out? ${opponent} ganha 1 ponto.`) && done({ type: 'burnOut', player })}>
          <b>{p.name} sofreu Burn Out</b>
          <small>Comprou com o deck vazio: {opponent} ganha 1 ponto.</small>
        </button>
        <button className="action" onClick={() => confirm(`${p.name} venceu por efeito de carta?`) && done({ type: 'winByEffect', player })}>
          <b>{p.name} venceu por efeito de carta</b>
          <small>Ex.: The Grand Plaza, com 7 ou mais unidades.</small>
        </button>
        <button className="action" onClick={() => confirm(`${p.name} concede o jogo?`) && done({ type: 'concede', player })}>
          <b>{p.name} concede</b>
        </button>
      </div>
    </Sheet>
  )
}

function BattlefieldSheet({ name, onClose }: { name: string; onClose: () => void }) {
  const card = findBattlefield(name)
  return (
    <Sheet title={name} onClose={onClose}>
      {card && (
        <div className="bf-detail has-art" style={battlefieldArt(name, 800)}>
          <p>{card.text}</p>
        </div>
      )}
      {card && <p className="hint">{card.setName}</p>}
    </Sheet>
  )
}

/** Mostra por alguns segundos o que acabou de acontecer no placar, com atalho para desfazer. */
function Toast({ game, onUndo }: { game: GameState; onUndo: () => void }) {
  const [message, setMessage] = useState<{ lines: string[]; warn: boolean; undoable: boolean } | null>(null)
  const seen = useRef(game.log.length)

  useEffect(() => {
    const fresh = game.log.slice(seen.current)
    const undone = game.log.length < seen.current
    seen.current = game.log.length
    // Desfazer some com o aviso; o fim do jogo tem a sua própria tela.
    if (undone) return setMessage(null)
    const relevant = fresh.filter((e) => e.kind !== 'result')
    if (relevant.length === 0) return
    const warn = relevant.some((e) => e.kind === 'final-point-blocked' || e.kind === 'time-up')
    // O fim do tempo vem do relógio: desfazer só faria o aviso voltar.
    const undoable = relevant.some((e) => e.kind !== 'time-up')
    setMessage({ lines: relevant.map((e) => describeLog(game, e)), warn, undoable })
    const t = setTimeout(() => setMessage(null), warn ? 6000 : 3500)
    return () => clearTimeout(t)
  }, [game])

  if (!message) return null
  return (
    <div className={`toast ${message.warn ? 'warn' : ''}`} role="status">
      <span>
        {message.lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </span>
      {message.undoable && (
        <button className="toast-undo" onClick={onUndo}>
          Desfazer
        </button>
      )}
    </div>
  )
}

function MenuSheet(props: {
  state: AppState
  match: MatchState
  game: GameState
  onLog: () => void
  onRules: () => void
  act: (a: GameAction) => void
  dispatch: (a: AppAction) => void
  onClose: () => void
}) {
  const { act } = props
  const close = (fn: () => void) => () => {
    fn()
    props.onClose()
  }
  return (
    <Sheet title="Menu" onClose={props.onClose}>
      <div className="actions two">
        <button className="action" onClick={props.onLog}>
          <b>📜 Histórico</b>
        </button>
        <button className="action" onClick={props.onRules}>
          <b>📖 Regras</b>
        </button>
      </div>
      <h3>Preferências</h3>
      <SettingsToggles settings={props.state.settings} dispatch={props.dispatch} />
      <h3>Partida</h3>
      <div className="actions">
        {props.match.timer?.startedAt != null && !props.match.timeUp && (
          <button
            className="action"
            onClick={close(() =>
              props.dispatch({ type: 'match', action: { type: props.match.timer?.pausedAt != null ? 'resumeTimer' : 'pauseTimer', now: Date.now() } }),
            )}
          >
            <b>{props.match.timer.pausedAt != null ? '▶ Retomar timer' : '⏸ Pausar timer'}</b>
            <small>Em torneios o relógio não para; use em partidas casuais.</small>
          </button>
        )}
        <button className="action" onClick={close(() => props.dispatch({ type: 'toggleTableMode' }))}>
          <b>{props.state.tableMode ? 'Não girar' : 'Girar'} o placar do oponente</b>
          <small>Para quem joga frente a frente com o celular no meio da mesa.</small>
        </button>
        <button className="action" onClick={close(() => confirm('Declarar o jogo empatado?') && act({ type: 'declareDraw' }))}>
          <b>Declarar empate</b>
        </button>
        <button className="action danger" onClick={close(() => confirm('Abandonar a partida inteira?') && props.dispatch({ type: 'quit' }))}>
          <b>Abandonar partida</b>
        </button>
      </div>
      <p className="hint">Burn Out, pontos por efeito, XP e concessão ficam no ⋯ de cada jogador.</p>
    </Sheet>
  )
}

function GameOver({ match, game, dispatch }: { match: MatchState; game: GameState; dispatch: (a: AppAction) => void }) {
  const result = game.result!
  // O jogo termina quando o resultado aparece (não quando alguém toca em continuar): é o fim usado na duração.
  const [endedAt] = useState(() => Date.now())
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
      onContinue={() => dispatch({ type: 'match', action: { type: 'finishGame', now: endedAt } })}
      onUndo={() => dispatch({ type: 'undo' })}
    />
  )
}

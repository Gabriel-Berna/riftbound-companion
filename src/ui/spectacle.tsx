import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { cardImage, findLegend, type LegendCard } from '../data/cards'
import type { MatchState } from '../engine/match'
import type { GameResult, GameState, PlayerIndex } from '../engine/types'
import { DomainIcons } from './cards'
import { DOMAIN_COLORS } from './text'

const PLAYER_COLORS = ['#4cc3ff', '#ff6a5c']

/** Cores de destaque de um jogador: as dos domínios da lenda, ou a cor do jogador. */
export function accentColors(legend: LegendCard | undefined, player: PlayerIndex): [string, string] {
  if (!legend) return [PLAYER_COLORS[player], PLAYER_COLORS[player]]
  return [DOMAIN_COLORS[legend.domains[0]], DOMAIN_COLORS[legend.domains[1] ?? legend.domains[0]]]
}

const artBg = (legend: LegendCard | undefined, width: number): CSSProperties | undefined =>
  legend ? { backgroundImage: `url("${cardImage(legend, width)}")` } : undefined

/** Tela de "VS" no início de cada jogo, no estilo da tela de carregamento do LoL. */
export function VersusIntro(props: { match: MatchState; game: GameState; onDone: () => void }) {
  const { match, game, onDone } = props
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  const gameNumber = match.games.length + 1
  // Jogador 2 em cima (lado oposto da mesa), Jogador 1 embaixo.
  const sides = ([1, 0] as const).map((p) => {
    const legend = findLegend(match.players[p].legend)
    const [a, b] = accentColors(legend, p)
    return (
      <div key={p} className={`vs-side vs-p${p}`} style={{ '--a': a, '--b': b } as CSSProperties}>
        <div className="vs-art" style={artBg(legend, 900)} />
        <div className="vs-label">
          <span className="vs-name">{match.players[p].name}</span>
          {legend && (
            <span className="vs-legend">
              <DomainIcons domains={legend.domains} /> {legend.champion}
            </span>
          )}
        </div>
      </div>
    )
  })

  return (
    <div className="vs-screen" role="dialog" aria-label="Início do jogo" onClick={onDone}>
      {sides}
      <div className="vs-center">
        <span className="vs-badge">{match.format === 'match' ? `Jogo ${gameNumber}` : 'Jogo único'}</span>
        <b className="vs-text">VS</b>
        <span className="vs-starts">{game.players[game.firstPlayer].name} começa</span>
      </div>
    </div>
  )
}

/** Partículas brilhantes subindo, nas cores dadas. */
function Particles({ colors, count = 36 }: { colors: string[]; count?: number }) {
  // Posições sorteadas uma vez, para não "pular" a cada renderização.
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        size: 4 + Math.random() * 8,
        delay: Math.random() * 2.5,
        duration: 2.4 + Math.random() * 2.4,
        drift: (Math.random() - 0.5) * 120,
        color: colors[i % colors.length],
      })),
    [colors, count],
  )
  return (
    <div className="particles" aria-hidden="true">
      {particles.map((p, i) => (
        <i
          key={i}
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** Tela de vitória: arte da lenda vencedora em tela cheia, partículas e o resultado. */
export function VictoryScreen(props: {
  match: MatchState
  game: GameState
  result: GameResult
  matchWins: [number, number]
  matchOver: boolean
  champion: PlayerIndex | null
  onContinue: () => void
  onUndo: () => void
}) {
  const { match, game, result } = props
  const winner = result.kind === 'win' ? result.winner : null
  const legend = winner === null ? undefined : findLegend(match.players[winner].legend)
  const colors = useMemo(() => (winner === null ? [] : [...accentColors(legend, winner), '#f9eddc', '#c8aa6e']), [legend, winner])

  return (
    <div className={`victory ${winner === null ? 'draw' : `p${winner}`}`} role="dialog" aria-label="Fim de jogo">
      <div className="victory-art" style={artBg(legend, 1200)} />
      {winner !== null && <Particles colors={colors} />}
      <div className="victory-content">
        <span className="victory-title">{winner === null ? 'Empate' : 'Vitória'}</span>
        {winner !== null && (
          <>
            <h2 className={`victory-name c${winner}`}>{game.players[winner].name}</h2>
            {legend && (
              <span className="victory-legend">
                <DomainIcons domains={legend.domains} /> {legend.champion} · {legend.name}
              </span>
            )}
            {result.kind === 'win' && result.reason !== 'points' && (
              <span className="victory-reason">{result.reason === 'concede' ? 'por concessão' : 'por efeito de carta'}</span>
            )}
          </>
        )}
        <p className="final-score">
          <span className="c0">{game.players[0].points}</span>
          <span className="sep">×</span>
          <span className="c1">{game.players[1].points}</span>
        </p>
        {match.format === 'match' && (
          <p className="victory-match">
            Partida: {match.players[0].name} {props.matchWins[0]} × {props.matchWins[1]} {match.players[1].name}
            {props.matchOver && props.champion !== null && (
              <b className={`c${props.champion}`}>{match.players[props.champion].name} venceu a partida!</b>
            )}
          </p>
        )}
        <button className="primary big" onClick={props.onContinue}>
          {props.matchOver ? 'Ver resultado' : 'Próximo jogo'}
        </button>
        <button className="link" onClick={props.onUndo}>
          ↶ Desfazer última ação
        </button>
      </div>
    </div>
  )
}

/** Moeda hextech girando em 3D até mostrar quem foi sorteado. */
export function CoinFlip(props: { names: [string, string]; onResult: (p: PlayerIndex) => void }) {
  const [result] = useState<PlayerIndex>(() => (Math.random() < 0.5 ? 0 : 1))
  const [landed, setLanded] = useState(false)
  const { onResult } = props
  useEffect(() => {
    const t = setTimeout(() => {
      setLanded(true)
      onResult(result)
    }, 1900)
    return () => clearTimeout(t)
  }, [onResult, result])

  return (
    <div className="coin-stage" aria-live="polite">
      <div className={`coin ${result === 1 ? 'tails' : 'heads'}`}>
        <div className="coin-face front">
          <i />
          <span>{props.names[0]}</span>
        </div>
        <div className="coin-face back">
          <i />
          <span>{props.names[1]}</span>
        </div>
      </div>
      {!landed && <span className="hint">Sorteando…</span>}
    </div>
  )
}

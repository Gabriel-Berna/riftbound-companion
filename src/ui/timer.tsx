import { useEffect, useState } from 'react'
import { timeLeft, type MatchAction, type MatchState } from '../engine/match'

/** Relógio que atualiza a cada segundo enquanto o componente está na tela. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Avisa a partida quando o relógio da rodada chega a zero (vale em qualquer tela da partida). */
export function useRoundClock(match: MatchState | null, dispatch: (a: MatchAction) => void): void {
  const running = !!match?.timer?.startedAt && !match.timeUp && match.timer.pausedAt === null
  const now = useNow(running)
  const left = match ? timeLeft(match, now) : null
  useEffect(() => {
    if (running && left !== null && left <= 0) dispatch({ type: 'timeUp' })
  }, [running, left, dispatch])
}

/** Tempo restante da rodada, para exibir. */
export function RoundClock({ match }: { match: MatchState }) {
  const paused = match.timer?.pausedAt != null
  const now = useNow(!!match.timer?.startedAt && !match.timeUp && !paused)
  const left = timeLeft(match, now)
  if (left === null) return null
  const low = left < 5 * 60_000
  return (
    <span className={`round-clock ${low ? 'low' : ''} ${paused ? 'paused' : ''} ${match.timeUp ? 'up' : ''}`}>
      ⏱ {match.timeUp ? 'Tempo esgotado' : formatClock(left)}
      {paused && ' · pausado'}
    </span>
  )
}

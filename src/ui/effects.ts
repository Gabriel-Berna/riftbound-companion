import { useEffect, useRef } from 'react'
import type { GameState } from '../engine/types'
import type { Settings } from '../store'

type Sound = 'hold' | 'conquer' | 'warn' | 'victory' | 'coin'

let audio: AudioContext | null = null

/** Toca uma nota sintetizada (sem arquivos de áudio). */
function tone(ctx: AudioContext, freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.18) {
  const osc = ctx.createOscillator()
  const vol = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  vol.gain.setValueAtTime(0, start)
  vol.gain.linearRampToValueAtTime(gain, start + 0.015)
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(vol).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

export function playSound(sound: Sound): void {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
    const t = audio.currentTime
    switch (sound) {
      case 'hold': // nota única e suave
        tone(audio, 880, t, 0.3, 'triangle')
        break
      case 'conquer': // arpejo curto e brilhante, estilo hextech
        tone(audio, 660, t, 0.18, 'triangle')
        tone(audio, 990, t + 0.06, 0.22, 'triangle')
        tone(audio, 1320, t + 0.12, 0.35, 'triangle')
        break
      case 'warn':
        tone(audio, 330, t, 0.2, 'square', 0.08)
        tone(audio, 262, t + 0.15, 0.3, 'square', 0.08)
        break
      case 'coin':
        tone(audio, 1568, t, 0.08, 'square', 0.05)
        break
      case 'victory': // gongo grave seguido de acorde
        tone(audio, 98, t, 2.2, 'sine', 0.35)
        tone(audio, 196, t, 1.6, 'triangle', 0.12)
        ;[523, 659, 784, 1047].forEach((f, i) => tone(audio!, f, t + 0.25 + i * 0.09, 1.2, 'triangle', 0.1))
        break
    }
  } catch {
    // Sem áudio disponível: segue em silêncio.
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Vibração não suportada (ex.: iPhone).
  }
}

/** Sons e vibração para o que acabou de acontecer no jogo: Hold e Conquer soam e vibram diferente. */
export function useGameFeedback(game: GameState, settings: Settings): void {
  const seen = useRef(game.log.length)
  useEffect(() => {
    const fresh = game.log.slice(seen.current)
    seen.current = game.log.length
    if (fresh.length === 0) return
    const kinds = fresh.map((e) => e.kind)
    const gained = fresh.some((e) => e.kind === 'hold' || e.kind === 'burn-out' || (e.kind === 'points' && e.delta > 0))
    if (kinds.includes('result')) {
      if (settings.sound) playSound('victory')
      if (settings.vibration) vibrate([80, 60, 80, 60, 200])
    } else if (kinds.includes('final-point-blocked') || kinds.includes('time-up')) {
      if (settings.sound) playSound('warn')
      if (settings.vibration) vibrate([30, 60, 30])
    } else if (kinds.includes('conquer')) {
      if (settings.sound) playSound('conquer')
      if (settings.vibration) vibrate([25, 40, 25])
    } else if (gained) {
      if (settings.sound) playSound('hold')
      if (settings.vibration) vibrate(35)
    }
  }, [game, settings])
}

/** Mantém a tela ligada enquanto o componente estiver na tela (Screen Wake Lock API). */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        // Recusado (ex.: bateria fraca): a tela apaga normalmente.
      }
    }
    // O navegador solta a trava quando o app sai de foco; pega de novo ao voltar.
    const onVisible = () => document.visibilityState === 'visible' && void acquire()
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [enabled])
}

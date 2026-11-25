import { describe, expect, it } from 'vitest'
import { launch, MAX_TIME, runBattle, seededRandom, step } from './tops'

describe('batalha de piões (sorteio de quem escolhe começar, TR 407.2)', () => {
  const battles = Array.from({ length: 2000 }, (_, seed) => runBattle(seed))

  it('sempre termina, com um vencedor, até o tempo máximo', () => {
    for (const b of battles) {
      expect(b.winner === 0 || b.winner === 1).toBe(true)
      expect(b.time).toBeLessThanOrEqual(MAX_TIME + 1e-9)
    }
  })

  it('é justa: cada lado vence perto de metade das vezes', () => {
    const wins0 = battles.filter((b) => b.winner === 0).length / battles.length
    expect(wins0).toBeGreaterThan(0.45)
    expect(wins0).toBeLessThan(0.55)
  })

  it('termina de formas variadas e, em geral, em poucos segundos', () => {
    const ends = new Set(battles.map((b) => b.end))
    expect(ends.has('ring-out')).toBe(true)
    expect(ends.has('spin-out') || ends.has('time')).toBe(true)
    const times = battles.map((b) => b.time).sort((x, y) => x - y)
    expect(times[Math.floor(times.length / 2)]).toBeGreaterThan(2)
    expect(times[Math.floor(times.length / 2)]).toBeLessThan(9)
  })

  it('a mesma semente repete a mesma batalha', () => {
    expect(runBattle(42)).toEqual(runBattle(42))
  })

  it('cada passo não altera o estado anterior', () => {
    const random = seededRandom(7)
    const b = launch(random)
    const copy = structuredClone(b)
    step(b, 1 / 60, random)
    expect(b).toEqual(copy)
  })
})

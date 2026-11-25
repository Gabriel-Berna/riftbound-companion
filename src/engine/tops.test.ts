import { describe, expect, it } from 'vitest'
import { launch, MAX_TIME, runBattle, seededRandom, step, type ArenaEventKind } from './tops'

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

  it('termina de formas variadas e dura uns 8 segundos', () => {
    const ends = new Set(battles.map((b) => b.end))
    expect(ends.has('ring-out')).toBe(true)
    expect(ends.has('spin-out') || ends.has('time')).toBe(true)
    const times = battles.map((b) => b.time).sort((x, y) => x - y)
    // Batalhas de uns 8 segundos: tempo para emocionar sem atrasar a partida.
    expect(times[Math.floor(times.length / 2)]).toBeGreaterThan(6)
    expect(times[Math.floor(times.length / 2)]).toBeLessThan(10)
  })

  it('o mais comum é ser arremessado para fora (parede baixa)', () => {
    const ringOuts = battles.filter((b) => b.end === 'ring-out').length / battles.length
    expect(ringOuts).toBeGreaterThan(0.5)
  })

  it('quando um pião para, o vencedor ainda está girando de forma visível', () => {
    const spinOuts = battles.filter((b) => b.end === 'spin-out')
    const clear = spinOuts.filter((b) => b.tops[b.winner!].spin >= 0.05).length / spinOuts.length
    expect(clear).toBeGreaterThan(0.75)
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

describe('piões com eventos', () => {
  const battles = Array.from({ length: 2000 }, (_, seed) => runBattle(seed, { events: true }))

  it('continua justa: os eventos afetam os dois piões do mesmo jeito', () => {
    const wins0 = battles.filter((b) => b.winner === 0).length / battles.length
    expect(wins0).toBeGreaterThan(0.45)
    expect(wins0).toBeLessThan(0.55)
  })

  it('sempre termina, e os quatro eventos acontecem', () => {
    const seen = new Set<ArenaEventKind>()
    for (let seed = 0; seed < 300; seed++) {
      const random = seededRandom(seed)
      let b = launch(random, { events: true })
      while (b.winner === null) {
        b = step(b, 1 / 60, random)
        if (b.event) seen.add(b.event.kind)
      }
      expect(b.time).toBeLessThanOrEqual(MAX_TIME + 1e-9)
    }
    expect([...seen].sort()).toEqual(['baron', 'quake', 'surge', 'wide-pocket'])
  })

  it('a batalha clássica não muda: sem eventos, nenhum sorteio a mais', () => {
    expect(runBattle(42, { events: false })).toEqual(runBattle(42))
    expect(runBattle(42)).not.toHaveProperty('events')
  })
})

import type { PlayerIndex } from './types'

/**
 * Batalha de piões para decidir quem escolhe começar o primeiro jogo (alternativa à moeda, TR 407.2:
 * vale qualquer método aleatório aceito pelos jogadores). Física simples num estádio circular de raio 1:
 * a rampa em cone puxa os piões para o centro, o giro os faz circular, os choques empurram e gastam giro.
 * Perde quem sair pela abertura da borda ou parar de girar. As condições iniciais são sorteadas do mesmo
 * jeito para os dois lados, então a chance de cada um é a mesma.
 */

export interface Top {
  x: number
  y: number
  vx: number
  vy: number
  /** Giro restante, de 1 (lançado) a 0 (parado). */
  spin: number
  /** Ângulo de rotação, só para o desenho. */
  angle: number
  /** Saiu do estádio. */
  out: boolean
}

export type BattleEnd = 'ring-out' | 'spin-out' | 'time'

export interface Battle {
  tops: [Top, Top]
  /** Segundos desde o lançamento. */
  time: number
  /** Choques que aconteceram no último passo (posição), para faíscas e vibração. */
  hits: { x: number; y: number; power: number }[]
  winner: PlayerIndex | null
  end: BattleEnd | null
}

export const TOP_RADIUS = 0.13
/** Aberturas na borda do estádio (ângulos em radianos) e a meia largura de cada uma. */
export const POCKETS = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3]
export const POCKET_HALF_WIDTH = 0.3
/** Depois disso, vence quem tiver mais giro. */
export const MAX_TIME = 14

const SLOPE = 2.0
const ORBIT = 0.2
const DRAG = 0.5
const SPIN_DECAY = 0.07
/** Velocidade para fora necessária para escapar por uma abertura. */
const ESCAPE_SPEED = 0.8
/** Logo depois do lançamento ninguém sai do estádio: a batalha precisa acontecer. */
const GRACE = 2.5

/** Gerador pseudoaleatório com semente (mulberry32): a mesma semente dá a mesma batalha. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Lançamento: lados opostos do estádio, ângulo, força e giro sorteados igualmente para os dois. */
export function launch(random: () => number): Battle {
  const base = random() * Math.PI * 2
  const top = (side: number): Top => {
    const a = base + side * Math.PI + (random() - 0.5) * 0.6
    const r = 0.55 + random() * 0.2
    const speed = 0.8 + random() * 0.6
    // Lançado meio de lado, em direção ao centro: os dois se cruzam logo.
    const dir = a + Math.PI + (random() - 0.5) * 0.7
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed, spin: 0.85 + random() * 0.15, angle: 0, out: false }
  }
  return { tops: [top(0), top(1)], time: 0, hits: [], winner: null, end: null }
}

const inPocket = (angle: number) =>
  POCKETS.some((p) => Math.abs(Math.atan2(Math.sin(angle - p), Math.cos(angle - p))) < POCKET_HALF_WIDTH)

/** Avança a batalha `dt` segundos. Não muda o estado recebido. */
export function step(b: Battle, dt: number, random: () => number): Battle {
  if (b.winner !== null) return b
  const tops = b.tops.map((t) => ({ ...t })) as [Top, Top]
  const hits: Battle['hits'] = []

  for (const t of tops) {
    if (t.out) continue
    const r = Math.hypot(t.x, t.y) || 1e-6
    // Rampa para o centro, giro que faz o pião circular e um tremor leve; piões fracos perdem força.
    const strength = 0.35 + 0.65 * t.spin
    // Estádio em cone (inclinação constante): piões com giros diferentes dão voltas em tempos diferentes e se alcançam.
    const pull = SLOPE / Math.max(r, 0.2)
    t.vx += (-pull * t.x - ORBIT * strength * (t.y / r) + (random() - 0.5) * 0.8) * dt
    t.vy += (-pull * t.y + ORBIT * strength * (t.x / r) + (random() - 0.5) * 0.8) * dt
    const drag = 1 - DRAG * dt
    t.vx *= drag
    t.vy *= drag
    t.x += t.vx * dt
    t.y += t.vy * dt
    t.angle += (6 + 30 * t.spin) * dt
    t.spin = Math.max(0, t.spin - (SPIN_DECAY + 0.02 * Math.hypot(t.vx, t.vy)) * dt)

    // Borda: escapa pela abertura com velocidade para fora suficiente; senão, quica na parede.
    const dist = Math.hypot(t.x, t.y)
    if (dist > 1 - TOP_RADIUS) {
      const nx = t.x / dist
      const ny = t.y / dist
      const outward = t.vx * nx + t.vy * ny
      if (b.time > GRACE && inPocket(Math.atan2(t.y, t.x)) && outward > ESCAPE_SPEED) {
        t.out = true
        continue
      }
      t.x = nx * (1 - TOP_RADIUS)
      t.y = ny * (1 - TOP_RADIUS)
      if (outward > 0) {
        t.vx -= 1.6 * outward * nx
        t.vy -= 1.6 * outward * ny
      }
    }
  }

  // Choque entre os piões: empurrão proporcional ao giro de quem bate, e os dois perdem giro.
  const [a, c] = tops
  const dx = c.x - a.x
  const dy = c.y - a.y
  const dist = Math.hypot(dx, dy)
  if (!a.out && !c.out && dist < 2 * TOP_RADIUS && dist > 0) {
    const nx = dx / dist
    const ny = dy / dist
    const overlap = 2 * TOP_RADIUS - dist
    a.x -= (nx * overlap) / 2
    a.y -= (ny * overlap) / 2
    c.x += (nx * overlap) / 2
    c.y += (ny * overlap) / 2
    const closing = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny
    if (closing > 0) {
      const kickA = (0.5 + random()) * (0.4 + c.spin)
      const kickC = (0.5 + random()) * (0.4 + a.spin)
      a.vx -= nx * (closing + kickA)
      a.vy -= ny * (closing + kickA)
      c.vx += nx * (closing + kickC)
      c.vy += ny * (closing + kickC)
      // As duas perdas usam o giro de antes do choque: calcular uma depois da outra favoreceria um lado.
      const [spinA, spinC] = [a.spin, c.spin]
      a.spin = Math.max(0, spinA - (0.04 + 0.1 * random()) * spinC)
      c.spin = Math.max(0, spinC - (0.04 + 0.1 * random()) * spinA)
      hits.push({ x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, power: closing })
    }
  }

  const time = b.time + dt
  // Empate exato (os dois saem ou param no mesmo instante) é decidido no sorteio, para não favorecer um lado.
  const weaker = (): PlayerIndex => (a.spin === c.spin ? (random() < 0.5 ? 0 : 1) : a.spin < c.spin ? 0 : 1)
  const loser = (cond: (t: Top) => boolean): PlayerIndex | null => {
    const l0 = cond(a)
    const l1 = cond(c)
    if (l0 && l1) return weaker()
    return l0 ? 0 : l1 ? 1 : null
  }
  let end: BattleEnd | null = null
  let lost = loser((t) => t.out)
  if (lost !== null) end = 'ring-out'
  else if ((lost = loser((t) => t.spin <= 0)) !== null) end = 'spin-out'
  else if (time >= MAX_TIME) {
    lost = weaker()
    end = 'time'
  }
  return { tops, time, hits, winner: lost === null ? null : lost === 0 ? 1 : 0, end }
}

/** Roda a batalha inteira (para testes e para quem prefere menos movimento na tela). */
export function runBattle(seed: number, dt = 1 / 60): Battle {
  const random = seededRandom(seed)
  let b = launch(random)
  while (b.winner === null) b = step(b, dt, random)
  return b
}

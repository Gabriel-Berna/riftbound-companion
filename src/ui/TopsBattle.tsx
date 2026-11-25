import { useEffect, useRef, useState } from 'react'
import {
  BARON_RADIUS,
  launch,
  POCKET_HALF_WIDTH,
  POCKETS,
  runBattle,
  seededRandom,
  step,
  TOP_RADIUS,
  visualSpinSpeed,
  WIDE_POCKET_HALF_WIDTH,
  type ArenaEventKind,
  type Battle,
  type BattleEnd,
} from '../engine/tops'
import { DOMAINS, type Domain, type PlayerIndex } from '../engine/types'
import { DOMAIN_COLORS, POWER_LABELS } from './text'

type Phase = 'pick' | 'countdown' | 'battle' | 'replay' | 'done'

const DT = 1 / 60
/** Depois do resultado, por quanto tempo o vencedor continua girando antes do placar (s). */
const FINALE = 1.4
/** O replay mostra os últimos segundos da batalha (e o encerramento) nesta velocidade. */
const REPLAY_SECONDS = 2
const REPLAY_SPEED = 0.3

const END_TEXT: Record<BattleEnd, (loser: string) => string> = {
  'ring-out': (loser) => `O pião de ${loser} foi arremessado para fora do estádio`,
  'spin-out': (loser) => `O pião de ${loser} parou de girar`,
  time: () => 'O pião vencedor girou por mais tempo',
}

const EVENT_TEXT: Record<ArenaEventKind, string> = {
  quake: '⚡ O estádio está tremendo!',
  'wide-pocket': '⚠ Uma abertura se alargou!',
  baron: '👁 O Barão apareceu no centro!',
  surge: '✨ Onda de energia: giro renovado!',
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

/** Como desenhar o perdedor depois do resultado: parado (tombado) ou voando para fora do estádio. */
interface Finale {
  loser: PlayerIndex
  /** Posição do pião arremessado, que segue em frente para fora da borda. */
  fly?: { x: number; y: number }
  /** 0 no resultado, 1 no fim do encerramento. */
  t: number
}

/** Um quadro desenhado, guardado para o replay. */
interface Frame {
  b: Battle
  sparks: Spark[]
  finale?: Finale
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Número de lâminas de cada formato: define o período do borrão de movimento. */
const BLADES: Record<Domain, number> = { fury: 3, calm: 4, mind: 3, body: 6, chaos: 5, order: 4 }

const polar = (r: number, a: number): [number, number] => [Math.cos(a) * r, Math.sin(a) * r]

/**
 * Formato do pião por domínio: Fury com lâminas pontudas, Calm com pétalas, Mind com luas crescentes,
 * Body como uma engrenagem pesada, Chaos com lâminas irregulares e Order como uma estrela simétrica.
 * `outline` desenha o contorno claro (só quando as lâminas estão nítidas).
 */
function drawBlades(ctx: CanvasRenderingContext2D, r: number, domain: Domain, color: string, outline: boolean) {
  ctx.fillStyle = color
  ctx.strokeStyle = '#f9eddc'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  const n = BLADES[domain]
  const step = (Math.PI * 2) / n
  for (let k = 0; k < n; k++) {
    const a = k * step
    switch (domain) {
      case 'fury': // ganchos pontudos
        ctx.moveTo(...polar(r * 0.3, a))
        ctx.lineTo(...polar(r * 1.2, a + 0.35))
        ctx.lineTo(...polar(r * 0.8, a + 0.95))
        ctx.lineTo(...polar(r * 0.42, a + 1.35))
        ctx.closePath()
        break
      case 'calm': {
        // pétalas arredondadas
        const [px, py] = polar(r * 0.62, a)
        ctx.moveTo(px + Math.cos(a) * r * 0.45, py + Math.sin(a) * r * 0.45)
        ctx.ellipse(px, py, r * 0.45, r * 0.27, a, 0, Math.PI * 2)
        break
      }
      case 'mind': // luas crescentes
        ctx.moveTo(...polar(r * 0.45, a))
        ctx.arc(0, 0, r * 1.05, a + 0.15, a + 1.55)
        ctx.quadraticCurveTo(...polar(r * 0.6, a + 1.2), ...polar(r * 0.45, a))
        ctx.closePath()
        break
      case 'body': {
        // engrenagem: dentes largos e baixos
        const half = step / 4
        ctx.moveTo(...polar(r * 0.78, a - half * 2))
        ctx.lineTo(...polar(r * 0.78, a - half))
        ctx.lineTo(...polar(r * 1.05, a - half * 0.8))
        ctx.lineTo(...polar(r * 1.05, a + half * 0.8))
        ctx.lineTo(...polar(r * 0.78, a + half))
        ctx.lineTo(...polar(r * 0.78, a + half * 2))
        ctx.lineTo(...polar(r * 0.4, a + half * 2))
        ctx.lineTo(...polar(r * 0.4, a - half * 2))
        ctx.closePath()
        break
      }
      case 'chaos': {
        // lâminas tortas, cada uma de um tamanho
        const len = [1.18, 0.82, 1.05, 0.7, 0.95][k]
        ctx.moveTo(...polar(r * 0.35, a - 0.2))
        ctx.lineTo(...polar(r * len, a + 0.1 + (k % 2) * 0.25))
        ctx.lineTo(...polar(r * len * 0.6, a + 0.45))
        ctx.lineTo(...polar(r * 0.4, a + 0.6))
        ctx.closePath()
        break
      }
      case 'order': // estrela de quatro pontas, simétrica
        ctx.moveTo(...polar(r * 0.42, a - step / 2))
        ctx.lineTo(...polar(r * 1.15, a))
        ctx.lineTo(...polar(r * 0.42, a + step / 2))
        ctx.closePath()
        break
    }
  }
  ctx.fill()
  if (outline) ctx.stroke()
}

/**
 * Desenha o estádio, os eventos, os piões e as faíscas. Coordenadas da batalha: estádio de raio 1 no centro.
 * `timeScale` < 1 é a câmera lenta do replay: o borrão de movimento diminui e as lâminas aparecem.
 */
function draw(ctx: CanvasRenderingContext2D, size: number, frame: Frame, domains: [Domain, Domain], timeScale = 1) {
  const { b, sparks, finale } = frame
  const colors = domains.map((d) => DOMAIN_COLORS[d])
  // Margem em volta do estádio, para ver o pião arremessado saindo.
  const R = size * 0.4
  const event = b.event
  // Terremoto: tudo treme.
  const shake = event?.kind === 'quake' ? 4 : 0
  const cx = size / 2 + Math.sin(b.time * 71) * shake
  const cy = size / 2 + Math.cos(b.time * 53) * shake
  ctx.clearRect(0, 0, size, size)

  // Fundo em cone: mais claro no centro, escuro na borda, com anéis.
  const bowl = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R)
  bowl.addColorStop(0, '#2a5b68')
  bowl.addColorStop(0.7, '#123540')
  bowl.addColorStop(1, '#081a20')
  ctx.fillStyle = bowl
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(200, 170, 110, 0.12)'
  ctx.lineWidth = 1
  for (const f of [0.25, 0.5, 0.75]) {
    ctx.beginPath()
    ctx.arc(cx, cy, R * f, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Borda dourada, interrompida nas aberturas (por onde se perde por ring-out).
  const width = (i: number) => (event?.kind === 'wide-pocket' && event.pocket === i ? WIDE_POCKET_HALF_WIDTH : POCKET_HALF_WIDTH)
  const gaps = POCKETS.map((p, i) => [p - width(i), p + width(i), i] as const).sort((x, y) => x[0] - y[0])
  ctx.lineWidth = 3
  ctx.strokeStyle = '#c8aa6e'
  ctx.shadowColor = 'rgba(200, 170, 110, 0.6)'
  ctx.shadowBlur = 8
  gaps.forEach(([, end], i) => {
    const next = gaps[(i + 1) % gaps.length][0] + (i + 1 === gaps.length ? Math.PI * 2 : 0)
    ctx.beginPath()
    ctx.arc(cx, cy, R, end, next)
    ctx.stroke()
  })
  ctx.shadowBlur = 0
  for (const [start, end, i] of gaps) {
    const widened = width(i) !== POCKET_HALF_WIDTH
    ctx.strokeStyle = widened ? `rgba(239, 125, 0, ${0.6 + 0.4 * Math.sin(b.time * 12)})` : 'rgba(239, 125, 0, 0.55)'
    ctx.lineWidth = widened ? 6 : 3
    ctx.beginPath()
    ctx.arc(cx, cy, R + 2, start, end)
    ctx.stroke()
  }

  // Barão no centro: um olho roxo que arremessa quem chega perto.
  if (event?.kind === 'baron') {
    const br = BARON_RADIUS * R
    const glow = ctx.createRadialGradient(cx, cy, br * 0.2, cx, cy, br * 1.4)
    glow.addColorStop(0, '#d9a6ff')
    glow.addColorStop(0.55, '#7a3fb8')
    glow.addColorStop(1, 'rgba(122, 63, 184, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cx, cy, br * 1.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1b0b2b'
    ctx.beginPath()
    ctx.ellipse(cx, cy, br * 0.55, br * 0.25 * (0.6 + 0.4 * Math.abs(Math.sin(b.time * 2))), 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f2c94c'
    ctx.beginPath()
    ctx.arc(cx, cy, br * 0.12, 0, Math.PI * 2)
    ctx.fill()
  }

  b.tops.forEach((t, i) => {
    const r = TOP_RADIUS * R
    const flying = t.out && finale?.loser === i && finale.fly
    if (t.out && !flying) return
    // Perdedor parado: tomba (achatado), cinza e sem girar.
    const stopped = !t.out && t.spin <= 0
    // Pião fraco bambeia antes de parar.
    const wobble = !stopped && t.spin < 0.3 ? (0.3 - t.spin) * r * 0.6 : 0
    const px = flying ? finale.fly!.x : t.x
    const py = flying ? finale.fly!.y : t.y
    const x = cx + px * R + Math.sin(b.time * 23 + i) * wobble
    const y = cy + py * R + Math.cos(b.time * 19 + i) * wobble
    ctx.save()
    ctx.translate(x, y)
    if (flying) {
      ctx.globalAlpha = Math.max(0, 1 - finale.t * 1.3)
      ctx.scale(1 - finale.t * 0.4, 1 - finale.t * 0.4)
    }
    // Onda de energia: brilho em volta dos piões.
    if (event?.kind === 'surge' && !stopped) {
      ctx.strokeStyle = `rgba(120, 255, 220, ${0.5 + 0.3 * Math.sin(b.time * 20)})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.beginPath()
    ctx.ellipse(3, 4, r, r * 0.9, 0, 0, Math.PI * 2)
    ctx.fill()
    if (stopped) {
      ctx.rotate(0.5)
      ctx.scale(1, 0.62)
      ctx.filter = 'grayscale(0.75) brightness(0.7)'
    }
    // Borrão de movimento: o pião é desenhado várias vezes ao longo do ângulo que percorre num quadro.
    // Lançado, as lâminas viram um disco com rastros; só ficam nítidas quando ele perde força (ou na câmera lenta).
    const period = (Math.PI * 2) / BLADES[domains[i]]
    const sweep = stopped || flying ? 0 : Math.min(period, (visualSpinSpeed(t.spin) * timeScale) / 60)
    const blur = sweep / period
    const copies = 1 + Math.min(9, Math.floor(sweep / 0.12))
    ctx.rotate(t.angle)
    if (blur > 0.25) {
      ctx.globalAlpha *= 0.55 * blur
      ctx.fillStyle = colors[i]
      ctx.beginPath()
      ctx.arc(0, 0, r * 1.02, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha /= 0.55 * blur
    }
    const baseAlpha = ctx.globalAlpha
    for (let c = 0; c < copies; c++) {
      ctx.save()
      ctx.rotate((-sweep * c) / copies)
      ctx.globalAlpha = baseAlpha * Math.min(1, 1.8 / copies) * (c === 0 ? 1 : 0.8)
      drawBlades(ctx, r, domains[i], colors[i], c === 0 && blur < 0.5)
      ctx.restore()
    }
    ctx.globalAlpha = baseAlpha
    // Rastros claros em arco, mais fortes quanto mais rápido.
    if (blur > 0.3) {
      ctx.strokeStyle = `rgba(249, 237, 220, ${0.55 * blur})`
      ctx.lineWidth = 2
      for (const start of [0, Math.PI]) {
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.85, start, start + 1.4)
        ctx.stroke()
      }
    }
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2)
    ctx.strokeStyle = colors[i]
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#f9eddc'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = colors[i]
    ctx.beginPath()
    ctx.arc(r * 0.12, 0, r * 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })

  for (const s of sparks) {
    ctx.fillStyle = `rgba(255, ${150 + Math.round(100 * s.life)}, 60, ${s.life})`
    ctx.beginPath()
    ctx.arc(cx + s.x * R, cy + s.y * R, 2 + 2 * s.life, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Cor inicial de cada jogador: o primeiro domínio da lenda, sem repetir a do oponente. */
function defaultColors(domains: [Domain[] | undefined, Domain[] | undefined]): [Domain, Domain] {
  const first: Domain = domains[0]?.[0] ?? 'mind'
  const second: Domain = domains[1]?.find((d) => d !== first) ?? (first === 'fury' ? 'mind' : 'fury')
  return [first, second]
}

/** Prévia do pião na escolha de cor/formato. */
function TopPreview({ domain }: { domain: Domain }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const dpr = window.devicePixelRatio || 1
    el.width = 44 * dpr
    el.height = 44 * dpr
    const ctx = el.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.translate(22, 22)
    drawBlades(ctx, 17, domain, DOMAIN_COLORS[domain], true)
    ctx.fillStyle = '#f9eddc'
    ctx.beginPath()
    ctx.arc(0, 0, 5, 0, Math.PI * 2)
    ctx.fill()
  }, [domain])
  return <canvas ref={ref} style={{ width: 44, height: 44 }} aria-hidden="true" />
}

/**
 * Batalha de piões em tela cheia: cada jogador escolhe a cor (e o formato) do seu pião, os dois são lançados e
 * quem vencer decide quem começa o primeiro jogo. `withEvents` liga os eventos no estádio.
 */
export function TopsBattle(props: {
  names: [string, string]
  legendDomains: [Domain[] | undefined, Domain[] | undefined]
  withEvents?: boolean
  onResult: (winner: PlayerIndex) => void
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<Phase>('pick')
  const [colors, setColors] = useState<[Domain, Domain]>(() => defaultColors(props.legendDomains))
  const [count, setCount] = useState(3)
  const [result, setResult] = useState<Battle | null>(null)
  const [banner, setBanner] = useState<ArenaEventKind | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  // Quadros guardados para o replay: os últimos segundos da batalha e o encerramento.
  const frames = useRef<Frame[]>([])
  const [size] = useState(() => Math.min(420, Math.round(window.innerWidth * 0.98)))
  const hex: [string, string] = [DOMAIN_COLORS[colors[0]], DOMAIN_COLORS[colors[1]]]
  const events = !!props.withEvents

  const context = () => {
    const el = canvas.current
    if (!el) return null
    const dpr = window.devicePixelRatio || 1
    el.width = size * dpr
    el.height = size * dpr
    const ctx = el.getContext('2d')!
    ctx.scale(dpr, dpr)
    return ctx
  }

  // Contagem regressiva: 3, 2, 1, lançar.
  useEffect(() => {
    if (phase !== 'countdown') return
    if (count === 0) {
      setPhase('battle')
      return
    }
    const t = setTimeout(() => setCount((c) => c - 1), 650)
    return () => clearTimeout(t)
  }, [phase, count])

  // Estádio parado na contagem; a batalha em si roda a 60 passos por segundo, independente da tela.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'battle') return
    const ctx = context()
    if (!ctx) return
    const random = seededRandom(Math.floor(Math.random() * 2 ** 31))
    let b = launch(random, { events })
    if (phase === 'countdown') {
      draw(ctx, size, { b: { ...b, tops: [{ ...b.tops[0], x: -0.6, y: 0 }, { ...b.tops[1], x: 0.6, y: 0 }] }, sparks: [] }, colors)
      return
    }
    if (reducedMotion()) {
      const final = runBattle(Math.floor(Math.random() * 2 ** 31), { events })
      draw(ctx, size, { b: final, sparks: [] }, colors)
      setResult(final)
      setPhase('done')
      return
    }
    frames.current = []
    let sparks: Spark[] = []
    let finale: (Finale & { vx: number; vy: number }) | null = null
    let shownEvent: ArenaEventKind | null = null
    let frame = 0
    let last = performance.now()
    let acc = 0
    const tick = (now: number) => {
      acc += Math.min(0.1, (now - last) / 1000)
      last = now
      while (acc >= DT && b.winner === null) {
        b = step(b, DT, random)
        acc -= DT
        for (const h of b.hits)
          for (let k = 0; k < 10 + h.power * 10; k++) {
            const a = Math.random() * Math.PI * 2
            const v = 0.4 + Math.random() * 1.2
            sparks.push({ x: h.x, y: h.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 })
          }
        if (b.hits.length) navigator.vibrate?.(20)
      }
      sparks = sparks.map((s) => ({ ...s, x: s.x + s.vx * DT, y: s.y + s.vy * DT, life: s.life - 2 * DT })).filter((s) => s.life > 0)
      const kind = b.event?.kind ?? null
      if (kind !== shownEvent) {
        shownEvent = kind
        setBanner(kind)
      }

      // Encerramento: o vencedor segue girando; o perdedor fica parado ou sai voando pela borda.
      if (b.winner !== null) {
        const loser: PlayerIndex = b.winner === 0 ? 1 : 0
        if (!finale) {
          const l = b.tops[loser]
          const speed = Math.max(1.2, Math.hypot(l.vx, l.vy))
          const dir = Math.atan2(l.y, l.x)
          finale = { loser, t: 0, fly: l.out ? { x: l.x, y: l.y } : undefined, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed }
          setResult(b)
        }
        finale.t = Math.min(1, finale.t + DT / FINALE)
        if (finale.fly) finale.fly = { x: finale.fly.x + finale.vx * DT, y: finale.fly.y + finale.vy * DT }
        const w = b.tops[b.winner]
        b = { ...b, time: b.time + DT, tops: b.tops.map((t, i) => (i === b.winner ? { ...w, angle: w.angle + visualSpinSpeed(w.spin) * DT } : t)) as Battle['tops'] }
      }
      const current: Frame = { b, sparks, finale: finale ? { loser: finale.loser, t: finale.t, fly: finale.fly } : undefined }
      draw(ctx, size, current, colors)
      // Guarda só o trecho final da batalha (e todo o encerramento) para o replay.
      frames.current.push(current)
      if (!finale) {
        const cut = frames.current.findIndex((f) => f.b.time >= b.time - REPLAY_SECONDS)
        if (cut > 0) frames.current.splice(0, cut)
      }
      if (finale && finale.t >= 1) {
        setBanner(null)
        setPhase('replay')
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // As cores e o modo não mudam depois do lançamento, então não precisam reiniciar a batalha.
  }, [phase, size])

  // Replay em câmera lenta dos últimos segundos; um toque pula.
  useEffect(() => {
    if (phase !== 'replay') return
    const ctx = context()
    const list = frames.current
    if (!ctx || list.length === 0) {
      setPhase('done')
      return
    }
    let pos = 0
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      // Avança no ritmo em que os quadros foram gravados (60 por segundo), na velocidade do replay.
      pos += ((now - last) / 1000) * 60 * REPLAY_SPEED
      last = now
      draw(ctx, size, list[Math.min(list.length - 1, Math.floor(pos))], colors, REPLAY_SPEED)
      if (pos >= list.length - 1) {
        setPhase('done')
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase, size])

  // No placar final, o estádio fica no último quadro.
  useEffect(() => {
    if (phase !== 'done') return
    const last = frames.current.at(-1)
    const ctx = last && context()
    if (ctx && last) draw(ctx, size, last, colors)
  }, [phase, size])

  const winner = result?.winner ?? null
  const loser = winner === null ? null : winner === 0 ? 1 : 0
  const title = events ? 'Piões com eventos' : 'Batalha de piões'

  return (
    <div className="tops-overlay" role="dialog" aria-label={title}>
      {phase === 'pick' ? (
        <div className="tops-pick">
          <h2>{title}</h2>
          <p className="hint">
            Cada um escolhe o seu pião: cada domínio tem uma cor e um formato. Quem vencer decide quem começa.
            {events && ' Durante a batalha, eventos no estádio afetam os dois piões.'}
          </p>
          {([0, 1] as const).map((p) => (
            <div key={p} className="tops-player">
              <b className={`c${p}`}>{props.names[p]}</b>
              <div className="tops-swatches" role="radiogroup" aria-label={`Pião de ${props.names[p]}`}>
                {DOMAINS.map((d) => {
                  const taken = colors[p === 0 ? 1 : 0] === d
                  return (
                    <button
                      key={d}
                      role="radio"
                      aria-checked={colors[p] === d}
                      aria-label={POWER_LABELS[d]}
                      disabled={taken}
                      className={`tops-swatch ${colors[p] === d ? 'on' : ''}`}
                      onClick={() => setColors((c) => (p === 0 ? [d, c[1]] : [c[0], d]))}
                    >
                      <TopPreview domain={d} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <button className="primary big" onClick={() => setPhase('countdown')}>
            🌀 Lançar!
          </button>
          <button className="link" onClick={props.onCancel}>
            Voltar
          </button>
        </div>
      ) : (
        <div className="tops-arena">
          <div className="tops-names">
            {([0, 1] as const).map((p) => (
              <span key={p} className="tops-gauge">
                <i style={{ background: hex[p] }} /> {props.names[p]}
              </span>
            ))}
          </div>
          <div
            className={`tops-stage ${phase === 'replay' ? 'replaying' : ''}`}
            style={{ width: size, height: size }}
            onClick={() => phase === 'replay' && setPhase('done')}
          >
            <canvas ref={canvas} style={{ width: size, height: size }} aria-hidden="true" />
            {phase === 'countdown' && (
              <span key={count} className="tops-count">
                {count > 0 ? count : 'Lançar!'}
              </span>
            )}
            {phase === 'battle' && banner && (
              <span key={banner} className="tops-event" role="status">
                {EVENT_TEXT[banner]}
              </span>
            )}
            {phase === 'replay' && (
              <>
                <span className="tops-replay-tag">● Replay</span>
                <span className="tops-replay-skip">Toque para pular</span>
              </>
            )}
          </div>
          {phase === 'done' && result && winner !== null && loser !== null && (
            <div className="tops-result" aria-live="polite">
              <span className="tops-winner">
                <i style={{ background: hex[winner] }} /> <b style={{ color: hex[winner] }}>{props.names[winner]}</b> venceu!
              </span>
              <small>{END_TEXT[result.end!](props.names[loser])}</small>
              <button className="primary big" onClick={() => props.onResult(winner)}>
                {props.names[winner]} decide quem começa
              </button>
              {frames.current.length > 0 && (
                <button className="link" onClick={() => setPhase('replay')}>
                  🎬 Ver o replay de novo
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

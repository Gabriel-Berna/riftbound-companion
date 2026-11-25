import { useEffect, useRef, useState } from 'react'
import { launch, POCKET_HALF_WIDTH, POCKETS, runBattle, seededRandom, step, TOP_RADIUS, visualSpinSpeed, type Battle, type BattleEnd } from '../engine/tops'
import { DOMAINS, type Domain, type PlayerIndex } from '../engine/types'
import { DOMAIN_COLORS, POWER_LABELS } from './text'

type Phase = 'pick' | 'countdown' | 'battle' | 'done'

const DT = 1 / 60
/** Depois do resultado, por quanto tempo o vencedor continua girando antes do placar (s). */
const FINALE = 1.4
const END_TEXT: Record<BattleEnd, (loser: string) => string> = {
  'ring-out': (loser) => `O pião de ${loser} foi arremessado para fora do estádio`,
  'spin-out': (loser) => `O pião de ${loser} parou de girar`,
  time: () => 'O pião vencedor girou por mais tempo',
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

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Desenha o estádio, os piões e as faíscas. Coordenadas da batalha: estádio de raio 1 no centro. */
function draw(ctx: CanvasRenderingContext2D, size: number, b: Battle, colors: [string, string], sparks: Spark[], finale?: Finale) {
  // Margem em volta do estádio, para ver o pião arremessado saindo.
  const R = size * 0.4
  const cx = size / 2
  const cy = size / 2
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
  ctx.lineWidth = 3
  ctx.strokeStyle = '#c8aa6e'
  ctx.shadowColor = 'rgba(200, 170, 110, 0.6)'
  ctx.shadowBlur = 8
  const gaps = POCKETS.map((p) => [p - POCKET_HALF_WIDTH, p + POCKET_HALF_WIDTH]).sort((x, y) => x[0] - y[0])
  gaps.forEach(([, end], i) => {
    const next = gaps[(i + 1) % gaps.length][0] + (i + 1 === gaps.length ? Math.PI * 2 : 0)
    ctx.beginPath()
    ctx.arc(cx, cy, R, end, next)
    ctx.stroke()
  })
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(239, 125, 0, 0.55)'
  ctx.lineWidth = 3
  for (const [start, end] of gaps) {
    ctx.beginPath()
    ctx.arc(cx, cy, R + 2, start, end)
    ctx.stroke()
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
    // Lançado, as lâminas viram um disco com rastros; só ficam nítidas quando ele perde força.
    const sweep = stopped || flying ? 0 : Math.min((Math.PI * 2) / 3, visualSpinSpeed(t.spin) / 60)
    const blur = sweep / ((Math.PI * 2) / 3)
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
      drawBlades(ctx, r, colors[i], c === 0 && blur < 0.5)
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
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2)
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

/** Três lâminas na cor do pião; `outline` desenha o contorno claro (só quando as lâminas estão nítidas). */
function drawBlades(ctx: CanvasRenderingContext2D, r: number, color: string, outline: boolean) {
  ctx.fillStyle = color
  ctx.strokeStyle = '#f9eddc'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3
    ctx.moveTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35)
    ctx.quadraticCurveTo(Math.cos(a + 0.5) * r * 1.15, Math.sin(a + 0.5) * r * 1.15, Math.cos(a + 1.3) * r, Math.sin(a + 1.3) * r)
    ctx.lineTo(Math.cos(a + 1.6) * r * 0.45, Math.sin(a + 1.6) * r * 0.45)
  }
  ctx.closePath()
  ctx.fill()
  if (outline) ctx.stroke()
}

/** Cor inicial de cada jogador: o primeiro domínio da lenda, sem repetir a do oponente. */
function defaultColors(domains: [Domain[] | undefined, Domain[] | undefined]): [Domain, Domain] {
  const first: Domain = domains[0]?.[0] ?? 'mind'
  const second: Domain = domains[1]?.find((d) => d !== first) ?? (first === 'fury' ? 'mind' : 'fury')
  return [first, second]
}

/**
 * Batalha de piões em tela cheia: cada jogador escolhe a cor do seu pião, os dois são lançados e
 * quem vencer decide quem começa o primeiro jogo.
 */
export function TopsBattle(props: {
  names: [string, string]
  legendDomains: [Domain[] | undefined, Domain[] | undefined]
  onResult: (winner: PlayerIndex) => void
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<Phase>('pick')
  const [colors, setColors] = useState<[Domain, Domain]>(() => defaultColors(props.legendDomains))
  const [count, setCount] = useState(3)
  const [result, setResult] = useState<Battle | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size] = useState(() => Math.min(420, Math.round(window.innerWidth * 0.98)))
  const hex: [string, string] = [DOMAIN_COLORS[colors[0]], DOMAIN_COLORS[colors[1]]]

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
    const el = canvas.current
    if (!el || (phase !== 'countdown' && phase !== 'battle')) return
    const dpr = window.devicePixelRatio || 1
    el.width = size * dpr
    el.height = size * dpr
    const ctx = el.getContext('2d')!
    ctx.scale(dpr, dpr)
    const random = seededRandom(Math.floor(Math.random() * 2 ** 31))
    let b = launch(random)
    if (phase === 'countdown') {
      draw(ctx, size, { ...b, tops: [{ ...b.tops[0], x: -0.6, y: 0 }, { ...b.tops[1], x: 0.6, y: 0 }] }, hex, [])
      return
    }
    if (reducedMotion()) {
      const final = runBattle(Math.floor(Math.random() * 2 ** 31))
      draw(ctx, size, final, hex, [])
      setResult(final)
      setPhase('done')
      return
    }
    let sparks: Spark[] = []
    let finale: (Finale & { vx: number; vy: number }) | null = null
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
      draw(ctx, size, b, hex, sparks, finale ?? undefined)
      if (finale && finale.t >= 1) {
        setPhase('done')
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // As cores não mudam depois da escolha, então não precisam reiniciar a batalha.
  }, [phase, size])

  const winner = result?.winner ?? null
  const loser = winner === null ? null : winner === 0 ? 1 : 0

  return (
    <div className="tops-overlay" role="dialog" aria-label="Batalha de piões">
      {phase === 'pick' ? (
        <div className="tops-pick">
          <h2>Batalha de piões</h2>
          <p className="hint">Cada um escolhe a cor do seu pião. Quem vencer decide quem começa.</p>
          {([0, 1] as const).map((p) => (
            <div key={p} className="tops-player">
              <b className={`c${p}`}>{props.names[p]}</b>
              <div className="tops-swatches" role="radiogroup" aria-label={`Cor do pião de ${props.names[p]}`}>
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
                      style={{ background: DOMAIN_COLORS[d] }}
                      onClick={() => setColors((c) => (p === 0 ? [d, c[1]] : [c[0], d]))}
                    />
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
          <div className="tops-stage" style={{ width: size, height: size }}>
            <canvas ref={canvas} style={{ width: size, height: size }} aria-hidden="true" />
            {phase === 'countdown' && (
              <span key={count} className="tops-count">
                {count > 0 ? count : 'Lançar!'}
              </span>
            )}
          </div>
          {phase === 'done' && result && winner !== null && loser !== null && (
            <div className="tops-result" aria-live="polite">
              <span className="tops-winner">
                <i style={{ background: hex[winner] }} /> <b style={{ color: hex[winner] }}>{props.names[winner]}</b> venceu!
              </span>
              <small>
                {END_TEXT[result.end!](props.names[loser])}
              </small>
              <button className="primary big" onClick={() => props.onResult(winner)}>
                {props.names[winner]} decide quem começa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

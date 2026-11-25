import { useEffect, useRef, useState } from 'react'
import { launch, POCKET_HALF_WIDTH, POCKETS, runBattle, seededRandom, step, TOP_RADIUS, type Battle, type BattleEnd } from '../engine/tops'
import { DOMAINS, type Domain, type PlayerIndex } from '../engine/types'
import { DOMAIN_COLORS, POWER_LABELS } from './text'

type Phase = 'pick' | 'countdown' | 'battle' | 'done'

const DT = 1 / 60
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

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Desenha o estádio, os piões e as faíscas. Coordenadas da batalha: estádio de raio 1 no centro. */
function draw(ctx: CanvasRenderingContext2D, size: number, b: Battle, colors: [string, string], sparks: Spark[]) {
  const R = size / 2 - 6
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
  ctx.lineWidth = 5
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
    if (t.out) return
    const r = TOP_RADIUS * R
    // Pião fraco bambeia antes de parar.
    const wobble = t.spin < 0.3 ? (0.3 - t.spin) * r * 0.6 : 0
    const x = cx + t.x * R + Math.sin(b.time * 23 + i) * wobble
    const y = cy + t.y * R + Math.cos(b.time * 19 + i) * wobble
    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.beginPath()
    ctx.ellipse(3, 4, r, r * 0.9, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.rotate(t.angle)
    // Três lâminas na cor escolhida, com contorno claro.
    ctx.fillStyle = colors[i]
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
    ctx.stroke()
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
  const [size] = useState(() => Math.min(380, Math.round(window.innerWidth * 0.9)))
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
      draw(ctx, size, b, hex, sparks)
      if (b.winner !== null) {
        setResult(b)
        setTimeout(() => setPhase('done'), 600)
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
              <span key={p}>
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

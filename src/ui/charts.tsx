import { useState, type PointerEvent } from 'react'
import { findLegend } from '../data/cards'
import { matchupKey, splitTotal, winRate, type Matchup, type PointsSplit, type Tally, type TimelinePoint } from '../engine/stats'

const pct = (rate: number) => `${Math.round(rate * 100)}%`
const tallyText = (t: Tally) => `${t.played} jogo${t.played > 1 ? 's' : ''} · ${t.wins}V ${t.losses}D${t.draws ? ` ${t.draws}E` : ''}`

/** Linha da % de vitórias acumulada, jogo a jogo, com marcador e dica ao tocar. */
export function WinRateChart({ points }: { points: TimelinePoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 340
  const H = 150
  const pad = { left: 34, right: 10, top: 10, bottom: 22 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom
  const x = (i: number) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (rate: number) => pad.top + (1 - rate) * innerH
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`).join(' ')
  const area = `${path} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
  const active = hover ?? points.length - 1
  const p = points[active]

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - box.left) / box.width
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))))
  }

  return (
    <figure className="chart" aria-label={`Evolução da % de vitórias: ${pct(points.at(-1)!.rate)} após ${points.length} jogos`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {[0, 0.5, 1].map((r) => (
          <g key={r}>
            <line x1={pad.left} x2={W - pad.right} y1={y(r)} y2={y(r)} className={r === 0.5 ? 'grid mid' : 'grid'} />
            <text x={pad.left - 6} y={y(r) + 4} className="axis" textAnchor="end">
              {pct(r)}
            </text>
          </g>
        ))}
        <text x={pad.left} y={H - 4} className="axis">
          jogo 1
        </text>
        <text x={W - pad.right} y={H - 4} className="axis" textAnchor="end">
          jogo {points.length}
        </text>
        <path d={area} className="area" />
        <path d={path} className="line" />
        <line x1={x(active)} x2={x(active)} y1={pad.top} y2={y(0)} className="crosshair" />
        <circle cx={x(active)} cy={y(p.rate)} r={5} className="marker" />
        <rect
          x={pad.left}
          y={0}
          width={innerW}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      <figcaption className="chart-tip">
        <b>{pct(p.rate)}</b> após o jogo {p.game} · {p.wins}V em {p.played} ·{' '}
        <span className={`outcome ${p.outcome}`}>{p.outcome === 'win' ? 'vitória' : p.outcome === 'loss' ? 'derrota' : 'empate'}</span>
      </figcaption>
    </figure>
  )
}

/** Barras comparando a % de vitórias começando e jogando em segundo. */
export function TurnOrderBars({ first, second }: { first: Tally; second: Tally }) {
  const rows: [string, Tally][] = [
    ['Começando', first],
    ['Em segundo', second],
  ]
  return (
    <div className="bars">
      {rows.map(([label, t]) => {
        const rate = winRate(t)
        return (
          <div key={label} className="bar-row" title={`${label}: ${tallyText(t)}`}>
            <span className="bar-label">{label}</span>
            <span className="bar-track">
              <i style={{ width: `${(rate ?? 0) * 100}%` }} />
              <em aria-hidden="true" />
            </span>
            <b className="bar-value">{rate === null ? '—' : pct(rate)}</b>
            <span className="bar-sub">{t.played ? tallyText(t) : 'sem jogos'}</span>
          </div>
        )
      })}
      <p className="hint">A marca no meio das barras indica 50%.</p>
    </div>
  )
}

/** Cor da célula: azul acima de 50%, vermelho abaixo, cinza neutro no meio. */
function cellColor(rate: number): string {
  const strength = Math.round(Math.min(1, Math.abs(rate - 0.5) * 2) * 85)
  const pole = rate >= 0.5 ? '#3987e5' : '#e66767'
  return `color-mix(in oklab, ${pole} ${strength}%, #2c3a40)`
}

const shortName = (legend: string) => findLegend(legend)?.champion ?? legend

/** Mapa de confrontos: suas lendas (linhas) × lendas dos oponentes (colunas). */
export function MatchupHeatmap({ matchup }: { matchup: Matchup }) {
  const [selected, setSelected] = useState<string | null>(null)
  const { myLegends, opponentLegends, cells } = matchup
  const sel = selected ? cells.get(selected) : undefined
  const [selMine, selTheirs] = selected?.split('\u0000') ?? []

  return (
    <div className="heatmap-wrap">
      <div className="heatmap" style={{ gridTemplateColumns: `minmax(64px, auto) repeat(${opponentLegends.length}, minmax(52px, 1fr))` }}>
        <span className="hm-corner">você ↓ / oponente →</span>
        {opponentLegends.map((o) => (
          <span key={o} className="hm-head">
            {shortName(o)}
          </span>
        ))}
        {myLegends.map((m) => (
          <div key={m} className="hm-row">
            <span className="hm-head row">{shortName(m)}</span>
            {opponentLegends.map((o) => {
              const key = matchupKey(m, o)
              const t = cells.get(key)
              const rate = t ? winRate(t) : null
              return t && rate !== null ? (
                <button
                  key={o}
                  className={`hm-cell ${selected === key ? 'selected' : ''}`}
                  style={{ background: cellColor(rate) }}
                  onClick={() => setSelected(selected === key ? null : key)}
                  aria-label={`${shortName(m)} contra ${shortName(o)}: ${pct(rate)}, ${tallyText(t)}`}
                >
                  <b>{pct(rate)}</b>
                  <small>{t.played}j</small>
                </button>
              ) : (
                <span key={o} className="hm-cell empty" />
              )
            })}
          </div>
        ))}
      </div>
      <p className="hint">
        {sel ? (
          <>
            <b>
              {shortName(selMine)} × {shortName(selTheirs)}
            </b>
            : {tallyText(sel)} ({pct(winRate(sel) ?? 0)})
          </>
        ) : (
          'Azul: você vence mais. Vermelho: perde mais. Toque numa célula para ver os detalhes.'
        )}
      </p>
    </div>
  )
}

/** Origens dos pontos, na ordem fixa das cores (validadas para o fundo escuro do app). */
const SOURCES = [
  { key: 'hold', label: 'Hold', icon: '⚑' },
  { key: 'conquer', label: 'Conquer', icon: '⚔' },
  { key: 'other', label: 'Efeitos e outros', icon: '✦' },
] as const

type Source = (typeof SOURCES)[number]['key']

/** Barras 100% empilhadas: de onde vêm os seus pontos e os dos oponentes, com dica ao tocar em cada parte. */
/** `whose` completa a dica: "58% dos seus pontos por Conquer". */
export function PointsSplitBars({ rows }: { rows: { label: string; whose: string; split: PointsSplit }[] }) {
  const [active, setActive] = useState<{ row: number; source: Source } | null>(null)
  const tip = active && rows[active.row]
  return (
    <figure className="chart split-chart">
      <div className="split-legend" aria-hidden="true">
        {SOURCES.map((s) => (
          <span key={s.key}>
            <i className={`swatch ${s.key}`} /> {s.icon} {s.label}
          </span>
        ))}
      </div>
      {rows.map((r, i) => {
        const total = splitTotal(r.split)
        return (
          <div key={r.label} className="split-row">
            <span className="split-label">
              {r.label} <small>{total} pontos</small>
            </span>
            <div className="split-track" role="img" aria-label={`${r.label}: ${SOURCES.map((s) => `${r.split[s.key]} por ${s.label}`).join(', ')}`}>
              {SOURCES.filter((s) => r.split[s.key] > 0).map((s) => {
                const share = r.split[s.key] / total
                return (
                  <button
                    key={s.key}
                    className={`split-seg ${s.key} ${active?.row === i && active.source === s.key ? 'on' : ''}`}
                    style={{ flexGrow: r.split[s.key] }}
                    onPointerEnter={() => setActive({ row: i, source: s.key })}
                    onClick={() => setActive({ row: i, source: s.key })}
                    aria-label={`${s.label}: ${r.split[s.key]} pontos (${pct(share)})`}
                  >
                    {share >= 0.12 && <span>{pct(share)}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <figcaption className="chart-tip">
        {tip && active ? (
          <>
            <b>{pct(tip.split[active.source] / splitTotal(tip.split))}</b> {tip.whose} por{' '}
            {SOURCES.find((s) => s.key === active.source)!.label} · {tip.split[active.source]} de {splitTotal(tip.split)}
          </>
        ) : (
          'Toque numa parte da barra para ver os números.'
        )}
      </figcaption>
    </figure>
  )
}

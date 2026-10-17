import type { ReactNode } from 'react'

/** Painel modal que sobe da borda inferior. `flipped` gira para quem está do outro lado da mesa. */
export function Sheet(props: { title: string; onClose: () => void; flipped?: boolean; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={props.onClose}>
      <div
        className={`sheet ${props.flipped ? 'flipped' : ''}`}
        role="dialog"
        aria-label={props.title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-head">
          <h2>{props.title}</h2>
          <button className="icon-btn" onClick={props.onClose} aria-label="Fechar">
            ✕
          </button>
        </header>
        <div className="sheet-body">{props.children}</div>
      </div>
    </div>
  )
}

export function Stepper(props: {
  label: string
  value: number
  onChange: (delta: number) => void
  color?: string
}) {
  return (
    <div className="stepper">
      <span className="stepper-label">
        {props.color && <i className="dot" style={{ background: props.color }} />}
        {props.label}
      </span>
      <button className="step-btn" onClick={() => props.onChange(-1)} disabled={props.value <= 0} aria-label={`Diminuir ${props.label}`}>
        −
      </button>
      <span className="stepper-value">{props.value}</span>
      <button className="step-btn" onClick={() => props.onChange(1)} aria-label={`Aumentar ${props.label}`}>
        +
      </button>
    </div>
  )
}

/** Cabeçalho com a marca do app. */
export function Brand(props: { title?: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="brand">
      {props.title ? (
        <h1>{props.title}</h1>
      ) : (
        <h1 className="logo">
          Riftbound
          <small>Companion</small>
        </h1>
      )}
      <div className="ornament" aria-hidden="true">
        <i />
        <b />
        <i />
      </div>
      {props.subtitle && <p>{props.subtitle}</p>}
    </header>
  )
}

/** Trilha de gemas mostrando o progresso até a vitória. */
export function ScoreGems(props: { points: number; target: number }) {
  return (
    <div className="gems" aria-hidden="true">
      {Array.from({ length: props.target }, (_, i) => (
        <i key={i} className={i < props.points ? 'on' : ''} />
      ))}
    </div>
  )
}

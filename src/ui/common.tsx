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

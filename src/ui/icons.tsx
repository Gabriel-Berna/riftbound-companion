import type { ReactNode } from 'react'

/**
 * Ícones do app, desenhados em SVG de traço (24×24, cor do texto): no lugar de emojis, que mudam de
 * aparência em cada celular e destoam do visual. Sempre decorativos: o texto ao lado diz o que é.
 */
const PATHS = {
  // Espadas cruzadas: partida, Conquer, Might.
  swords: (
    <>
      <path d="M4 4l9.5 9.5M4 4v3.5M4 4h3.5" />
      <path d="M20 4l-9.5 9.5M20 4v3.5M20 4h-3.5" />
      <path d="M8 14l2 2M16 14l-2 2M7 17l-2.5 2.5M17 17l2.5 2.5" />
      <path d="M6.5 15.5l2 2M17.5 15.5l-2 2" />
    </>
  ),
  // Bandeira: Hold.
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 4.5c3-1.5 5 1.5 8 0s4 0 4 0v8s-1-1.5-4 0-5-1.5-8 0" />
    </>
  ),
  // Brilho de quatro pontas: efeitos, onda de energia.
  sparkle: <path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z" />,
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v4M8.5 20h7M9.5 17h5" />
    </>
  ),
  chart: <path d="M4 20h16M7 20v-6M12 20V8M17 20v-9" />,
  cards: (
    <>
      <rect x="7" y="4" width="11" height="15" rx="1.5" transform="rotate(8 12.5 11.5)" />
      <path d="M6.2 6.4l-1.1.2a1.5 1.5 0 0 0-1.2 1.7l1.8 10.3a1.5 1.5 0 0 0 1.7 1.2l1.2-.2" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
      <circle cx="12" cy="12" r="6.5" />
    </>
  ),
  // Setas em círculo: revanche.
  rematch: (
    <>
      <path d="M19 12a7 7 0 0 1-12 4.9M5 12a7 7 0 0 1 12-4.9" />
      <path d="M17 3.5v3.6h-3.6M7 20.5v-3.6h3.6" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </>
  ),
  // Moldura com montanha: escolher arte.
  art: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18" />
      <circle cx="15" cy="9" r="1.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9v4l2.5 2.5M10 3h4" />
    </>
  ),
  // Lista: histórico.
  log: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  // Câmera lenta: replay.
  replay: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4 3.5v3.7h3.7" />
      <path d="M10.5 9.5v5l4-2.5z" />
    </>
  ),
  // Pião: corpo em losango, ponta e linhas de giro.
  top: (
    <>
      <path d="M12 21l-6.5-8.5L12 7l6.5 5.5z" />
      <path d="M12 7V3.5M9.5 3.5h5" />
      <path d="M3 9.5c1.5-1 3-1.5 4.5-1.5M21 9.5c-1.5-1-3-1.5-4.5-1.5" />
    </>
  ),
  // Raio: eventos no estádio.
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  // Moeda com o losango hextech.
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5l3 4.5-3 4.5-3-4.5z" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" />
    </>
  ),
  play: <path d="M8 5v14l11-7z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  undo: (
    <>
      <path d="M9 14L4.5 9.5 9 5" />
      <path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" />
    </>
  ),
  // Olho: o Barão.
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  // Ondas de tremor: terremoto.
  quake: <path d="M2.5 12h3l2-5 3 10 3-12 3 10 2-3h3" />,
  // Círculo aberto: abertura alargada.
  gap: (
    <>
      <path d="M7 5.3A8 8 0 1 0 17 5.3" />
      <path d="M9.5 3l2.5 3 2.5-3" />
    </>
  ),
  // Alvo: regra do Ponto Final.
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12h.01" />
    </>
  ),
  // Runa (losango hextech): recursos.
  rune: (
    <>
      <path d="M12 3l6.5 9-6.5 9-6.5-9z" />
      <path d="M12 8l2.8 4-2.8 4-2.8-4z" />
    </>
  ),
  // Seta: movimento.
  move: <path d="M4 12h15M14 6.5l5.5 5.5-5.5 5.5" />,
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 0 2 1 3 2 3.5C11 9 11 6 12 3z" />,
  // Carta virada para baixo: Hidden.
  hidden: (
    <>
      <rect x="6" y="3.5" width="12" height="17" rx="1.5" />
      <path d="M9.5 9l5 6M14.5 9l-5 6" />
    </>
  ),
  // Grade de cartas: biblioteca.
  library: (
    <>
      <rect x="4" y="4" width="7" height="9" rx="1" />
      <rect x="13" y="4" width="7" height="9" rx="1" />
      <path d="M4 16.5h7M13 16.5h7M4 20h7M13 20h7" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({ name, className }: { name: IconName; className?: string }) {
  // Ícones de preenchimento (play, raio, brilho) ficam sólidos; os demais são só traço.
  const solid = name === 'play' || name === 'bolt' || name === 'sparkle'
  return (
    <svg
      className={`icon ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill={solid ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={solid ? 1.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}

import { useState } from 'react'
import { LEGENDS } from '../data/cards'

const SLIDES = [
  {
    title: 'O placar da mesa',
    text: 'Cada jogador tem metade da tela. Toque na metade esquerda da sua lenda para um ponto de Hold e na direita para um de Conquer. O app aplica a regra do Ponto Final e avisa quando alguém vence.',
    legend: 'Loose Cannon',
  },
  {
    title: 'Suas lendas, seus decks',
    text: 'Salve seus decks, escolha a arte da sua lenda e acompanhe as estatísticas: vitórias por lenda, por oponente e começando ou em segundo.',
    legend: 'Nine-Tailed Fox',
  },
  {
    title: 'Cartas e regras na mão',
    text: 'Consulte qualquer carta, com as palavras-chave explicadas em português, e tire dúvidas de regras sem sair da partida.',
    legend: 'Blind Monk',
  },
]

/** Introdução de três telas, mostrada no primeiro uso (e reaberta pelos Ajustes). */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const slide = SLIDES[step]
  const legend = LEGENDS.find((l) => l.name === slide.legend) ?? LEGENDS[step % LEGENDS.length]
  const last = step === SLIDES.length - 1
  // Cópia local da arte (public/art/legends): é a primeira tela do app, sem esperar a CDN.
  const art = `${import.meta.env.BASE_URL}art/legends/${legend.image.split('/').pop()!.split('-')[0]}.webp`

  return (
    <div className="onboarding" role="dialog" aria-label="Introdução">
      <div key={step} className="onboarding-art" style={{ backgroundImage: `url("${art}")` }} />
      <div className="onboarding-content">
        <span className="hero-logo">
          Riftbound <small>Companion</small>
        </span>
        <h1 key={`t${step}`}>{slide.title}</h1>
        <p>{slide.text}</p>
        <div className="onboarding-dots" aria-hidden="true">
          {SLIDES.map((_, i) => (
            <i key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        <button className="primary big" onClick={() => (last ? onDone() : setStep(step + 1))}>
          {last ? 'Começar' : 'Próximo'}
        </button>
        {!last && (
          <button className="link" onClick={onDone}>
            Pular
          </button>
        )}
      </div>
    </div>
  )
}

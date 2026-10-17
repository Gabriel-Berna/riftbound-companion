import { useMemo, useState } from 'react'
import { KEYWORDS } from '../data/keywords'
import { searchRules } from '../data/rules'
import { Brand } from './common'
import { CardText } from './LibraryScreen'

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Consulta rápida de regras e glossário de palavras-chave. Abre como tela ou por cima da partida. */
export function RulesScreen(props: { onClose: () => void; overlay?: boolean }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const topics = useMemo(() => searchRules(query), [query])
  const keywords = useMemo(() => {
    const q = normalize(query.trim())
    return Object.entries(KEYWORDS).filter(([k, v]) => !q || normalize(k).includes(q) || normalize(v).includes(q))
  }, [query])

  return (
    <div className={props.overlay ? 'library-overlay' : undefined}>
      <main className="screen setup rules">
        <button className="link back" onClick={props.onClose}>
          {props.overlay ? '✕ Fechar' : '← Início'}
        </button>
        <Brand title="Regras rápidas" subtitle="Resumo do Core Rules e do Tournament Rules" />
        <input className="search" type="search" placeholder="Buscar: ponto final, combate, hidden…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar regra" />

        <div className="rule-list">
          {topics.map((t) => {
            const expanded = open === t.id || !!query.trim()
            return (
              <section key={t.id} className={`rule-topic ${expanded ? 'open' : ''}`}>
                <button className="rule-head" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={expanded}>
                  <span className="rule-icon">{t.icon}</span>
                  <span className="rule-titles">
                    <b>{t.title}</b>
                    <small>
                      <CardText text={t.summary} />
                    </small>
                  </span>
                </button>
                {expanded && (
                  <div className="rule-body">
                    <ul>
                      {t.points.map((p, i) => (
                        <li key={i}>
                          <CardText text={p} />
                        </li>
                      ))}
                    </ul>
                    <span className="rule-refs">{t.refs}</span>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        {keywords.length > 0 && (
          <section className="card keywords">
            <h2>Palavras-chave</h2>
            {keywords.map(([name, text]) => (
              <p key={name}>
                <span className="kw">{name}</span> <CardText text={text} />
              </p>
            ))}
          </section>
        )}
        {topics.length === 0 && keywords.length === 0 && <p className="hint text-center">Nada encontrado. Tente outra palavra.</p>}
        <p className="hint text-center">Em caso de dúvida em torneio, vale o documento oficial e o juiz.</p>
      </main>
    </div>
  )
}

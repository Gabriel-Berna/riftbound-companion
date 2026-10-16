import { useState } from 'react'
import { availableBattlefields, firstPlayerRule, gameWins, type MatchState } from '../engine/match'
import type { PlayerIndex } from '../engine/types'
import type { AppAction } from '../store'

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

export function GameSetupScreen({ match, dispatch }: { match: MatchState; dispatch: (a: AppAction) => void }) {
  const rule = firstPlayerRule(match)
  const isDuel = match.format === 'duel'
  const options = [availableBattlefields(match, 0), availableBattlefields(match, 1)] as const

  const [choices, setChoices] = useState<[string | null, string | null]>(() =>
    // Com uma única opção não há o que escolher.
    [options[0].length === 1 ? options[0][0] : null, options[1].length === 1 ? options[1][0] : null],
  )
  const [decider, setDecider] = useState<PlayerIndex | null>(rule.kind === 'chooser' ? rule.player : null)
  const [firstPlayer, setFirstPlayer] = useState<PlayerIndex | null>(rule.kind === 'fixed' ? rule.firstPlayer : null)

  const name = (p: PlayerIndex) => match.players[p].name
  const wins = gameWins(match)
  const ready = choices[0] !== null && choices[1] !== null && firstPlayer !== null

  const choose = (p: PlayerIndex, bf: string) =>
    setChoices((c) => {
      const next = [...c] as typeof c
      next[p] = bf
      return next
    })

  return (
    <main className="screen setup">
      <header className="brand">
        <h1>{isDuel ? 'Preparar o jogo' : `Jogo ${match.games.length + 1}`}</h1>
        {!isDuel && (
          <p className="match-score">
            <span className="c0">{name(0)}</span> {wins[0]} × {wins[1]} <span className="c1">{name(1)}</span>
          </p>
        )}
      </header>

      <section className="card">
        <h2>Battlefields</h2>
        {isDuel && (
          <button className="secondary" onClick={() => setChoices([pick([...options[0]]), pick([...options[1]])])}>
            🎲 Sortear battlefields
          </button>
        )}
        {([0, 1] as const).map((p) => (
          <div key={p} className="bf-choice">
            <h3 className={`c${p}`}>{name(p)}</h3>
            {isDuel ? (
              <p className="chosen">{choices[p] ?? 'Ainda não sorteado'}</p>
            ) : (
              <div className="chips">
                {options[p].map((bf) => (
                  <button key={bf} className={`chip ${choices[p] === bf ? `on p${p}` : ''}`} onClick={() => choose(p, bf)}>
                    {bf}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {!isDuel && match.removed[0].length > 0 && (
          <p className="hint">Battlefields usados em jogos com vencedor não podem voltar nesta partida.</p>
        )}
      </section>

      <section className="card">
        <h2>Quem começa?</h2>
        {rule.kind === 'fixed' ? (
          <p>
            O último jogo empatou, então <b className={`c${rule.firstPlayer}`}>{name(rule.firstPlayer)}</b> começa de novo.
          </p>
        ) : decider === null ? (
          <button className="secondary" onClick={() => setDecider(pick([0, 1] as PlayerIndex[]))}>
            🎲 Sortear quem decide
          </button>
        ) : (
          <>
            <p>
              <b className={`c${decider}`}>{name(decider)}</b>{' '}
              {rule.kind === 'chooser' ? 'perdeu o último jogo e decide:' : 'foi sorteado e decide:'}
            </p>
            <div className="segmented">
              {([0, 1] as const).map((p) => (
                <button key={p} className={firstPlayer === p ? 'on' : ''} onClick={() => setFirstPlayer(p)}>
                  {name(p)} começa
                </button>
              ))}
            </div>
            {firstPlayer !== null && (
              <p className="hint">{name(firstPlayer === 0 ? 1 : 0)} joga em segundo e canaliza 1 runa extra no primeiro turno.</p>
            )}
          </>
        )}
      </section>

      <section className="card checklist">
        <h2>Antes de começar</h2>
        <ol>
          <li>Legend na Legend Zone e Chosen Champion na Champion Zone.</li>
          <li>Embaralhe o Main Deck e o Rune Deck.</li>
          <li>Cada jogador compra 4 cartas.</li>
          <li>Mulligan, em ordem de turno: separe até 2 cartas, compre o mesmo número e recicle as separadas.</li>
        </ol>
      </section>

      <button
        className="primary big"
        disabled={!ready}
        onClick={() =>
          ready && dispatch({ type: 'match', action: { type: 'startGame', battlefieldNames: [choices[0]!, choices[1]!], firstPlayer: firstPlayer! } })
        }
      >
        Começar jogo
      </button>
      <button className="link" onClick={() => confirm('Abandonar esta partida?') && dispatch({ type: 'quit' })}>
        Abandonar partida
      </button>
    </main>
  )
}

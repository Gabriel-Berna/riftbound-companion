import { useCallback, useState } from 'react'
import { availableBattlefields, firstPlayerRule, gameWins, type MatchState } from '../engine/match'
import type { PlayerIndex } from '../engine/types'
import type { AppAction } from '../store'
import { BattlefieldTile } from './cards'
import { Brand } from './common'
import { CoinFlip } from './spectacle'
import { TopsBattle } from './TopsBattle'
import { findLegend } from '../data/cards'
import { RoundClock } from './timer'

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
  const [coinFlipping, setCoinFlipping] = useState(false)
  // Batalha de piões aberta: 'classic' ou 'events' (com eventos no estádio).
  const [battling, setBattling] = useState<'classic' | 'events' | null>(null)
  const [byTops, setByTops] = useState(false)
  const onCoinResult = useCallback((p: PlayerIndex) => setDecider(p), [])

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
      <Brand
        title={isDuel ? 'Preparar o jogo' : `Jogo ${match.games.length + 1}`}
        subtitle={
          !isDuel && (
            <span className="match-score">
              <span className="c0">{name(0)}</span> {wins[0]} × {wins[1]} <span className="c1">{name(1)}</span>
            </span>
          )
        }
      />
      {match.timer && (
        <p className="text-center">
          <RoundClock match={match} />
        </p>
      )}

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
              choices[p] ? <BattlefieldTile name={choices[p]} selected player={p} /> : <p className="chosen">Ainda não sorteado</p>
            ) : (
              <div className="bf-options">
                {options[p].map((bf) => (
                  <BattlefieldTile key={bf} name={bf} selected={choices[p] === bf} player={p} onClick={() => choose(p, bf)} />
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
        ) : (
          <>
            {/* A moeda fica sempre nesta posição, para não ser recriada (e sortear de novo) ao terminar. */}
            {coinFlipping && <CoinFlip names={[name(0), name(1)]} onResult={onCoinResult} />}
            {decider === null ? (
              !coinFlipping && (
                <div className="draw-methods">
                  <button className="secondary" onClick={() => setCoinFlipping(true)}>
                    🪙 Sortear quem decide
                  </button>
                  <button className="secondary" onClick={() => setBattling('classic')}>
                    🌀 Batalha de piões
                  </button>
                  <button className="secondary" onClick={() => setBattling('events')}>
                    ⚡ Piões com eventos
                  </button>
                </div>
              )
            ) : (
              <>
                <p>
                  <b className={`c${decider}`}>{name(decider)}</b>{' '}
                  {rule.kind === 'chooser' ? 'perdeu o último jogo e decide:' : byTops ? 'venceu a batalha de piões e decide:' : 'foi sorteado e decide:'}
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
          </>
        )}
      </section>

      {battling && (
        <TopsBattle
          names={[name(0), name(1)]}
          legendDomains={[findLegend(match.players[0].legend)?.domains, findLegend(match.players[1].legend)?.domains]}
          withEvents={battling === 'events'}
          onResult={(p) => {
            setDecider(p)
            setByTops(true)
            setBattling(null)
          }}
          onCancel={() => setBattling(null)}
        />
      )}

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
          ready && dispatch({ type: 'match', action: { type: 'startGame', battlefieldNames: [choices[0]!, choices[1]!], firstPlayer: firstPlayer!, now: Date.now() } })
        }
      >
        Começar jogo
      </button>
      {match.games.length > 0 && (
        <button
          className="secondary"
          onClick={() =>
            confirm('O tempo da rodada acabou? Nenhum jogo novo começa: vence quem tem mais vitórias e, com vitórias iguais, a partida empata.') &&
            dispatch({ type: 'match', action: { type: 'timeUp' } })
          }
        >
          ⏱ Tempo esgotado: encerrar a partida
        </button>
      )}
      <button className="link" onClick={() => confirm('Abandonar esta partida?') && dispatch({ type: 'quit' })}>
        Abandonar partida
      </button>
    </main>
  )
}

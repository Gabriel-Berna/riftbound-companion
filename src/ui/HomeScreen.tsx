import { useMemo } from 'react'
import { cardImage, findLegend, legendImage, LEGENDS } from '../data/cards'
import { gameWins, type MatchPlayer, type MatchState } from '../engine/match'
import { computeStats, matchOutcome, winRate, type MatchRecord } from '../engine/stats'
import { DomainIcons } from './cards'

const OUTCOME = { win: 'V', loss: 'D', draw: 'E' } as const

/** Lenda em destaque quando você ainda não escolheu a sua: muda a cada dia. */
function legendOfTheDay() {
  const day = Math.floor(Date.now() / 86_400_000)
  return LEGENDS[day % LEGENDS.length]
}

export function HomeScreen(props: {
  profile: MatchPlayer | null
  records: MatchRecord[]
  onNewMatch: () => void
  onRematch: (() => void) | null
  onStats: () => void
  onLibrary: () => void
  onSettings: () => void
  onDecks: () => void
  deckCount: number
}) {
  const { profile, records } = props
  const myLegend = findLegend(profile?.legend)
  const hero = myLegend ?? legendOfTheDay()
  const stats = useMemo(() => computeStats(records), [records])
  const rate = winRate(stats.matches)
  const last = records[0]

  return (
    <main className="screen home">
      <section className="hero" style={{ backgroundImage: `url("${legendImage(hero, myLegend ? profile?.legendArt : undefined, 900)}")` }}>
        <div className="hero-top">
          <span className="hero-logo">
            Riftbound <small>Companion</small>
          </span>
        </div>
        <div className="hero-info">
          {profile ? (
            <>
              <h1>{profile.name}</h1>
              {myLegend ? (
                <span className="hero-legend">
                  <DomainIcons domains={myLegend.domains} /> {myLegend.champion} · {myLegend.name}
                </span>
              ) : (
                <span className="hero-legend">Escolha sua lenda na próxima partida</span>
              )}
              {stats.matches.played > 0 && (
                <span className="hero-record">
                  {stats.matches.wins}V {stats.matches.losses}D
                  {rate !== null && <b> · {Math.round(rate * 100)}% de vitórias</b>}
                </span>
              )}
            </>
          ) : (
            <>
              <h1>Bem-vindo ao Rift</h1>
              <span className="hero-legend">
                Lenda do dia: {hero.champion} · {hero.name}
              </span>
            </>
          )}
        </div>
      </section>

      <button className="primary big new-match" onClick={props.onNewMatch}>
        ⚔ Nova partida
      </button>

      <nav className="tiles">
        {props.onRematch && last && (
          <button className="tile rematch" onClick={props.onRematch}>
            <span className="tile-icon">↻</span>
            <b>Revanche</b>
            <small>vs {last.players[1].name}</small>
          </button>
        )}
        <button className="tile" onClick={props.onStats}>
          <span className="tile-icon">📊</span>
          <b>Estatísticas</b>
          <small>{records.length ? `${records.length} partida${records.length > 1 ? 's' : ''}` : 'Nenhuma partida ainda'}</small>
        </button>
        <button className="tile" onClick={props.onDecks}>
          <span className="tile-icon">🃏</span>
          <b>Decks</b>
          <small>{props.deckCount ? `${props.deckCount} salvo${props.deckCount > 1 ? 's' : ''}` : 'Salve seus decks'}</small>
        </button>
        <button className="tile" onClick={props.onLibrary}>
          <span className="tile-icon">📚</span>
          <b>Cartas</b>
          <small>Biblioteca completa</small>
        </button>
        <button className="tile" onClick={props.onSettings}>
          <span className="tile-icon">⚙</span>
          <b>Ajustes</b>
          <small>Perfil e preferências</small>
        </button>
      </nav>

      {records.length > 0 && (
        <section className="recent">
          <h2>Últimas partidas</h2>
          <ol>
            {records.slice(0, 3).map((r) => {
              const outcome = matchOutcome(r)
              const [mine, theirs] = gameWins({ format: r.format, games: r.games } as MatchState)
              const opp = findLegend(r.players[1].legend)
              return (
                <li key={r.id} className={`recent-item ${outcome}`}>
                  <span className="recent-art" style={opp ? { backgroundImage: `url("${cardImage(opp, 160)}")` } : undefined} />
                  <span className="recent-main">
                    <b>vs {r.players[1].name}</b>
                    <small>{opp ? opp.champion : 'Lenda não informada'}</small>
                  </span>
                  <span className={`recent-score ${outcome}`}>
                    {OUTCOME[outcome]} {mine}×{theirs}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </main>
  )
}

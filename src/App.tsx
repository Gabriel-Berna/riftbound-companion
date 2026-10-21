import { useCallback, useMemo, useState } from 'react'
import { createMatch, isMatchOver, type MatchAction } from './engine/match'
import { useAppStore } from './store'
import type { Deck } from './engine/deck'
import { DeckEditor, DecksScreen } from './ui/DecksScreen'
import { EventsScreen } from './ui/EventsScreen'
import { GameScreen } from './ui/GameScreen'
import { GameSetupScreen } from './ui/GameSetupScreen'
import { HomeScreen } from './ui/HomeScreen'
import { LibraryScreen } from './ui/LibraryScreen'
import { ManualRecordScreen } from './ui/ManualRecordScreen'
import { MatchOverScreen } from './ui/MatchOverScreen'
import { NewMatchScreen } from './ui/NewMatchScreen'
import { Onboarding } from './ui/Onboarding'
import { RulesScreen } from './ui/RulesScreen'
import { SettingsScreen } from './ui/SettingsScreen'
import { StatsScreen } from './ui/StatsScreen'
import { useRoundClock } from './ui/timer'

type View = 'home' | 'new' | 'stats' | 'manual' | 'library' | 'settings' | 'decks' | 'rules' | 'events'

export function App() {
  const [state, dispatch] = useAppStore()
  const [view, setView] = useState<View>('home')
  // `paste`: deck novo que já abre na colagem da lista.
  const [editingDeck, setEditingDeck] = useState<{ deck: Deck; paste?: boolean } | null>(null)
  const { match, records } = state
  const activeEvent = state.events.find((e) => e.id === state.activeEventId) ?? null
  const home = () => setView('home')
  const matchDispatch = useCallback((action: MatchAction) => dispatch({ type: 'match', action }), [dispatch])
  useRoundClock(match, matchDispatch)

  // Você: o perfil salvo ou, na falta dele, você na última partida registrada.
  const profile = state.profile ?? records[0]?.players[0] ?? null
  // Registros vêm do mais recente ao mais antigo: a primeira lenda vista é a última usada.
  const opponents = useMemo(() => {
    const map = new Map<string, string | undefined>()
    for (const r of records) if (!map.has(r.players[1].name)) map.set(r.players[1].name, r.players[1].legend)
    return map
  }, [records])

  if (!state.onboarded && !match) return (
      <Onboarding
        onDone={() => {
          dispatch({ type: 'setOnboarded', value: true })
          home()
        }}
      />
    )
  if (match?.game) return <GameScreen state={state} match={match} game={match.game} dispatch={dispatch} />
  if (match && isMatchOver(match)) {
    const showStats = () => {
      dispatch({ type: 'quit' })
      setView('stats')
    }
    const event = state.events.find((e) => e.id === match.eventId) ?? null
    return (
      <MatchOverScreen
        match={match}
        event={event}
        records={records}
        dispatch={dispatch}
        onStats={showStats}
        onNextRound={() => {
          dispatch({ type: 'quit' })
          setView('new')
        }}
        onEvent={() => {
          dispatch({ type: 'quit' })
          setView('events')
        }}
      />
    )
  }
  // A key recria a tela a cada jogo, zerando as escolhas do jogo anterior.
  if (match) return <GameSetupScreen key={match.games.length} match={match} dispatch={dispatch} />

  if (editingDeck)
    return (
      <DeckEditor
        key={editingDeck.deck.id}
        deck={editingDeck.deck}
        startWithPaste={editingDeck.paste}
        saved={state.decks.some((d) => d.id === editingDeck.deck.id)}
        dispatch={dispatch}
        onClose={() => setEditingDeck(null)}
      />
    )

  switch (view) {
    case 'rules':
      return <RulesScreen onClose={home} />
    case 'events':
      return (
        <EventsScreen
          events={state.events}
          records={records}
          decks={state.decks}
          activeEventId={state.activeEventId}
          dispatch={dispatch}
          onPlay={() => setView('new')}
          onBack={home}
        />
      )
    case 'decks':
      return <DecksScreen decks={state.decks} onOpen={(deck, paste) => setEditingDeck({ deck, paste })} onBack={home} />
    case 'new': {
      // Ao terminar a partida, o app volta para o início.
      const startMatch: typeof dispatch = (a) => {
        dispatch(a)
        if (a.type === 'newMatch') home()
      }
      return <NewMatchScreen dispatch={startMatch} profile={profile} decks={state.decks} opponents={opponents} activeEvent={activeEvent} records={records} onBack={home} />
    }
    case 'library':
      return <LibraryScreen onClose={home} />
    case 'settings':
      return <SettingsScreen state={state} profile={profile} dispatch={dispatch} onBack={home} />
    case 'stats':
      return <StatsScreen records={records} events={state.events} dispatch={dispatch} onBack={home} onAddManual={() => setView('manual')} />
    case 'manual':
      return (
        <ManualRecordScreen
          myName={profile?.name ?? ''}
          myLegend={profile?.legend}
          opponents={[...opponents.keys()]}
          activeEvent={activeEvent}
          records={records}
          dispatch={dispatch}
          onDone={() => setView('stats')}
        />
      )
    case 'home': {
      const last = records[0]
      const rematch = last ? () => dispatch({ type: 'newMatch', match: createMatch(last.format, last.players) }) : null
      return (
        <HomeScreen
          profile={profile}
          records={records}
          onNewMatch={() => setView('new')}
          onRematch={rematch}
          onStats={() => setView('stats')}
          onLibrary={() => setView('library')}
          onSettings={() => setView('settings')}
          onDecks={() => setView('decks')}
          onRules={() => setView('rules')}
          onEvents={() => setView('events')}
          activeEvent={activeEvent}
          deckCount={state.decks.length}
        />
      )
    }
  }
}

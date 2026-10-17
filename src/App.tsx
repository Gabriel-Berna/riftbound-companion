import { useMemo, useState } from 'react'
import { isMatchOver } from './engine/match'
import { useAppStore } from './store'
import { GameScreen } from './ui/GameScreen'
import { GameSetupScreen } from './ui/GameSetupScreen'
import { LibraryScreen } from './ui/LibraryScreen'
import { ManualRecordScreen } from './ui/ManualRecordScreen'
import { MatchOverScreen } from './ui/MatchOverScreen'
import { NewMatchScreen } from './ui/NewMatchScreen'
import { StatsScreen } from './ui/StatsScreen'

export function App() {
  const [state, dispatch] = useAppStore()
  const [view, setView] = useState<'home' | 'stats' | 'manual' | 'library'>('home')
  const { match, records } = state

  const lastMe = records[0]?.players[0]
  // Registros vêm do mais recente ao mais antigo: a primeira lenda vista é a última usada.
  const opponents = useMemo(() => {
    const map = new Map<string, string | undefined>()
    for (const r of records) if (!map.has(r.players[1].name)) map.set(r.players[1].name, r.players[1].legend)
    return map
  }, [records])

  if (match?.game) return <GameScreen state={state} match={match} game={match.game} dispatch={dispatch} />
  if (match && isMatchOver(match)) {
    const showStats = () => {
      dispatch({ type: 'quit' })
      setView('stats')
    }
    return <MatchOverScreen match={match} dispatch={dispatch} onStats={showStats} />
  }
  // A key recria a tela a cada jogo, zerando as escolhas do jogo anterior.
  if (match) return <GameSetupScreen key={match.games.length} match={match} dispatch={dispatch} />

  if (view === 'library') return <LibraryScreen onClose={() => setView('home')} />
  if (view === 'stats')
    return <StatsScreen records={records} dispatch={dispatch} onBack={() => setView('home')} onAddManual={() => setView('manual')} />
  if (view === 'manual')
    return (
      <ManualRecordScreen
        myName={lastMe?.name ?? ''}
        myLegend={lastMe?.legend}
        opponents={[...opponents.keys()]}
        dispatch={dispatch}
        onDone={() => setView('stats')}
      />
    )
  return <NewMatchScreen key={records.length} dispatch={dispatch} lastMe={lastMe} opponents={opponents} onStats={() => setView('stats')} onLibrary={() => setView('library')} />
}

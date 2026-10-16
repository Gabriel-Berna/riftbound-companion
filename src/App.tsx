import { isMatchOver } from './engine/match'
import { useAppStore } from './store'
import { GameScreen } from './ui/GameScreen'
import { GameSetupScreen } from './ui/GameSetupScreen'
import { MatchOverScreen } from './ui/MatchOverScreen'
import { NewMatchScreen } from './ui/NewMatchScreen'

export function App() {
  const [state, dispatch] = useAppStore()
  const { match } = state

  if (!match) return <NewMatchScreen dispatch={dispatch} />
  if (match.game) return <GameScreen state={state} match={match} game={match.game} dispatch={dispatch} />
  if (isMatchOver(match)) return <MatchOverScreen match={match} dispatch={dispatch} />
  // A key recria a tela a cada jogo, zerando as escolhas do jogo anterior.
  return <GameSetupScreen key={match.games.length} match={match} dispatch={dispatch} />
}

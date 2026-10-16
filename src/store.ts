import { useEffect, useReducer } from 'react'
import { matchReducer, type MatchAction, type MatchState } from './engine/match'

export interface AppState {
  match: MatchState | null
  /** Estados anteriores da partida, para desfazer. */
  history: MatchState[]
  /** Gira o painel do oponente para quem está do outro lado da mesa. */
  tableMode: boolean
}

export type AppAction =
  | { type: 'newMatch'; match: MatchState }
  | { type: 'match'; action: MatchAction }
  | { type: 'undo' }
  | { type: 'quit' }
  | { type: 'toggleTableMode' }

const STORAGE_KEY = 'riftbound-companion/v1'
const HISTORY_LIMIT = 200

function reducer(s: AppState, a: AppAction): AppState {
  switch (a.type) {
    case 'newMatch':
      return { ...s, match: a.match, history: [] }
    case 'match': {
      if (!s.match) return s
      const next = matchReducer(s.match, a.action)
      if (next === s.match) return s
      return { ...s, match: next, history: [...s.history, s.match].slice(-HISTORY_LIMIT) }
    }
    case 'undo': {
      const prev = s.history.at(-1)
      if (!prev) return s
      return { ...s, match: prev, history: s.history.slice(0, -1) }
    }
    case 'quit':
      return { ...s, match: null, history: [] }
    case 'toggleTableMode':
      return { ...s, tableMode: !s.tableMode }
  }
}

function load(): AppState {
  const fallback: AppState = { match: null, history: [], tableMode: true }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

/** Estado do app, salvo no aparelho para sobreviver a recarregamentos. */
export function useAppStore() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Sem armazenamento disponível (ex.: aba anônima): o app continua funcionando sem salvar.
    }
  }, [state])
  return [state, dispatch] as const
}

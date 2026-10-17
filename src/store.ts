import { useEffect, useReducer } from 'react'
import { isMatchOver, matchReducer, type MatchAction, type MatchState } from './engine/match'
import { mergeRecords, recordFromMatch, type MatchRecord } from './engine/stats'

export interface Settings {
  /** Sons ao pontuar, passar a vez e vencer (desligado por padrão). */
  sound: boolean
  /** Vibração curta ao pontuar (Android). */
  vibration: boolean
  /** Mantém a tela ligada durante a partida. */
  keepAwake: boolean
}

export const DEFAULT_SETTINGS: Settings = { sound: false, vibration: true, keepAwake: true }

export interface AppState {
  match: MatchState | null
  /** Estados anteriores da partida, para desfazer. */
  history: MatchState[]
  /** Gira o painel do oponente para quem está do outro lado da mesa. */
  tableMode: boolean
  /** Partidas encerradas, da mais recente à mais antiga. */
  records: MatchRecord[]
  settings: Settings
}

export type AppAction =
  | { type: 'newMatch'; match: MatchState }
  | { type: 'match'; action: MatchAction }
  | { type: 'undo' }
  | { type: 'quit' }
  | { type: 'toggleTableMode' }
  | { type: 'addRecord'; record: MatchRecord }
  | { type: 'deleteRecord'; id: string }
  | { type: 'importRecords'; records: MatchRecord[] }
  | { type: 'clearRecords' }
  | { type: 'setting'; key: keyof Settings; value: boolean }

const STATE_KEY = 'riftbound-companion/v1'
// As partidas ficam numa chave própria, para não se perderem se o formato do estado mudar.
const RECORDS_KEY = 'riftbound-companion/records/v1'
const HISTORY_LIMIT = 200

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

function reducer(s: AppState, a: AppAction): AppState {
  switch (a.type) {
    case 'newMatch':
      return { ...s, match: a.match, history: [] }
    case 'match': {
      if (!s.match) return s
      const next = matchReducer(s.match, a.action)
      if (next === s.match) return s
      // A partida acabou de terminar: guarda para as estatísticas.
      const finished = !isMatchOver(s.match) && isMatchOver(next)
      return {
        ...s,
        match: next,
        history: [...s.history, s.match].slice(-HISTORY_LIMIT),
        records: finished ? [recordFromMatch(next, newId(), new Date()), ...s.records] : s.records,
      }
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
    case 'addRecord':
      return { ...s, records: mergeRecords(s.records, [a.record]) }
    case 'deleteRecord':
      return { ...s, records: s.records.filter((r) => r.id !== a.id) }
    case 'importRecords':
      return { ...s, records: mergeRecords(s.records, a.records) }
    case 'clearRecords':
      return { ...s, records: [] }
    case 'setting':
      return { ...s, settings: { ...s.settings, [a.key]: a.value } }
  }
}

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sem armazenamento disponível (ex.: aba anônima): o app continua funcionando sem salvar.
  }
}

function load(): AppState {
  const saved = read<Partial<AppState>>(STATE_KEY)
  return {
    match: saved?.match ?? null,
    history: saved?.history ?? [],
    tableMode: saved?.tableMode ?? true,
    records: read<MatchRecord[]>(RECORDS_KEY) ?? [],
    settings: { ...DEFAULT_SETTINGS, ...saved?.settings },
  }
}

/** Estado do app, salvo no aparelho para sobreviver a recarregamentos. */
export function useAppStore() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const { match, history, tableMode, records, settings } = state
  useEffect(() => write(STATE_KEY, { match, history, tableMode, settings }), [match, history, tableMode, settings])
  useEffect(() => write(RECORDS_KEY, records), [records])
  return [state, dispatch] as const
}

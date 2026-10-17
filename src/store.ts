import { useEffect, useReducer } from 'react'
import { isMatchOver, matchReducer, type MatchAction, type MatchPlayer, type MatchState } from './engine/match'
import type { Deck } from './engine/deck'
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
  /** Você: nome, lenda e battlefields usados por padrão (atualizado a cada partida). */
  profile: MatchPlayer | null
  /** Seus decks salvos, do mais recente ao mais antigo. */
  decks: Deck[]
  /** A introdução de primeiro uso já foi vista. */
  onboarded: boolean
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
  | { type: 'setProfile'; profile: MatchPlayer }
  | { type: 'saveDeck'; deck: Deck }
  | { type: 'deleteDeck'; id: string }
  | { type: 'setOnboarded'; value: boolean }

const STATE_KEY = 'riftbound-companion/v1'
// As partidas ficam numa chave própria, para não se perderem se o formato do estado mudar.
const RECORDS_KEY = 'riftbound-companion/records/v1'
const DECKS_KEY = 'riftbound-companion/decks/v1'
const HISTORY_LIMIT = 200

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

function reducer(s: AppState, a: AppAction): AppState {
  switch (a.type) {
    case 'newMatch':
      return { ...s, match: a.match, history: [], profile: a.match.players[0] }
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
    case 'setProfile':
      return { ...s, profile: a.profile }
    case 'saveDeck':
      return { ...s, decks: [a.deck, ...s.decks.filter((d) => d.id !== a.deck.id)] }
    case 'deleteDeck':
      return { ...s, decks: s.decks.filter((d) => d.id !== a.id) }
    case 'setOnboarded':
      return { ...s, onboarded: a.value }
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
    profile: saved?.profile ?? null,
    decks: read<Deck[]>(DECKS_KEY) ?? [],
    onboarded: saved?.onboarded ?? false,
  }
}

/** Estado do app, salvo no aparelho para sobreviver a recarregamentos. */
export function useAppStore() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const { match, history, tableMode, records, settings, profile, onboarded } = state
  useEffect(
    () => write(STATE_KEY, { match, history, tableMode, settings, profile, onboarded }),
    [match, history, tableMode, settings, profile, onboarded],
  )
  useEffect(() => write(RECORDS_KEY, records), [records])
  useEffect(() => write(DECKS_KEY, state.decks), [state.decks])
  return [state, dispatch] as const
}

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cardImage, findLegend } from '../data/cards'
import { gameWins, type MatchState } from '../engine/match'
import { computeStats, isMatchRecord, matchOutcome, winRate, type MatchRecord, type StatRow, type Tally } from '../engine/stats'
import type { AppAction } from '../store'
import { battlefieldArt, DomainIcons } from './cards'
import { Brand } from './common'

const percent = (t: Tally) => {
  const rate = winRate(t)
  return rate === null ? '—' : `${Math.round(rate * 100)}%`
}

const record = (t: Tally) => `${t.wins}V ${t.losses}D${t.draws ? ` ${t.draws}E` : ''}`

const OUTCOME_LABEL = { win: 'Vitória', loss: 'Derrota', draw: 'Empate' } as const

function SummaryCard(props: { title: string; tally: Tally; unit: string }) {
  return (
    <div className="stat-card">
      <span className="stat-title">{props.title}</span>
      <b className="stat-value">{percent(props.tally)}</b>
      <span className="stat-sub">
        {props.tally.played} {props.unit} · {record(props.tally)}
      </span>
    </div>
  )
}

/** Linha de tabela com barra de % de vitória. */
function Row(props: { row: StatRow; label: ReactNode; art?: CSSProperties }) {
  const rate = winRate(props.row) ?? 0
  return (
    <li className={`stat-row ${props.art ? 'has-art' : ''}`} style={props.art}>
      <span className="stat-row-label">{props.label}</span>
      <span className="stat-row-record">
        {props.row.played} jogo{props.row.played > 1 ? 's' : ''} · {record(props.row)}
      </span>
      <span className="stat-row-bar">
        <i style={{ width: `${rate * 100}%` }} />
      </span>
      <b className="stat-row-rate">{percent(props.row)}</b>
    </li>
  )
}

function legendLabel(name: string) {
  const legend = findLegend(name)
  if (!legend) return name
  return (
    <>
      <DomainIcons domains={legend.domains} /> {legend.champion} <small>{legend.name}</small>
    </>
  )
}

const legendArt = (name: string) => {
  const legend = findLegend(name)
  return legend ? { backgroundImage: `url("${cardImage(legend, 480)}")` } : undefined
}

function Section(props: { title: string; rows: StatRow[]; render: (row: StatRow) => ReactNode }) {
  if (props.rows.length === 0) return null
  return (
    <section className="card">
      <h2>{props.title}</h2>
      <ol className="stat-rows">{props.rows.map(props.render)}</ol>
    </section>
  )
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export function StatsScreen(props: { records: MatchRecord[]; dispatch: (a: AppAction) => void; onBack: () => void; onAddManual: () => void }) {
  const { records, dispatch } = props
  const [myLegend, setMyLegend] = useState<string | undefined>()
  const stats = useMemo(() => computeStats(records, { myLegend }), [records, myLegend])
  const myLegends = useMemo(() => computeStats(records).byMyLegend.map((r) => r.key), [records])
  const fileInput = useRef<HTMLInputElement>(null)

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ app: 'riftbound-companion', version: 1, records }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `riftbound-partidas-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      const list: unknown[] = Array.isArray(data) ? data : data.records
      const valid = (list ?? []).filter(isMatchRecord)
      if (valid.length === 0) throw new Error('vazio')
      dispatch({ type: 'importRecords', records: valid })
      alert(`${valid.length} partida${valid.length > 1 ? 's' : ''} no arquivo. Partidas repetidas foram ignoradas.`)
    } catch {
      alert('Não foi possível ler esse arquivo. Use um backup exportado pelo Riftbound Companion.')
    }
  }

  const visible = myLegend ? records.filter((r) => r.players[0].legend === myLegend) : records

  return (
    <main className="screen setup stats">
      <button className="link back" onClick={props.onBack}>
        ← Voltar
      </button>
      <Brand title="Estatísticas" subtitle={records.length === 0 ? 'Nenhuma partida registrada ainda' : `${records.length} partida${records.length > 1 ? 's' : ''} registrada${records.length > 1 ? 's' : ''}`} />

      {records.length === 0 ? (
        <section className="card">
          <p>
            As partidas que você terminar no app são salvas aqui automaticamente. Você é sempre o <b className="c0">Jogador 1</b>, o painel de baixo.
          </p>
          <p className="hint">Jogou sem usar o placar? Registre a partida manualmente.</p>
        </section>
      ) : (
        <>
          {myLegends.length > 1 && (
            <div className="chips" role="radiogroup" aria-label="Filtrar pela sua lenda">
              <button className={`chip ${!myLegend ? 'on' : ''}`} onClick={() => setMyLegend(undefined)}>
                Todas as lendas
              </button>
              {myLegends.map((l) => (
                <button key={l} className={`chip ${myLegend === l ? 'on' : ''}`} onClick={() => setMyLegend(l)}>
                  {findLegend(l)?.champion ?? l}
                </button>
              ))}
            </div>
          )}

          <div className="stat-grid">
            <SummaryCard title="Partidas" tally={stats.matches} unit="partidas" />
            <SummaryCard title="Jogos" tally={stats.games} unit="jogos" />
            <SummaryCard title="Começando" tally={stats.goingFirst} unit="jogos" />
            <SummaryCard title="Em segundo" tally={stats.goingSecond} unit="jogos" />
          </div>

          <Section
            title="Suas lendas"
            rows={stats.byMyLegend}
            render={(row) => <Row key={row.key} row={row} label={legendLabel(row.key)} art={legendArt(row.key)} />}
          />
          <Section
            title="Contra lendas"
            rows={stats.byOpponentLegend}
            render={(row) => <Row key={row.key} row={row} label={legendLabel(row.key)} art={legendArt(row.key)} />}
          />
          <Section title="Oponentes (partidas)" rows={stats.byOpponent} render={(row) => <Row key={row.key} row={row} label={row.key} />} />
          <Section
            title="Seus battlefields"
            rows={stats.byMyBattlefield}
            render={(row) => <Row key={row.key} row={row} label={row.key} art={battlefieldArt(row.key)} />}
          />

          <section className="card">
            <h2>Histórico</h2>
            <ol className="history">
              {visible.map((r) => {
                const outcome = matchOutcome(r)
                const [mine, theirs] = gameWins({ format: r.format, games: r.games } as MatchState)
                const me = findLegend(r.players[0].legend)
                const them = findLegend(r.players[1].legend)
                return (
                  <li key={r.id} className={`history-item ${outcome}`}>
                    <div className="history-main">
                      <span className={`result-badge ${outcome}`}>{OUTCOME_LABEL[outcome]}</span>
                      <b>
                        {mine} × {theirs}
                      </b>{' '}
                      vs {r.players[1].name}
                      <button
                        className="icon-btn small"
                        aria-label="Apagar partida"
                        onClick={() => confirm('Apagar esta partida das estatísticas?') && dispatch({ type: 'deleteRecord', id: r.id })}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="hint">
                      {formatDate(r.date)} · {me?.champion ?? 'Lenda ?'} × {them?.champion ?? 'Lenda ?'}
                      {r.source === 'manual' && ' · registrada à mão'}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        </>
      )}

      <button className="primary" onClick={props.onAddManual}>
        + Registrar partida
      </button>
      <div className="row-buttons">
        <button className="secondary" onClick={exportBackup} disabled={records.length === 0}>
          Exportar backup
        </button>
        <button className="secondary" onClick={() => fileInput.current?.click()}>
          Importar backup
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void importBackup(file)
          e.target.value = ''
        }}
      />
      <p className="hint text-center">Os dados ficam só neste aparelho. Exporte um backup de vez em quando.</p>
    </main>
  )
}

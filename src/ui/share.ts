import { findLegend } from '../data/cards'
import { gameWins, type CompletedGame, type MatchFormat, type MatchPlayer, type MatchState } from '../engine/match'
import type { PlayerIndex } from '../engine/types'
import { DOMAIN_COLORS } from './text'

export interface ShareableMatch {
  format: MatchFormat
  players: [MatchPlayer, MatchPlayer]
  games: CompletedGame[]
  date: string
}

const W = 1080
const H = 1350
const PLAYER_COLORS = ['#4cc3ff', '#ff6a5c']

/** Cópia local da arte (mesmo domínio do app), para o canvas poder ser exportado. */
function localArt(player: MatchPlayer): string | null {
  const legend = findLegend(player.legend)
  if (!legend) return null
  const url = player.legendArt && legend.arts.includes(player.legendArt) ? player.legendArt : legend.image
  return `${import.meta.env.BASE_URL}art/legends/${url.split('/').pop()!.split('-')[0]}.webp`
}

function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Desenha a parte de cima da carta (a ilustração) cobrindo a área, recortada num polígono. */
function drawArt(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, clip: [number, number][], area: { y: number; h: number }, tint: string) {
  ctx.save()
  ctx.beginPath()
  clip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = tint
  ctx.fillRect(0, area.y, W, area.h)
  if (img) {
    // Só a ilustração: largura total com sobra, ancorada no topo da carta.
    const scale = (W * 1.15) / img.width
    const w = img.width * scale
    const h = img.height * scale
    const y = area.y + area.h / 2 - h * 0.3
    ctx.drawImage(img, (W - w) / 2, Math.min(area.y, y), w, h)
  }
  ctx.restore()
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') {
  ctx.font = font
  ctx.textAlign = align
  ctx.fillStyle = color
  ctx.shadowColor = 'rgba(0,0,0,0.85)'
  ctx.shadowBlur = 14
  ctx.fillText(value, x, y)
  ctx.shadowBlur = 0
}

/** Nome do jogador e o campeão da lenda, com os losangos dos domínios. */
function playerLabel(ctx: CanvasRenderingContext2D, player: MatchPlayer, index: PlayerIndex, x: number, y: number, align: CanvasTextAlign) {
  const legend = findLegend(player.legend)
  text(ctx, player.name, x, y, '700 72px Cinzel', '#f9eddc', align)
  if (!legend) return
  const label = `${legend.champion.toUpperCase()} · ${legend.name.toUpperCase()}`
  ctx.font = '600 30px "Inter Variable", sans-serif'
  const width = ctx.measureText(label).width
  // 64px à esquerda do texto ficam para os losangos dos domínios.
  const start = align === 'right' ? x - width - 64 : x
  text(ctx, label, start + 64, y + 52, '600 30px "Inter Variable", sans-serif', '#f9eddc')
  legend.domains.forEach((d, i) => {
    ctx.save()
    ctx.translate(start + 14 + i * 26, y + 42)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle = DOMAIN_COLORS[d]
    ctx.fillRect(-8, -8, 16, 16)
    ctx.restore()
  })
  ctx.fillStyle = PLAYER_COLORS[index]
  ctx.fillRect(align === 'right' ? x - 120 : x, y + 72, 120, 6)
}

/** Gera a imagem do resultado da partida (PNG 1080×1350). */
export async function renderResultImage(m: ShareableMatch): Promise<Blob> {
  await Promise.all(['700 72px Cinzel', '700 150px Cinzel', '600 30px "Inter Variable"'].map((f) => document.fonts.load(f).catch(() => undefined)))
  const [artTop, artBottom] = await Promise.all([loadImage(localArt(m.players[1])), loadImage(localArt(m.players[0]))])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#061014'
  ctx.fillRect(0, 0, W, H)

  // Oponente em cima, você embaixo, divididos na diagonal (como na tela de VS).
  drawArt(ctx, artTop, [[0, 0], [W, 0], [W, H * 0.4], [0, H * 0.56]], { y: 0, h: H * 0.56 }, '#3b1814')
  drawArt(ctx, artBottom, [[0, H * 0.56], [W, H * 0.4], [W, H], [0, H]], { y: H * 0.4, h: H * 0.6 }, '#0d2f40')

  // Escurece as bordas para o texto ficar legível.
  const top = ctx.createLinearGradient(0, 0, 0, H * 0.3)
  top.addColorStop(0, 'rgba(6,16,20,0.85)')
  top.addColorStop(1, 'rgba(6,16,20,0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, W, H * 0.3)
  const bottom = ctx.createLinearGradient(0, H * 0.62, 0, H)
  bottom.addColorStop(0, 'rgba(6,16,20,0)')
  bottom.addColorStop(1, 'rgba(6,16,20,0.95)')
  ctx.fillStyle = bottom
  ctx.fillRect(0, H * 0.62, W, H * 0.38)
  const band = ctx.createLinearGradient(0, H * 0.36, 0, H * 0.62)
  band.addColorStop(0, 'rgba(6,16,20,0)')
  band.addColorStop(0.5, 'rgba(6,16,20,0.78)')
  band.addColorStop(1, 'rgba(6,16,20,0)')
  ctx.fillStyle = band
  ctx.fillRect(0, H * 0.36, W, H * 0.26)

  playerLabel(ctx, m.players[1], 1, 64, 120, 'left')
  playerLabel(ctx, m.players[0], 0, W - 64, H - 190, 'right')

  // Faixa central: resultado e placar.
  const [winsA, winsB] = gameWins({ format: m.format, games: m.games } as MatchState)
  const winner: PlayerIndex | null = winsA > winsB ? 0 : winsB > winsA ? 1 : null
  const gold = ctx.createLinearGradient(0, H * 0.43, 0, H * 0.5)
  gold.addColorStop(0, '#fff6e6')
  gold.addColorStop(0.6, '#c8aa6e')
  gold.addColorStop(1, '#9a7b45')
  ctx.shadowColor = 'rgba(239,125,0,0.7)'
  ctx.shadowBlur = 40
  ctx.font = '700 150px Cinzel'
  ctx.textAlign = 'center'
  ctx.fillStyle = gold
  ctx.fillText(winner === null ? 'EMPATE' : 'VITÓRIA', W / 2, H * 0.5)
  ctx.shadowBlur = 0
  if (winner !== null) text(ctx, m.players[winner].name, W / 2, H * 0.5 + 76, '700 56px Cinzel', PLAYER_COLORS[winner], 'center')
  const score = m.format === 'match' ? `${winsA} × ${winsB}` : m.games[0] ? `${m.games[0].finalPoints[0]} × ${m.games[0].finalPoints[1]}` : ''
  text(ctx, score, W / 2, H * 0.5 + 150, '700 60px Cinzel', '#f9eddc', 'center')

  // Rodapé.
  const date = new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  text(ctx, `${m.format === 'match' ? 'Melhor de 3' : 'Jogo único'} · ${date}`, 64, H - 52, '500 30px "Inter Variable", sans-serif', '#8eaab3')
  text(ctx, 'RIFTBOUND COMPANION', W - 64, H - 52, '700 30px Cinzel', '#c8aa6e', 'right')

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), 'image/png'))
}

/** Compartilha a imagem pelo menu do celular; sem suporte, baixa o arquivo. */
export async function shareResult(m: ShareableMatch): Promise<void> {
  const blob = await renderResultImage(m)
  const file = new File([blob], 'riftbound-resultado.png', { type: 'image/png' })
  const [a, b] = m.players
  const summary = `${a.name} × ${b.name} no Riftbound`
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: summary, text: summary })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

import { describe, expect, it } from 'vitest'
import { keywordInfo } from './keywords'
import { EMPTY_FILTER, filterLibrary, librarySets, loadLibrary } from './library'

describe('biblioteca de cartas', async () => {
  const cards = await loadLibrary()

  it('tem uma entrada por carta, com campeões separados pelo título', () => {
    const jinx = cards.filter((c) => c.name.startsWith('Jinx,')).map((c) => c.name)
    expect(jinx).toEqual(expect.arrayContaining(['Jinx, Rebel', 'Jinx, Demolitionist']))
    expect(new Set(cards.map((c) => `${c.name}|${c.subtitle}`)).size).toBe(cards.length)
  })

  it('busca por nome primeiro, depois por texto e tags', () => {
    const r = filterLibrary(cards, { ...EMPTY_FILTER, query: 'jinx' })
    expect(r[0].name.toLowerCase().startsWith('jinx')).toBe(true)
    expect(r.some((c) => !c.name.toLowerCase().startsWith('jinx') && c.tags.includes('Jinx'))).toBe(true)
  })

  it('filtra por tipo, set e domínios (todos os marcados)', () => {
    const r = filterLibrary(cards, { ...EMPTY_FILTER, type: 'legend', domains: ['fury', 'chaos'] })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((c) => c.type === 'legend' && c.domains.includes('fury') && c.domains.includes('chaos'))).toBe(true)
    const origins = filterLibrary(cards, { ...EMPTY_FILTER, set: 'OGN' })
    expect(origins.every((c) => c.set === 'OGN')).toBe(true)
  })

  it('filtra cartas com artes alternativas, incluindo lendas e runas', () => {
    const r = filterLibrary(cards, { ...EMPTY_FILTER, withArts: true })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((c) => c.variants.length > 1)).toBe(true)
    expect(r.some((c) => c.type === 'legend') && r.some((c) => c.type === 'rune')).toBe(true)
  })

  it('lista os sets na ordem de lançamento', () => {
    expect(librarySets(cards)[0].id).toBe('OGN')
  })

  it('explica palavras-chave com ou sem número', () => {
    expect(keywordInfo('Assault 2')?.name).toBe('Assault')
    expect(keywordInfo('Fury')).toBeUndefined()
  })
})

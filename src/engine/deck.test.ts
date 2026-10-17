import { describe, expect, it } from 'vitest'
import { exportDecklist, parseDecklist, validateDeck, type Deck, type DeckCard } from './deck'

const card = (name: string, type: string, domains: DeckCard['domains'], extra: Partial<DeckCard> = {}): DeckCard => ({
  name,
  type,
  super: null,
  domains,
  tags: [],
  text: '',
  ...extra,
})

const CARDS: DeckCard[] = [
  card('Jinx, Rebel', 'unit', ['fury'], { super: 'champion', tags: ['Jinx'] }),
  card('Get Excited!', 'spell', ['fury']),
  card('Zaun Bomber', 'unit', ['chaos']),
  card('Calm Monk', 'unit', ['calm']),
  card('Super Mega Death Rocket!', 'spell', ['fury'], { super: 'signature', tags: ['Jinx'] }),
  card('Lone Relic', 'gear', [], { text: '[Unique] Something.' }),
  card('Fury Rune', 'rune', ['fury']),
  card('Chaos Rune', 'rune', ['chaos']),
  card('Unforgiven', 'legend', ['calm', 'chaos']),
  card('Unforgiven', 'gear', ['calm']),
  card('Loose Cannon', 'legend', ['fury', 'chaos']),
  card("Targon's Peak", 'battlefield', []),
  card('Sand Soldier', 'unit', [], { super: 'token' }),
]
const lookup = (name: string) => CARDS.find((c) => c.name === name)
const JINX = { champion: 'Jinx', domains: ['fury', 'chaos'] as DeckCard['domains'] }

const deck = (cards: Deck['cards'], battlefields: Deck['battlefields'] = ['A', 'B', 'C']): Deck => ({
  id: 'd',
  name: 'Jinx',
  legend: 'Loose Cannon',
  battlefields,
  cards,
  updatedAt: '',
})

const legalCards = [
  { name: 'Jinx, Rebel', count: 3 },
  { name: 'Get Excited!', count: 3 },
  { name: 'Zaun Bomber', count: 31 },
  { name: 'Super Mega Death Rocket!', count: 3 },
  { name: 'Fury Rune', count: 6 },
  { name: 'Chaos Rune', count: 6 },
]

describe('validação de deck (CR 103, TR 402)', () => {
  it('conta Main Deck e runas; numa lista completa, sobra só a pendência real', () => {
    const r = validateDeck(deck(legalCards), JINX, lookup)
    expect(r.mainCount).toBe(40)
    expect(r.runeCount).toBe(12)
    expect(r.issues.map((i) => i.text)).toEqual(['Zaun Bomber: 31 cópias (máximo 3).'])
  })

  it('aponta cópias demais, Unique, Signature demais e tokens', () => {
    const r = validateDeck(
      deck([
        { name: 'Get Excited!', count: 4 },
        { name: 'Lone Relic', count: 2 },
        { name: 'Super Mega Death Rocket!', count: 4 },
        { name: 'Sand Soldier', count: 1 },
      ]),
      JINX,
      lookup,
    )
    const texts = r.issues.map((i) => i.text).join(' | ')
    expect(texts).toContain('Get Excited!: 4 cópias (máximo 3)')
    expect(texts).toContain('Lone Relic: 2 cópias (máximo 1)')
    expect(texts).toContain('4 cartas Signature (máximo 3)')
    expect(texts).toContain('Sand Soldier é um token')
    expect(r.valid).toBe(false)
  })

  it('aponta cartas fora dos domínios da lenda e falta de Chosen Champion', () => {
    const r = validateDeck(deck([{ name: 'Calm Monk', count: 1 }]), JINX, lookup)
    const texts = r.issues.map((i) => i.text).join(' | ')
    expect(texts).toContain('Fora dos domínios da lenda: Calm Monk')
    expect(texts).toContain('Falta um Chosen Champion')
  })

  it('exige 3 battlefields diferentes e uma lenda', () => {
    expect(validateDeck(deck([], ['A', 'A', 'B']), JINX, lookup).issues.some((i) => i.text.includes('nomes diferentes'))).toBe(true)
    expect(validateDeck(deck([], ['A', '', '']), JINX, lookup).issues.some((i) => i.text.includes('1 de 3 battlefields'))).toBe(true)
    expect(validateDeck(deck([]), undefined, lookup).issues.some((i) => i.text.includes('Escolha a lenda'))).toBe(true)
  })

  it('carta desconhecida é só um aviso', () => {
    const r = validateDeck(deck([{ name: 'Carta Inventada', count: 1 }]), JINX, lookup)
    expect(r.issues.find((i) => i.text.includes('Carta Inventada'))?.level).toBe('warning')
  })
})

describe('lista colada', () => {
  it('lê formatos "3 Nome", "3x Nome" e "Nome x3", somando repetidas', () => {
    const r = parseDecklist('3 Jinx, Rebel\n2x Get Excited!\nGet Excited! x1\n6 fury rune', CARDS)
    expect(r.entries).toEqual([
      { name: 'Jinx, Rebel', count: 3 },
      { name: 'Get Excited!', count: 3 },
      { name: 'Fury Rune', count: 6 },
    ])
  })

  it('aceita "Campeão - Título" e reconhece lenda e battlefields pelas seções', () => {
    const r = parseDecklist("Legend:\n1 Unforgiven\nBattlefields:\n1 Targon's Peak\nDeck:\n1 Jinx - Rebel\n2 Unforgiven", CARDS)
    expect(r.legend).toBe('Unforgiven')
    expect(r.battlefields).toEqual(["Targon's Peak"])
    expect(r.entries).toEqual([
      { name: 'Jinx, Rebel', count: 1 },
      { name: 'Unforgiven', count: 2 },
    ])
  })

  it('lista linhas não reconhecidas', () => {
    expect(parseDecklist('2 Carta Inventada\nMain Deck:', CARDS).unknown).toEqual(['Carta Inventada'])
  })

  it('exporta no formato que ela mesma lê', () => {
    const d = deck([{ name: 'Jinx, Rebel', count: 3 }], ["Targon's Peak", '', ''])
    const back = parseDecklist(exportDecklist(d, 'Loose Cannon'), CARDS)
    expect(back.legend).toBe('Loose Cannon')
    expect(back.battlefields).toEqual(["Targon's Peak"])
    expect(back.entries).toEqual(d.cards)
  })
})

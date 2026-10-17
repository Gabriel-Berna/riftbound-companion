/**
 * Regras rápidas em português, para consulta na mesa.
 * Resumo do Core Rules (CR) e do Tournament Rules (TR) de 09/10/2026 — ver docs/regras-riftbound.md.
 */
export interface RuleTopic {
  id: string
  icon: string
  title: string
  summary: string
  points: string[]
  refs: string
}

export const RULE_TOPICS: RuleTopic[] = [
  {
    id: 'vitoria',
    icon: '🏆',
    title: 'Como vencer',
    summary: 'Ter 8 pontos ou mais e mais pontos que todos os oponentes.',
    points: [
      'A vitória é verificada a todo momento (nos cleanups): pontos ≥ 8 E mais pontos que qualquer oponente.',
      'Se dois jogadores passam de 8 empatados, o jogo continua até alguém ficar à frente.',
      'No 2v2 a meta é 11 pontos, compartilhados pela dupla.',
      "Alguns battlefields mudam a meta (Aspirant's Climb: +1) ou dão a vitória direto (The Grand Plaza com 7+ unidades).",
      'Os pontos nunca ficam abaixo de 0.',
    ],
    refs: 'CR 193–196, 474, 491',
  },
  {
    id: 'pontuacao',
    icon: '⚑',
    title: 'Hold e Conquer',
    summary: 'Pontos vêm de segurar e de conquistar battlefields — cada um, no máximo uma vez por turno.',
    points: [
      'Hold: no início do seu turno (Scoring Step da Beginning Phase), você ganha 1 ponto por battlefield que controla.',
      'Conquer: ao ganhar o controle de um battlefield (fim de showdown ou combate), você ganha 1 ponto.',
      'Cada battlefield só pontua uma vez por turno para cada jogador, seja por Hold ou Conquer.',
      'Também dão pontos: efeitos de cartas ("score X points") e o Burn Out do oponente.',
    ],
    refs: 'CR 469–473',
  },
  {
    id: 'ponto-final',
    icon: '🎯',
    title: 'Regra do Ponto Final',
    summary: 'A 1 ponto da vitória, conquistar só dá o ponto se você pontuou todos os battlefields no turno.',
    points: [
      'Vale quando você está a 1 ponto da meta (7 de 8) e pontua por Conquer.',
      'Se ainda não pontuou todos os battlefields neste turno, não ganha o ponto: compra 1 carta no lugar.',
      'Hold e pontos de efeitos de cartas não sofrem essa restrição.',
      'No 2v2, battlefields ocupados pelo parceiro no Scoring Step não contam para a exigência.',
    ],
    refs: 'CR 473.1.b, 491.8.g',
  },
  {
    id: 'turno',
    icon: '⟳',
    title: 'Estrutura do turno',
    summary: 'Awaken → Beginning (Hold) → Channel → Draw → Main → Ending.',
    points: [
      'Awaken: prepare (ready) tudo que você controla.',
      'Beginning: efeitos de início de turno; Temporary morre aqui; depois você pontua por Hold.',
      'Channel: canalize 2 runas do Rune Deck.',
      'Draw: compre 1 (deck vazio = Burn Out).',
      'Main: o rune pool esvazia e você age livremente — jogar cartas, mover, combater.',
      'Ending: efeitos de fim de turno; todas as unidades são curadas, efeitos "neste turno" expiram e o rune pool esvazia.',
    ],
    refs: 'CR 314–317',
  },
  {
    id: 'setup',
    icon: '🎴',
    title: 'Preparação e mulligan',
    summary: 'Compre 4, troque até 2. Quem joga em segundo canaliza 1 runa extra no primeiro turno.',
    points: [
      'Legend na Legend Zone e Chosen Champion na Champion Zone; embaralhe Main Deck e Rune Deck.',
      'Cada jogador compra 4. Mulligan em ordem de turno: separe até 2 cartas, compre o mesmo número e recicle as separadas.',
      '1v1: quem joga em segundo canaliza 1 runa extra no primeiro Channel.',
      'FFA e 2v2: quem começa não compra no primeiro Draw; o último a jogar canaliza 1 runa extra.',
    ],
    refs: 'CR 110–118, 487–491',
  },
  {
    id: 'recursos',
    icon: '◆',
    title: 'Runas, Energy, Power e XP',
    summary: 'Exaurir uma runa dá Energy; reciclar dá Power do domínio dela.',
    points: [
      'Runa básica: [E] (exaurir) → +1 Energy; reciclar a runa → +1 Power do domínio dela.',
      'Energy paga custos numéricos; Power paga custos de domínio; [A] é Power de qualquer domínio.',
      'O rune pool esvazia no início da Main Phase e no fim de cada turno: Energy e Power acumulados se perdem.',
      'XP é um recurso público e sem limite (Hunt dá XP; Level ativa habilidades com N de XP).',
    ],
    refs: 'CR 160–168, 728–733',
  },
  {
    id: 'movimento',
    icon: '➜',
    title: 'Movimento e controle',
    summary: 'Mover custa exaurir a unidade; quem fica sozinho num battlefield controla ele.',
    points: [
      'Standard Move: na sua Main Phase, exaura a unidade para ir da base a um battlefield ou voltar. Ganking permite ir de battlefield a battlefield.',
      'Unidades entram exauridas (a menos que tenham Accelerate) e são jogadas na base ou num battlefield que você controla.',
      'Entrar num battlefield que você não controla aplica Contested e abre um showdown (vazio) ou um combate (com inimigos).',
      'Se você fica sem unidades num battlefield, perde o controle dele.',
      'Recall (voltar para a base) não é movimento.',
    ],
    refs: 'CR 144, 190, 447–460',
  },
  {
    id: 'showdown',
    icon: '⚡',
    title: 'Showdown',
    summary: 'Janela em que os jogadores alternam jogando Action e Reaction.',
    points: [
      'Abre quando um battlefield fica Contested. Quem chegou começa com o Focus.',
      'Em showdown só se jogam cartas e habilidades com Action ou Reaction; com a chain aberta, só Reaction.',
      'Termina quando todos passam em sequência.',
      'Sem combate: se só um jogador tem unidades lá, ele estabelece o controle — e isso é um Conquer.',
    ],
    refs: 'CR 307–313, 341–348',
  },
  {
    id: 'combate',
    icon: '⚔',
    title: 'Combate e dano',
    summary: 'Some o Might de cada lado; o atacante distribui o dano primeiro.',
    points: [
      'Acontece quando unidades de dois jogadores estão no mesmo battlefield. Começa com um showdown de combate.',
      'Dano: cada lado soma o Might das suas unidades; o atacante distribui primeiro, depois o defensor; tudo é causado ao mesmo tempo.',
      'É preciso dar dano letal completo a uma unidade antes de passar para a próxima. Tank recebe primeiro; Backline, por último.',
      'Depois: todas as unidades são curadas e, se ainda houver defensores, os atacantes voltam para a base.',
      'Quem ficar sozinho no battlefield estabelece o controle (Conquer). Dá para conquistar defendendo.',
    ],
    refs: 'CR 461–468',
  },
  {
    id: 'burn-out',
    icon: '🔥',
    title: 'Burn Out',
    summary: 'Precisou comprar com o deck vazio? Recicle o descarte e o oponente ganha 1 ponto.',
    points: [
      'Acontece ao tirar do Main Deck mais cartas do que existem (comprar, Burn, etc.).',
      'Faça o que der, recicle o descarte no Main Deck, escolha um oponente para ganhar 1 ponto e complete a ação.',
      'Burn Outs repetidos podem dar a vitória ao oponente na hora.',
    ],
    refs: 'CR 432',
  },
  {
    id: 'hidden',
    icon: '🂠',
    title: 'Hidden',
    summary: 'Esconda por [A] num battlefield seu; no turno seguinte, jogue como Reaction de graça.',
    points: [
      'Na sua vez, pague [A] para colocar a carta virada para baixo num battlefield que você controla (1 por battlefield).',
      'A partir do próximo turno ela ganha Reaction e pode ser jogada ignorando o custo base.',
      'Os alvos ficam restritos àquele battlefield; unidades e equipamentos escondidos são jogados ali.',
      'Se você perde o controle do battlefield, a carta escondida vai para o descarte.',
    ],
    refs: 'CR 811, 107.3',
  },
  {
    id: 'deck',
    icon: '🃏',
    title: 'Construção de deck',
    summary: 'Lenda, 40 cartas, 12 runas e 3 battlefields.',
    points: [
      '1 Legend (define a Domain Identity: as cartas precisam ser dos domínios dela).',
      'Main Deck com 40 cartas (exatamente 40 em torneio), incluindo o Chosen Champion da Legend; até 3 cópias por nome (Unique: 1).',
      'Até 3 cartas Signature, todas do campeão da Legend.',
      'Rune Deck com 12 runas e 3 battlefields com nomes diferentes. Sideboard de até 10 cartas em torneio.',
    ],
    refs: 'CR 101–103, TR 402–403, 601',
  },
  {
    id: 'partida',
    icon: '⏱',
    title: 'Melhor de 3 e tempo',
    summary: 'Quem perdeu escolhe se começa; tempo esgotado = 3 turnos extras.',
    points: [
      'Primeiro jogo: sorteio define quem escolhe começar ou não. Depois, quem perdeu o jogo anterior escolhe (empate mantém a ordem).',
      'Battlefields usados num jogo com vencedor não voltam na partida.',
      'Rodada recomendada: 60 minutos. Ao acabar, o jogador da vez termina o turno e vêm 3 turnos extras; depois, vence quem tiver 2+ pontos de vantagem, senão empata.',
      'Se o tempo acaba entre jogos, nenhum jogo novo começa: vence quem tem mais vitórias.',
    ],
    refs: 'TR 404–408, 604',
  },
]

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Tópicos que contêm o termo no título, no resumo ou nos detalhes. */
export function searchRules(query: string): RuleTopic[] {
  const q = normalize(query.trim())
  if (!q) return RULE_TOPICS
  return RULE_TOPICS.filter((t) => [t.title, t.summary, ...t.points].some((s) => normalize(s).includes(q)))
}

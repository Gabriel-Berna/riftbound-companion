/**
 * Explicações em português das palavras-chave e ações que aparecem entre colchetes no texto das cartas.
 * Fonte: Core Rules (CR 805–832 para palavras-chave; CR 413–446 para ações). Ver docs/regras-riftbound.md.
 */
export const KEYWORDS: Record<string, string> = {
  Accelerate: 'Custo adicional opcional (normalmente [1] + 1 Power do domínio da unidade): se pago, a unidade entra preparada (ready) em vez de exaurida.',
  Action: 'Pode ser jogada também durante showdowns, em qualquer turno, além do momento normal.',
  Reaction: 'Pode ser jogada a qualquer momento, inclusive em resposta a outras cartas na chain e no turno do oponente. Inclui tudo o que Action permite.',
  Assault: 'Enquanto ataca, a unidade ganha +X de Might (X = o número; sem número, 1). Valores de várias fontes se somam.',
  Shield: 'Enquanto defende, a unidade ganha +X de Might (X = o número; sem número, 1). Valores de várias fontes se somam.',
  Tank: 'No dano de combate, precisa receber dano letal antes das outras unidades do mesmo jogador que não têm Tank.',
  Backline: 'No dano de combate, só recebe dano depois de todas as outras unidades do mesmo jogador sem Backline.',
  Deathknell: '"Quando eu morrer, …": o efeito acontece quando a permanente morre e vai para o descarte, usando as informações de quando ela estava em jogo.',
  Deflect: 'Spells e habilidades do oponente que escolherem esta permanente custam X Power a mais (de qualquer domínio).',
  Ganking: 'A unidade pode usar o movimento padrão para ir de um battlefield direto para outro.',
  Hidden: 'Pague [A] para esconder a carta virada para baixo num battlefield que você controla. A partir do próximo turno ela ganha Reaction e pode ser jogada sem pagar o custo base; os alvos ficam restritos àquele battlefield.',
  Legion: 'A habilidade marcada fica ativa se você já jogou outra carta neste turno.',
  Temporary: 'A permanente morre no início da Beginning Phase do controlador, antes da pontuação.',
  Vision: 'Ao jogar: Predict (olhe a carta do topo do Main Deck e escolha se recicla).',
  Equip: 'Pague o custo para anexar este equipamento a uma unidade sua. O texto de efeito do equipamento passa a valer para a unidade.',
  'Quick-Draw': 'O equipamento tem Reaction e, ao ser jogado, já se anexa a uma unidade sua.',
  Repeat: 'Custo adicional opcional: se pago, o efeito é executado mais uma vez (continua contando como uma única carta jogada).',
  Weaponmaster: 'Ao jogar: você pode equipar um Equipment seu nesta unidade pagando o custo de Equip com [A] de desconto, mesmo que ele já esteja anexado a outra unidade.',
  Ambush: 'Pode ser jogada como Reaction num battlefield onde você tem unidades.',
  Hunt: 'Quando esta unidade conquistar ou segurar um battlefield, você ganha X XP (sem número, 1).',
  Level: 'A habilidade marcada fica ativa enquanto você tiver pelo menos N de XP.',
  Unique: 'Seu deck só pode ter 1 cópia desta carta.',
  Empower: 'Pague o custo para deixar esta permanente Empowered (só se ainda não estiver).',
  Empowered: 'A habilidade marcada fica ativa enquanto esta permanente estiver Empowered.',
  Flow: 'Pode ser jogada do seu descarte pagando o custo de Flow; depois disso, é banida.',
  Deploy: 'Equipamento que pode ser jogado em qualquer battlefield e fica lá (não volta para a base). Morre quando um oponente segura aquele battlefield.',
  Disarm: 'Ao atacar: dê -X de Might a uma unidade inimiga no mesmo battlefield neste turno (sem número, 1).',
  'Show Off': 'Ao jogar, você pode revelar uma carta da mão ou escolher um objeto seu no tabuleiro com a característica pedida. As informações dele ficam "travadas" naquele momento.',
  // Ações e termos (CR 413–446, 706)
  Add: 'Adiciona Energy ou Power ao seu rune pool. O pool esvazia no início da Main Phase e no fim do turno.',
  Buff: 'Coloca um marcador de +1 de Might na unidade, se ela ainda não tiver um.',
  Stun: 'A unidade atordoada não causa dano de combate neste turno.',
  Predict: 'Olhe a(s) carta(s) do topo do Main Deck; recicle as que quiser e devolva as outras na ordem que preferir.',
  Burn: 'Coloque X cartas do topo do seu Main Deck no descarte. Se o deck acabar, você sofre Burn Out.',
  Mighty: 'Uma unidade é Mighty enquanto tiver 5 ou mais de Might.',
}

/** Explicação de uma palavra-chave do texto (ex.: "Assault 2" → Assault), ou `undefined`. */
export function keywordInfo(token: string): { name: string; text: string } | undefined {
  const name = token.replace(/\s+\d+$/, '')
  const text = KEYWORDS[name]
  return text ? { name, text } : undefined
}

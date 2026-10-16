# Riftbound: base de conhecimento das regras

Resumo consolidado das regras oficiais, para uso no desenvolvimento do app.
Fontes completas em [`fontes/`](fontes/). Os números entre parênteses (ex.: CR 469)
referem-se às regras do Core Rules (CR) ou do Tournament Rules (TR).

**Versões consultadas (16/10/2026):**
- Core Rules: atualizado em 2026-10-09 (inclui o set Radiance, em vigor a partir de 16/10/2026)
- Tournament Rules: atualizado em 2026-10-09
- Patch notes: Origins (out/2025), Spiritforged (dez/2025), Unleashed (abr/2026), Vendetta (jul/2026), Radiance (out/2026)
- Erratas: Origins, Spiritforged, Unleashed, Vendetta, Radiance
- **Próxima grande mudança:** em janeiro de 2027, com o set *Legacy*, o documento de regras será totalmente reescrito
  (só reorganização, sem mudança de mecânica, segundo a Riot). Vários "choose" nas cartas virarão "pick".

Fonte oficial: https://playriftbound.com/en-us/rules-hub/

---

## 1. Princípios gerais

- **Golden Rule (CR 002):** o texto da carta prevalece sobre as regras.
- **Silver Rule (CR 051):** o texto das cartas é interpretado segundo as regras.
- **"Can't" vence "Can" (CR 054).**
- **DAMAYC (CR 055):** "faça o máximo que puder", ignorando instruções impossíveis.
- **Null não é zero:** informação numérica indisponível vira *null*, não 0. Exemplo: o Might de uma unidade que saiu do tabuleiro.
- A Riot **não usa errata nem mudanças de regra para balancear cartas**. As erratas existem só para dar clareza e corrigir erros.

## 2. Construção de deck (CR 101–103, TR 402–403, 601)

| Componente | Regra |
|---|---|
| Champion Legend | 1. Define a **Domain Identity** (os domínios permitidos no deck). |
| Chosen Champion | Unidade campeã com a mesma *tag* da Legend. Começa na Champion Zone. Conta para o limite de cópias. Qualquer cópia com o mesmo nome também é o Chosen Champion. |
| Main Deck | No mínimo 40 cartas (**exatamente 40 em torneio**), incluindo o Chosen Champion. **Máximo de 3 cópias por nome.** |
| Signature cards | No máximo 3 no total, todas com a tag do campeão da Legend. Não podem ser Chosen Champion. |
| Unique | Só 1 cópia por nome. |
| Rune Deck | Exatamente 12 runas, dentro da Domain Identity. |
| Battlefields | 3 (em 1v1, FFA e 2v2), todos com nomes diferentes. Em 2v2, a dupla não pode repetir battlefields entre si. |
| Sideboard (torneio) | Até 10 cartas. O limite de cópias vale para Main Deck + sideboard somados. A troca é 1 por 1 (no Constructed). Runas, Legend e Battlefields não podem ser trocados. |

- **Domínios (6):** Fury, Calm, Mind, Body, Chaos, Order.
- Cartas de vários domínios só entram se a Legend tiver todos eles. Cartas sem domínio (Neutral) entram em qualquer deck.
- **Neeko, Blending In** (Radiance): permite escolher até 3 lendas extras ao montar o deck. Em torneio, elas precisam ser registradas.
- **Standard atual:** OGS (Proving Grounds), Origins (OGN), Spiritforged (SFD), Unleashed (UNL), Vendetta (VEN), Radiance (RAD, lançamento em 23/10/2026).

## 3. Zonas

- **Base:** a de cada jogador. Lá ficam as permanentes e as runas.
- **Battlefields:** cada um é uma *location*. Cada battlefield tem uma **Facedown Zone** com capacidade para 1 carta, usada pelo Hidden.
- **Legend Zone** e **Champion Zone** (capacidade 1).
- **Zonas fora do tabuleiro:** Main Deck (secreto), Rune Deck, Hand, Trash, Banishment e a Chain.

## 4. Setup (CR 110–118)

1. A Legend vai para a Legend Zone e o Chosen Champion para a Champion Zone.
2. Os battlefields são separados e escolhidos conforme o modo de jogo.
3. Cada jogador embaralha o Main Deck e o Rune Deck.
4. A ordem de turno é definida por um método aleatório justo.
5. Cada jogador **compra 4**.
6. **Mulligan:** separe até 2 cartas, compre a mesma quantidade e recicle as separadas (elas vão para o fundo do deck).
7. O primeiro jogador começa.

## 5. Recursos

- **Runas:** cada runa básica tem duas habilidades, ambas com *Reaction*:
  - `[E]` (exaurir) → adiciona **1 Energy**.
  - **Reciclar a runa** → adiciona **1 Power** do domínio dela.
- **Rune Pool:** guarda a Energy e o Power disponíveis. **Esvazia no início da Main Phase e no fim de cada turno.**
- Energy não tem domínio. Power tem domínio, e `[A]` significa Power de qualquer domínio.
- Desde o Vendetta, **pagar Energy/Power é sempre opcional** quando uma instrução manda pagar. Se o jogador não paga, a instrução é ignorada.
- Em cartas com vários domínios, `[C]` só pode ser pago com Power de um dos domínios da carta.
- **XP** (desde o Unleashed):
  - É um recurso público, sem limite, e **não é compartilhado com o parceiro** no 2v2.
  - Ganha-se XP com **Hunt X** ("quando eu conquistar ou segurar, ganhe X XP") e com outros efeitos.
  - **Level N** ativa uma habilidade enquanto o jogador tiver N ou mais de XP.
- **Buffs:** são contadores de +1 Might. Uma unidade só pode ter um buff ("Buff" dá +1 se ela ainda não tiver).

## 6. Estrutura do turno (CR 314–317)

1. **Awaken:** prepara (ready) tudo que o jogador controla.
2. **Beginning:**
   - *Beginning Step:* efeitos de "início da Beginning Phase". **Temporary** mata a permanente aqui, antes da pontuação.
   - *Scoring Step:* o jogador **Holds** (segura e pontua) cada battlefield que controla.
3. **Channel:** canaliza 2 runas do Rune Deck (ou quantas houver).
4. **Draw:** compra 1. Se o deck estiver vazio, acontece o **Burn Out** (seção 8).
5. **Main:**
   - O rune pool esvazia e os efeitos de início da Main Phase acontecem.
   - Depois as ações são livres: jogar cartas, mover unidades, ativar habilidades, combates e showdowns.
   - O jogador declara quando quer encerrar o turno.
6. **Ending:**
   - *Ending Step:* efeitos de fim de turno.
   - *Expiration Step:* **cura todas as unidades**, os efeitos "neste turno" expiram e o rune pool esvazia. Esse passo se repete se algo foi processado durante ele.

**Ajustes no primeiro turno (por modo):**
- No 1v1, o jogador que joga em segundo canaliza **1 runa extra** no primeiro Channel.
- Em FFA e 2v2, o primeiro jogador **não compra** no primeiro Draw e o último canaliza 1 runa extra.

**Turnos adicionais** (ex.: Time Warp): entram logo depois do turno atual e não alteram a ordem de turno.

## 7. Estados do turno, Chain e prioridade

- **Neutral × Showdown:** em Showdown, só podem ser jogadas cartas e habilidades com **Action** ou **Reaction**.
- **Open × Closed:** se existe uma Chain, o estado é Closed e só **Reaction** pode ser jogada.
- **Priority:** é o direito exclusivo de agir. **Focus:** é de quem é a vez de agir dentro de um showdown.
- **HOT FEPR:** a ordem de processamento é *Handle Outstanding Tasks*, depois *Finalize*, *Execute*, *Pass* e *Resolve*.
- **Cleanups** acontecem o tempo todo e se repetem até nada mais mudar. A ordem é (CR 323):
  1. Vitória: quem tem pontos ≥ Victory Score e mais pontos que todos vence.
  2. Ajustar as designações de atacante e defensor.
  3. Unidades com dano letal morrem.
  4. Perda de controle de battlefields vazios, se o estado for Open e não houver showdown ou combate lá.
  5. Recall de gear e runas fora do lugar. Cartas Hidden em battlefields de outro controlador vão para o Trash.
  6. a 10. Preparar (stage) showdowns e combates, remover o status Contested e abrir o showdown ou combate escolhido pelo jogador da vez.

## 8. Pontuação e vitória (CR 193–196, 469–474, 432)

- **Victory Score:** 8 (11 no 2v2).
- **Vitória:** num cleanup, ter pontos **≥ Victory Score E mais pontos que todos os oponentes**. Se houver empate acima do alvo, o jogo continua.
- **Formas de ganhar ponto:**
  - **Hold:** controlar um battlefield durante a sua Beginning Phase.
  - **Conquer:** ganhar o controle de um battlefield.
  - Efeitos de cartas ("score X points").
  - **Burn Out** do oponente.
- **Cada battlefield só pontua uma vez por turno**, seja por Hold ou por Conquer.
- **Regra do Ponto Final (CR 473.1.b):**
  - Vale quando o jogador está a 1 ponto da vitória (ou mais perto) e pontua por **Conquer**.
  - Ele só ganha o ponto se tiver pontuado **todos os battlefields naquele turno**. Se não tiver, **compra 1 carta** em vez do ponto.
  - Hold e efeitos de cartas não têm essa restrição.
- **Burn Out:**
  - Acontece quando o jogador precisa tirar do Main Deck mais cartas do que existem.
  - Ele faz o que conseguir, recicla o Trash para dentro do Main Deck, **escolhe um oponente para ganhar 1 ponto** e completa a ação.
  - Burn Outs repetidos em sequência podem dar a vitória imediata, sem esperar o cleanup.
- Os pontos nunca ficam abaixo de 0.
- "Score X points" no texto de uma carta significa *ganhar pontos*. "Score" sozinho, sem número, se refere ao processo de pontuar.

## 9. Movimento, controle e combate

### Movimento (CR 144, 447–460)
- **Standard Move:** custa exaurir a unidade. Só pode ser feito na Main Phase, em estado Neutral Open.
  - Destinos permitidos: da Base para um Battlefield, ou de um Battlefield para a Base.
  - Com **Ganking**, também de um Battlefield para outro.
  - Várias unidades podem se mover juntas, desde que para o mesmo destino.
- **Unidades entram exauridas** (a menos que tenham Accelerate). Por padrão, são jogadas na Base ou num battlefield que o jogador controla.
- **Recall:** é voltar para a Base sem que isso conte como movimento. Não ativa gatilhos de movimento.

### Controle de battlefields (CR 190)
- Uma unidade que chega a um battlefield que o jogador não controla aplica o status **Contested** a ele.
- O **controle é estabelecido** ao final de um showdown ou combate.
- Quem tem unidades num battlefield mantém o controle. Se ficar sem unidades num estado Open, perde o controle no cleanup seguinte, a menos que haja showdown ou combate em andamento lá.
- Quem controla o battlefield controla as habilidades dele. Num battlefield sem controlador, quem cuida das habilidades é o jogador da vez.

### Showdown (CR 341–348)
- **Abre** quando um battlefield está Contested.
- Os jogadores se alternam via Focus e só podem jogar Action ou Reaction. O showdown **termina quando todos passam em sequência**.
- **Showdown sem combate:** se ao final só um jogador tiver unidades lá, ele estabelece o controle, o que conta como **Conquer**.

### Combate (CR 461–468)
- Acontece quando há unidades de **dois** jogadores no mesmo battlefield. O combate só pode envolver 2 jogadores.
- **1. Combat Showdown:**
  - O **atacante** é quem aplicou o Contested e começa com Focus.
  - Os gatilhos de ataque e de defesa disparam uma vez por combate.
- **2. Dano:**
  - Some o Might de cada lado.
  - **O atacante distribui o dano primeiro**, depois o defensor.
  - É obrigatório atribuir dano letal completo a uma unidade antes de passar para a próxima.
  - **Tank** recebe dano primeiro e **Backline** por último.
  - Todo o dano é causado de forma simultânea.
- **3. Resolução:**
  - *Combat Cleanup:* cura todas as unidades. Se ainda houver defensores, os atacantes voltam para a Base (recall).
  - **Resultado:** vence quem for o único com unidades restantes. Se os dois ou nenhum tiverem unidades, não há resultado.
  - Quem ficou com unidades **estabelece o controle**, o que conta como **Conquer** se aquele battlefield ainda não pontuou no turno. Também é possível conquistar defendendo.
- **Might < 0** é tratado como 0. Uma unidade com Might ≥ 5 é **Mighty**.
- **Dano letal:** dano diferente de zero que seja ≥ Might.
- O dano é curado no fim de cada turno e no Combat Cleanup.

## 10. Modos de jogo (CR 483–491)

| Modo | Jogadores | Victory Score | Battlefields | Formato | Primeiro turno |
|---|---|---|---|---|---|
| 1v1 Duel | 2 | 8 | 2 (1 de cada, sorteado entre os 3) | Melhor de 1 | O 2º jogador canaliza +1 runa |
| 1v1 Match | 2 | 8 | 2 (cada um **escolhe** 1) | Melhor de 3 (ou 5) | O 2º jogador canaliza +1 runa |
| FFA3 Skirmish | 3 | 8 | 3 (1 de cada, sorteado) | Melhor de 1 | O 1º não compra; o último canaliza +1 runa |
| FFA4 War | 4 | 8 | 3 (o 1º jogador não contribui) | Melhor de 1 | O 1º não compra; o último canaliza +1 runa |
| 2v2 Magma Chamber | 4 | **11** | 3 (o 1º jogador não contribui) | Melhor de 1 | O 1º não compra; o último canaliza +1 runa |

**Melhor de 3 (1v1 Match):**
- O battlefield usado num jogo que teve vencedor não pode ser usado de novo na partida. Se o jogo empatou, os battlefields podem ser repetidos.
- No melhor de 5, nos jogos 4 e 5, é permitido reutilizar um battlefield já apresentado, no máximo 2 vezes, e só depois de ter apresentado todos os 3.
- **Quem perdeu o jogo anterior escolhe se começa ou não.** Se houve empate, mantém-se a ordem anterior (TR 407).

**2v2:**
- Os pontos são **compartilhados** pela dupla. O XP **não** é.
- A ordem de turno alterna entre as duplas.
- Os parceiros não podem usar a mesma Legend nem os mesmos battlefields.
- Cada battlefield pontua uma vez por dupla por turno.
- Um battlefield controlado pelo parceiro durante o Scoring Step não pode ser pontuado pela dupla naquele turno.
- **Ponto final por Conquer:** é preciso pontuar todos os battlefields, exceto os que estavam ocupados pelo parceiro no Scoring Step. Essas restrições só valem no turno de um dos membros da dupla.
- Se um parceiro conceder, a dupla perde.

**Em modos com mais de 2 jogadores:**
- Não é possível mover unidades nem jogá-las num battlefield com combate em andamento ou preparado entre outros dois jogadores.
- Ninguém se move para um battlefield ocupado pelo próprio parceiro.

## 11. Palavras-chave (CR 805–832)

| Palavra-chave | Resumo |
|---|---|
| **Accelerate** | Custo adicional opcional `[1][C]`: a unidade entra preparada (ready). |
| **Action** | Pode ser jogada em showdowns, em qualquer turno. |
| **Reaction** | Tudo o que Action permite e também pode ser jogada em estado Closed (com a chain aberta). |
| **Assault X** | +X de Might enquanto atacante. Valores de várias fontes se somam. |
| **Shield X** | +X de Might enquanto defensor. Valores se somam. |
| **Tank** | Precisa receber dano letal antes das outras unidades. |
| **Backline** | Recebe dano letal por último. |
| **Deathknell** | "Quando eu morrer, …". Usa as informações de quando a permanente estava no tabuleiro. |
| **Deflect X** | Oponentes pagam +X de Power (de qualquer domínio) para escolher esta permanente como alvo. |
| **Ganking** | Standard Move de um battlefield para outro. |
| **Hidden** | Paga `[A]` para esconder a carta virada para baixo num battlefield que o jogador controla. A partir do turno seguinte, ela ganha Reaction e pode ser jogada sem pagar o custo base. Os alvos ficam restritos àquele battlefield. |
| **Legion** | Habilidade ativa se o jogador já jogou outra carta no turno. |
| **Temporary** | Morre no início da Beginning Phase do controlador, antes da pontuação. |
| **Vision** | Ao jogar: Predict (olhe o topo do deck e escolha se recicla a carta). |
| **Equip** | Custo: anexa este equipamento a uma unidade que o jogador controla. |
| **Quick-Draw** | O equipamento tem Reaction e se anexa ao ser jogado. |
| **Repeat** | Custo adicional opcional: executa o efeito mais uma vez. Continua contando como uma única jogada. |
| **Weaponmaster** | Ao jogar: equipa um Equipment (mesmo que já esteja anexado) pagando `[A]` a menos. |
| **Ambush** | Pode ser jogada como Reaction num battlefield onde o jogador tem unidades. |
| **Hunt X** | Quando conquistar ou segurar um battlefield, ganha X XP. |
| **Level N** | Habilidade ativa com N ou mais de XP. |
| **Unique** | Só 1 cópia por deck. |
| **Empower** | Custo: torna esta permanente Empowered (só se ainda não for). |
| **Empowered** | Habilidade ativa enquanto a permanente estiver Empowered. |
| **Flow** | Pode ser jogada do Trash pelo custo de Flow; depois é banida. |
| **Deploy** | Gear que pode ser jogado em qualquer battlefield e não volta para a Base. Morre quando um oponente segura aquele battlefield. |
| **Disarm X** | Ao atacar: dá -X de Might a uma unidade inimiga no mesmo battlefield. |
| **Show Off** | Revela uma carta da mão ou escolhe um objeto aliado. As informações dele ficam "travadas" naquele momento. |

**Ações-chave:**
- **Burn X:** coloca X cartas do topo do deck no Trash.
- **Predict:** olha o topo do deck e recicla as cartas que quiser.
- **Recycle:** coloca a carta no fundo do deck correspondente. Se forem várias ao mesmo tempo no Main Deck, a ordem é aleatória.
- **Skip:** pula um evento ou procedimento do turno.
- **Prevent:** previne dano.
- **Replace:** substitui um objeto por um token.
- **Copy:** copia as características copiáveis de outro objeto.

## 12. Linha do tempo das mudanças relevantes

### Origins (out/2025, 1º patch)
- Silver Rules ("can't" vence "can", DAMAYC).
- O sistema de "Relevant Players" no FFA foi removido.
- Sistema de pending/finalize (FEPR).
- Gatilhos de ataque e de defesa disparam uma vez por combate.
- Layers passam a se aplicar em loop.
- Controle de battlefield fica travado enquanto ele está Contested.
- 2v2: parceiros não podem repetir Legend nem battlefields.

### Spiritforged (dez/2025)
- Mecânicas novas: Attach/Equip/Quick-Draw/Weaponmaster, texto inativo, Repeat, Double e Swap.
- Deathknell foi corrigido.
- Local padrão para jogar unidades definido: a Base ou um battlefield controlado.

### Unleashed (abr/2026)
- Mecânicas novas: **XP, Hunt, Level**, símbolo `[>]`, palavras-chave dependentes, Ambush.
- **Vitória redefinida:** é verificada no cleanup, com pontos ≥ alvo e mais pontos que todos.
- Showdown pode virar combate. O passo de resolução do combate foi reorganizado.
- Gatilhos com "you may" passaram a ser opcionais.
- Sistema HOT FEPR. O Expiration Step passou a se repetir.
- "Action phase" foi renomeada para **Main Phase** e "End of Turn" para **Ending Phase**.
- Regras para turnos adicionais, Prevent, Replace, Create, Predict, Unique e Backline.

### Vendetta (jul/2026)
- Mecânicas novas: **Empower, Flow, Burn, Skip**, nomear cartas e tags, Untargetable.
- **Pagar Energy/Power passou a ser opcional.**
- `[C]` em carta de vários domínios só aceita Power dos domínios da carta.
- Token deixou de ser supertipo.
- Remoção do status Contested definida.
- Pontos compartilhados no 2v2 foram explicitados.
- Regras de reutilização de battlefields no melhor de 5.

### Radiance (out/2026)
- Mecânicas novas: **Deploy, Disarm, Show Off**.
- Layer próprio para efeitos de cópia, ação Copy e "Pick".
- Unidades não podem ser anexadas a outros objetos.
- Item pendente na chain não pode ser alvo.
- Pontuação do 2v2 alinhada: as restrições só valem no turno da própria dupla.
- Instruções *ignored* × *negated* definidas.

## 13. Regras de torneio relevantes para o app (TR)

- A partida é normalmente melhor de 3. A rodada recomendada no Swiss é de **60 minutos**.
- **Quando o tempo acaba (TR 408.2):**
  - O jogador da vez termina o turno.
  - Jogam-se **mais 3 turnos**.
  - Se o jogo não acabar, vence quem tiver **2 ou mais pontos de vantagem**. Se ninguém tiver, é empate.
  - Os jogadores precisam comunicar em qual turno extra estão (TR 502.4.b).
- **Eliminação simples com tempo (TR 408.4):** há um procedimento próprio, com morte súbita no próximo ponto e 5 turnos extras se for preciso começar um novo jogo.
- **Desempate (TR 409):**
  1. Média de % de vitórias de partidas dos oponentes.
  2. % de vitórias de jogos.
  3. Média de % de vitórias de jogos dos oponentes.
- **Placar em dispositivo eletrônico só é permitido em eventos de nível baixo** (low OPL, TR 415.3.a). Em OPL alto, eletrônicos não podem ser usados durante as partidas (TR 417).
- Os jogadores precisam representar de forma clara o XP e a Energy/Power acumulados (TR 415.4).

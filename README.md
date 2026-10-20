# Riftbound Companion

App de celular (PWA) de apoio para partidas do TCG físico **Riftbound** (Riot Games).

## Funcionalidades (v0.1)

- **Início**: arte da sua lenda, retrospecto, botão de nova partida, revanche em um toque, atalhos e últimas partidas.
- **Nova partida em formato de duelo**: retratos das duas lendas, oponentes recentes em um toque, battlefields opcionais recolhidos.
- **Ajustes**: perfil (nome, lenda principal e arte), preferências, introdução e aviso legal.
- **Primeiro uso guiado**: três telas de introdução com artes das lendas (reabre pelos Ajustes).
- **Artes alternativas**: escolha a arte de cada lenda (perfil, nova partida e decks); na biblioteca, filtro para cartas com artes alternativas e galeria de artes no detalhe.
- **Timer de rodada** (opcional, 50 ou 60 min): relógio na faixa do turno, pausa no menu e, ao acabar o tempo, os 3 turnos extras e o desempate do Tournament Rules (TR 408.2).
- **Meus decks**: lenda, arte, 3 battlefields e lista de cartas (colar de sites de decks ou montar pela biblioteca), validação das regras de construção (CR 103, TR 402), copiar a lista e escolher o deck ao iniciar a partida. Estatísticas por deck.
- **Compartilhar resultado**: imagem com as artes das lendas e o placar, pelo menu de compartilhar do celular.
- **Regras rápidas**: resumo pesquisável do Core Rules e do Tournament Rules e glossário de palavras-chave, também durante a partida.

- **Placar de um toque**: cada jogador tem metade da tela com a arte da sua lenda. Tocar na metade esquerda registra um ponto de **Hold**; na direita, de **Conquer**, com som, vibração e animação diferentes. O app não acompanha turnos: o celular só é tocado quando alguém pontua.
- **Regra do Ponto Final** (CR 473.1.b): num Conquer a 1 ponto da vitória, o app pergunta se o jogador já pontuou todos os battlefields no turno; se não, o ponto é barrado (compra 1 carta).
- **Ajustes de cada jogador** (⋯ no canto da lenda): −1 ponto para corrigir, +1 por efeito de carta, XP, Burn Out, vitória por efeito e concessão. Empate e abandono ficam no menu.
- **Histórico** do jogo e **desfazer**, também direto no aviso que aparece a cada ponto.
- **Melhor de 3** e **jogo único**: battlefields usados saem da partida, quem perdeu escolhe quem começa.
- **Biblioteca de cartas**: as 1.103 cartas da galeria oficial, com busca por nome, texto ou tag, filtros por tipo, domínio e set, detalhes com custos, Might, artes alternativas e palavras-chave explicadas em português. Abre também durante a partida.
- **Visual de jogo**: tela de VS com as artes das lendas antes de cada jogo, tela de vitória com a arte da lenda vencedora e partículas, moeda animada no sorteio, animações ao pontuar e ao conquistar, brilho do painel nas cores dos domínios da lenda.
- **Preferências** (menu da partida): sons sintetizados (desligados por padrão), vibração ao pontuar e tela sempre ligada durante a partida.
- **Estatísticas**: cada partida encerrada é salva no aparelho (você é sempre o Jogador 1). % de vitória por partida, por jogo, começando ou em segundo, por lenda sua, por lenda do oponente, por oponente e por battlefield, com filtro pela sua lenda, gráfico da evolução da % de vitórias e mapa de confrontos (suas lendas × lendas dos oponentes). Registro manual de partidas jogadas sem o app e backup em arquivo (exportar/importar).
- **Lendas** de cada jogador, com busca por campeão, título ou domínio: a arte da lenda ocupa o placar do jogador.
- **Banco de battlefields** da galeria oficial: busca por nome com a arte de cada um, habilidade consultável durante o jogo e regras especiais (ex.: Aspirant's Climb aumenta o alvo para 9 pontos).
- Painel do oponente girado para jogar frente a frente, e funciona offline.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm test         # testes das regras (Vitest)
npm run build    # verificação de tipos + build de produção
npm run sync-cards  # atualiza battlefields, lendas e a biblioteca (src/data/) a partir da galeria oficial
```

A lógica do jogo fica em `src/engine/` (sem dependência de interface, com testes) e a interface em `src/ui/`.

## Publicação

Cada push no `main` roda os testes e publica no GitHub Pages (`.github/workflows/deploy.yml`).

## Aviso legal

Riftbound Companion não é endossado pela Riot Games e não reflete as opiniões da Riot Games ou de qualquer pessoa envolvida na produção ou gestão de propriedades da Riot Games. Riot Games e todas as propriedades associadas são marcas comerciais ou registradas da Riot Games, Inc. Projeto de fã, gratuito e sem fins comerciais.

## Documentação das regras

- [`docs/regras-riftbound.md`](docs/regras-riftbound.md): resumo consolidado das regras oficiais (Core Rules e Tournament Rules de 09/10/2026, com Radiance).
- [`docs/fontes/`](docs/fontes/): documentos oficiais, patch notes e erratas usados como fonte.

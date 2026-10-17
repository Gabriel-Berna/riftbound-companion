# Riftbound Companion

App de celular (PWA) de apoio para partidas do TCG físico **Riftbound** (Riot Games).

## Funcionalidades (v0.1)

- **Placar por battlefield**: registra Hold e Conquer, impede pontuar o mesmo battlefield duas vezes no turno e aplica a **regra do Ponto Final** (CR 473.1.b).
- **Um toque por turno**: o botão "Passar a vez" faz o Hold automático dos battlefields do novo jogador, esvazia o rune pool e lembra da runa extra de quem joga em segundo.
- **Recursos**: XP e rune pool (Energy e Power por domínio), que esvazia sozinho nos momentos certos.
- **Burn Out**, pontos por efeito de carta, concessão e empate.
- **Histórico** do jogo e **desfazer**.
- **Melhor de 3** e **jogo único**: battlefields usados saem da partida, quem perdeu escolhe quem começa.
- **Biblioteca de cartas**: as 1.103 cartas da galeria oficial, com busca por nome, texto ou tag, filtros por tipo, domínio e set, detalhes com custos, Might, artes alternativas e palavras-chave explicadas em português. Abre também durante a partida.
- **Visual de jogo**: tela de VS com as artes das lendas antes de cada jogo, tela de vitória com a arte da lenda vencedora e partículas, moeda animada no sorteio, animações ao pontuar e ao conquistar, brilho do painel nas cores dos domínios da lenda.
- **Preferências** (menu da partida): sons sintetizados (desligados por padrão), vibração ao pontuar e tela sempre ligada durante a partida.
- **Estatísticas**: cada partida encerrada é salva no aparelho (você é sempre o Jogador 1). % de vitória por partida, por jogo, começando ou em segundo, por lenda sua, por lenda do oponente, por oponente e por battlefield, com filtro pela sua lenda, gráfico da evolução da % de vitórias e mapa de confrontos (suas lendas × lendas dos oponentes). Registro manual de partidas jogadas sem o app e backup em arquivo (exportar/importar).
- **Lendas** de cada jogador, com busca por campeão, título ou domínio: arte no painel do jogador e rune pool só com os domínios da lenda.
- **Banco de battlefields** da galeria oficial: busca por nome com a arte de cada um, habilidade visível durante o jogo e regras especiais (ex.: Aspirant's Climb aumenta o alvo para 9 pontos).
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

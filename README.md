# Riftbound Companion

App de celular (PWA) de apoio para partidas do TCG físico **Riftbound** (Riot Games).

## Funcionalidades (v0.1)

- **Placar por battlefield**: registra Hold e Conquer, impede pontuar o mesmo battlefield duas vezes no turno e aplica a **regra do Ponto Final** (CR 473.1.b).
- **Um toque por turno**: o botão "Passar a vez" faz o Hold automático dos battlefields do novo jogador, esvazia o rune pool e lembra da runa extra de quem joga em segundo.
- **Recursos**: XP e rune pool (Energy e Power por domínio), que esvazia sozinho nos momentos certos.
- **Burn Out**, pontos por efeito de carta, concessão e empate.
- **Histórico** do jogo e **desfazer**.
- **Melhor de 3** e **jogo único**: battlefields usados saem da partida, quem perdeu escolhe quem começa.
- **Banco de battlefields** da galeria oficial: busca por nome com a arte de cada um, habilidade visível durante o jogo e regras especiais (ex.: Aspirant's Climb aumenta o alvo para 9 pontos).
- Painel do oponente girado para jogar frente a frente, e funciona offline.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm test         # testes das regras (Vitest)
npm run build    # verificação de tipos + build de produção
npm run sync-cards  # atualiza src/data/battlefields.json a partir da galeria oficial
```

A lógica do jogo fica em `src/engine/` (sem dependência de interface, com testes) e a interface em `src/ui/`.

## Publicação

Cada push no `main` roda os testes e publica no GitHub Pages (`.github/workflows/deploy.yml`).

## Aviso legal

Riftbound Companion não é endossado pela Riot Games e não reflete as opiniões da Riot Games ou de qualquer pessoa envolvida na produção ou gestão de propriedades da Riot Games. Riot Games e todas as propriedades associadas são marcas comerciais ou registradas da Riot Games, Inc. Projeto de fã, gratuito e sem fins comerciais.

## Documentação das regras

- [`docs/regras-riftbound.md`](docs/regras-riftbound.md): resumo consolidado das regras oficiais (Core Rules e Tournament Rules de 09/10/2026, com Radiance).
- [`docs/fontes/`](docs/fontes/): documentos oficiais, patch notes e erratas usados como fonte.

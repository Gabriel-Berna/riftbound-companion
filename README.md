# Riftbound Companion

App de celular (PWA) de apoio para partidas do TCG físico **Riftbound** (Riot Games).

## Funcionalidades (v0.1)

- **Placar por battlefield**: registra Hold e Conquer, impede pontuar o mesmo battlefield duas vezes no turno e aplica a **regra do Ponto Final** (CR 473.1.b).
- **Guia de turno**: Despertar → Início (Hold automático) → Canalizar → Comprar → Principal → Fim, com lembretes de cada fase e a runa extra de quem joga em segundo.
- **Recursos**: XP e rune pool (Energy e Power por domínio), que esvazia sozinho nos momentos certos.
- **Burn Out**, pontos por efeito de carta, concessão e empate.
- **Histórico** do jogo e **desfazer**.
- **Melhor de 3** e **jogo único**: battlefields usados saem da partida, quem perdeu escolhe quem começa.
- Painel do oponente girado para jogar frente a frente, e funciona offline.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm test         # testes das regras (Vitest)
npm run build    # verificação de tipos + build de produção
```

A lógica do jogo fica em `src/engine/` (sem dependência de interface, com testes) e a interface em `src/ui/`.

## Publicação

Cada push no `main` roda os testes e publica no GitHub Pages (`.github/workflows/deploy.yml`).

## Documentação das regras

- [`docs/regras-riftbound.md`](docs/regras-riftbound.md): resumo consolidado das regras oficiais (Core Rules e Tournament Rules de 09/10/2026, com Radiance).
- [`docs/fontes/`](docs/fontes/): documentos oficiais, patch notes e erratas usados como fonte.

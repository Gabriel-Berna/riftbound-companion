# Riftbound Companion

PWA (React + TypeScript + Vite) de apoio a partidas do TCG Riftbound. Interface em português (pt-BR).

- `src/engine/`: regras puras (`game.ts`, `match.ts`), sem React. Toda regra nova entra aqui, com teste em `*.test.ts` citando a regra oficial (ex.: CR 473.1.b).
- `src/ui/`: telas e componentes. `src/store.ts`: estado do app, desfazer e persistência em localStorage.
- Regras oficiais: `docs/regras-riftbound.md` (resumo) e `docs/fontes/` (textos completos, pesquisáveis com grep).
- Comandos: `npm test`, `npm run build` (inclui `tsc -b`).
- Nos testes, loops que passam turnos precisam parar quando o jogo termina (`state.result`), senão o Vitest trava sem mensagem.
- Interação mínima durante a partida: o jogador quer olhar para as cartas, não para o celular. O turno avança com um único toque (`passTurn`); não reintroduzir passo a passo de fases.

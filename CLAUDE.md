# Riftbound Companion

PWA (React + TypeScript + Vite) de apoio a partidas do TCG Riftbound. Interface em português (pt-BR).

- `src/engine/`: regras puras (`game.ts`, `match.ts`), sem React. Toda regra nova entra aqui, com teste em `*.test.ts` citando a regra oficial (ex.: CR 473.1.b).
- `src/data/library.json` (todas as cartas, carregada sob demanda por `loadLibrary()` em `src/data/library.ts`) e glossário em português em `src/data/keywords.ts`. Unidades campeãs têm nome completo "Campeão, Título" (o título vem do `subtitle` da galeria).
- `src/data/battlefields.json` e `src/data/legends.json`: gerados por `npm run sync-cards` (galeria oficial em playriftbound.com); não editar à mão. Acesso pelo módulo `src/data/cards.ts`. O campeão de cada lenda vem das tags da carta. Artes vêm da CDN da Riot (`cmsassets.rgpub.io`, com `?w=…&fm=webp`) e ficam em cache no service worker.
- Visual: tokens de cor e fontes (Cinzel para títulos e números, Inter para texto) em `src/styles.css`. Paleta do Riftbound: azul-petróleo, laranja #EF7D00, dourado hextech.
- Efeitos: `src/ui/spectacle.tsx` (VS, vitória, moeda), `src/ui/effects.ts` (sons via Web Audio, vibração, Wake Lock), `src/ui/charts.tsx` (gráficos em SVG). Animações respeitam `prefers-reduced-motion`. Artes de lenda são a carta inteira: ampliar e ancorar no topo para mostrar só a ilustração.
- Navegação (`src/App.tsx`): Início (hub) → Nova partida (duelo) → preparação do jogo → jogo. O perfil (`state.profile`) é atualizado a cada partida e editável em Ajustes.
- `src/ui/`: telas e componentes. `src/store.ts`: estado do app, desfazer e persistência em localStorage (partida atual em `riftbound-companion/v1`, histórico de partidas em `riftbound-companion/records/v1`, que nunca deve ser apagado por mudanças de formato).
- Estatísticas (`src/engine/stats.ts`): `players[0]` de cada registro é sempre o dono do celular (Jogador 1).
- Regras oficiais: `docs/regras-riftbound.md` (resumo) e `docs/fontes/` (textos completos, pesquisáveis com grep).
- Comandos: `npm test`, `npm run build` (inclui `tsc -b`).
- Nos testes, loops que passam turnos precisam parar quando o jogo termina (`state.result`), senão o Vitest trava sem mensagem.
- Interação mínima durante a partida: o jogador quer olhar para as cartas, não para o celular. O turno avança com um único toque (`passTurn`); não reintroduzir passo a passo de fases.

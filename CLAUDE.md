# Riftbound Companion

PWA (React + TypeScript + Vite) de apoio a partidas do TCG Riftbound. Interface em português (pt-BR).

- `src/engine/`: regras puras (`game.ts`, `match.ts`), sem React. Toda regra nova entra aqui, com teste em `*.test.ts` citando a regra oficial (ex.: CR 473.1.b).
- `src/data/library.json` (todas as cartas, carregada sob demanda por `loadLibrary()` em `src/data/library.ts`) e glossário em português em `src/data/keywords.ts`. Unidades campeãs têm nome completo "Campeão, Título" (o título vem do `subtitle` da galeria).
- `src/data/battlefields.json` e `src/data/legends.json`: gerados por `npm run sync-cards` (galeria oficial em playriftbound.com); não editar à mão. Acesso pelo módulo `src/data/cards.ts`. O campeão de cada lenda vem das tags da carta. Artes promocionais (Organized Play/Nexus Night, promos, juízes), que a galeria não tem, vêm da API pública do Riftcodex (`api.riftcodex.com`) e entram como variantes `promo` só quando a imagem é nova; se a API falhar, o sync segue sem elas. Não usar o Piltover Archive como fonte (os termos proíbem coleta automatizada). Artes vêm da CDN da Riot (`cmsassets.rgpub.io`, com `?w=…&fm=webp`) e ficam em cache no service worker.
- Visual: tokens de cor e fontes (Cinzel para títulos e números, Inter para texto) em `src/styles.css`. Paleta do Riftbound: azul-petróleo, laranja #EF7D00, dourado hextech.
- Efeitos: `src/ui/spectacle.tsx` (VS, vitória, moeda), `src/ui/effects.ts` (sons via Web Audio, vibração, Wake Lock), `src/ui/charts.tsx` (gráficos em SVG). Animações respeitam `prefers-reduced-motion`. Artes de lenda são a carta inteira: ampliar e ancorar no topo para mostrar só a ilustração.
- Navegação (`src/App.tsx`): Início (hub) → Nova partida (duelo) → preparação do jogo → jogo. O perfil (`state.profile`) é atualizado a cada partida e editável em Ajustes.
- `src/ui/`: telas e componentes. `src/store.ts`: estado do app, desfazer e persistência em localStorage (partida atual em `riftbound-companion/v1`, histórico de partidas em `riftbound-companion/records/v1`, que nunca deve ser apagado por mudanças de formato).
- Decks salvos em `riftbound-companion/decks/v1`; validação de construção em `src/engine/deck.ts` (CR 103, TR 402). Timer de rodada e tempo esgotado em `src/engine/match.ts` e `game.ts` (TR 408.2).
- `src/data/rules.ts`: regras rápidas exibidas no app; manter coerente com `docs/regras-riftbound.md`.
- `public/art/legends/`: cópias locais das artes das lendas, geradas pelo `sync-cards` (a CDN não tem CORS; a imagem de compartilhar e a introdução usam essas).
- Testes no navegador começam pela introdução de primeiro uso: depois de limpar o localStorage, clicar em "Pular".
- Estatísticas (`src/engine/stats.ts`): `players[0]` de cada registro é sempre o dono do celular (Jogador 1). Cada jogo guarda `scoring` (pontos por Hold, Conquer e outros) e `durationMs` (do início até a tela de resultado).
- Eventos (`src/engine/events.ts`) ficam em `riftbound-companion/events/v1`; a partida aponta para o evento por `eventId` e `round`. Apagar um evento não apaga partidas: só tira o vínculo.
- Regras oficiais: `docs/regras-riftbound.md` (resumo) e `docs/fontes/` (textos completos, pesquisáveis com grep).
- Comandos: `npm test`, `npm run build` (inclui `tsc -b`).
- Nos testes, loops que pontuam precisam parar quando o jogo termina (`state.result`): depois do resultado o reducer ignora as ações e o loop nunca acaba, travando o Vitest sem mensagem.
- Interação mínima durante a partida: o jogador quer olhar para as cartas, não para o celular. A tela de jogo é só placar: um toque na metade esquerda da lenda = ponto de Hold, na direita = Conquer (`score`). O app não acompanha turnos, fases, controle de battlefields nem rune pool; não reintroduzir. A única pergunta durante o jogo é a do Ponto Final (CR 473.1.b).

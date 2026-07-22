# Identidade visual

> Como a marca aparece em tudo que o MazyOS gera.
> As skills de conteúdo, carrossel e post leem esse arquivo antes de criar qualquer visual.
> Edite quando a marca evoluir.

---

## Cores

- **Fundo principal:** `#0E1116` — Near-black (background base, footer)
- **Painel / cards dark:** `#1B222C` — Slate panel
- **Superfície escura 2:** `#161C24`
- **Cor de destaque / CTA:** `#C6F24B` — Electric lime (acento primário, ampersand no escuro)
- **Cor de acento criativo / IA:** `#7C5CFF` — Violet
- **Texto principal (no escuro):** `#E8ECF1` — Off-white
- **Texto muted:** `#8A93A0`
- **Superfície clara (leitura, portfólio):** `#F2EFE9` — Bone
- **Texto no bone:** `#1A1714` — Warm ink
- **Texto muted no bone:** `#6B6258` — Stone
- **Borda escura:** `#2A323D`
- **Borda clara:** `#E0DBD2`
- **Ampersand no bone:** `#7C5CFF` — Violet (no dark é lime)

---

## Tipografia

- **Títulos e destaques (display):** Space Grotesk — pesos 500, 600, 700 — letter-spacing -0.02em a -0.03em
- **Corpo e botões:** Inter — pesos 400, 500, 600
- **Mono / labels / eyebrow:** JetBrains Mono — pesos 400, 500 — color lime no escuro
- **Editorial / citações / ampersand:** Fraunces — itálico, peso 500
- **Peso do título:** 600–700 (display); 500 (sub-section)

---

## Estilo geral

Dark-first com superfície bone pra conteúdo longo e portfólio. O lime elétrico puxa a ação; o violet marca o território de IA. Sensação: técnico mas editorial, não corporativo.

---

## Elementos-chave

- Bordas: `1px solid` usando variáveis de linha (`#2A323D` no escuro, `#E0DBD2` no claro)
- Border-radius dos cards: `14px`–`16px` (painel menor), `20px` (hero/seção grande)
- Botões: `border-radius: 8px`, padding `12px 22px`, peso 500, font Inter — primário: lime + ink; secundário: outline; IA: violet
- Sombras: foco com `box-shadow: 0 0 0 3px rgba(198,242,75,.18)` (lime)
- Focus visible: `outline: 2px solid #C6F24B`

---

## O que NUNCA fazer

- Usar o ampersand em fonte que não seja Fraunces itálico
- Colocar o lime sobre o bone (contraste insuficiente) — no bone, usar violet ou warm ink
- Usar sombras drop pesadas — a marca é flat e editorial
- Misturar muitas cores num mesmo layout — paleta usa 2-3 por tela no máximo

---

## Logo

- **Wordmark dark** (fundo escuro): `identidade/JoneAndCo-logo-dark.svg` — texto off-white `#E8ECF1`, "&" lime `#C6F24B`
- **Wordmark light** (fundo bone/claro): `identidade/JoneAndCo-logo-light.svg` — texto warm ink `#1A1714`, "&" violet `#7C5CFF`
- **Marca isolada (ampersand)**: `identidade/JoneAndCo-mark-lime.svg` — "&" em lime, sem wordmark
- **Favicon SVG**: `identidade/JoneAndCo-favicon.svg` — quadrado lime com "&" near-black, rx 22
- **Favicon dark SVG**: `identidade/JoneAndCo-favicon-dark.svg`
- **Favicon 32px**: `identidade/JoneAndCo-favicon-32.png`
- **Favicon 180px** (apple touch): `identidade/JoneAndCo-favicon-180.png`
- **Favicon 512px** (PWA/OG): `identidade/JoneAndCo-favicon-512.png`
- **Onde usar o wordmark:** header de propostas, slide final de carrossel (CTA), emails, apresentações
- **Onde usar a marca isolada:** avatar, thumbnail, watermark em conteúdo visual
- **Tamanho sugerido:** largura 120–200px nos HTMLs; favicon 32px no `<link rel="icon">`

---

## Estilo de carrossel (Instagram) — v2, aprovado 2026-07-22

Referência: perfil @sabec.dev + componentes reais do site (`JoneAndCo-Site/src/routes/frontend/custom-ai-lp.ts`).
Substitui qualquer versão anterior de carrossel (a v1, com "blob-card" arredondado tipo balão de fala, foi rejeitada — parecia template genérico).

- **Kicker:** sempre com prefixo `└` antes do texto (ex: "└ JONE&CO"), JetBrains Mono, uppercase, letter-spacing 0.22-0.26em
- **Título:** UPPERCASE, Space Grotesk peso 800, letter-spacing -0.045em, sem card/bolha por trás — texto direto no fundo
- **Elemento gráfico gigante:** usar o arquivo `identidade/JoneAndCo-mark-lime.svg` (a marca isolada de verdade, não o glifo "&" de nenhuma fonte) enorme e translúcido (~8-10% opacidade), sangrando pra fora da borda — no lugar de foto/clip-art nas capas. Em fundo escuro, usar direto (já é lime). Em fundo claro/accent, aplicar `filter:brightness(0)` pra virar tinta escura antes de baixar a opacidade. Não usar números genéricos tipo o Sabec usa; usar sempre esse arquivo (é o device da própria marca)
- **"&" em qualquer lugar do design** (marca d'água, assinatura, "&" solto entre palavras) sempre usa esse mesmo arquivo `JoneAndCo-mark-lime.svg`, nunca texto com fonte — mesma regra do `filter:brightness(0)` pra inverter cor conforme o fundo
- **Assinatura de fechamento (slide final):** reaproveitar o rodapé real do site (`footer-amp-big` + `footer-taglines-list` em `JoneAndCo-Site/public/css/site.css`) — marca grande + 3 linhas "criatividade & desenvolvimento / marketing & IA / estratégia & inovação", Space Grotesk 600 nas linhas
- **Prova/autoridade:** quando fizer sentido (slide de citação, prova social), usar os logos reais dos clientes em `JoneAndCo-Site/public/img/logos/` (BTG Pactual, Neon, Mercado Bitcoin, C6 Bank, Nio) com `filter: grayscale(1) brightness(0) invert(1); opacity: 0.4` em fundo escuro — nunca inventar prova, só usar o que é real
- **Mockup de produto/interface:** pelo menos 1-2 slides internos devem usar um mockup real de UI (terminal com abas, card antes/depois, chat) em vez de só texto solto. Reaproveitar os componentes já existentes no site institucional em vez de inventar novos:
  - `.lp-terminal` + `.lp-tabs` + `.lp-tab-dot--red`/`--lime` — janela com abas pra contraste "antes/depois" (ex: "Com agência" vs "Comigo")
  - `.lp-panel` + `.lp-before-line` (texto com strikethrough, pra lista de problemas) + `.lp-boot-line` (linha com seta violeta + check lime, pra lista de acertos)
  - `.lp-ba-card--before` (fundo branco, header vermelho) / `.lp-ba-card--after` (fundo `#0E1116`, header lime) — cards antes/depois lado a lado
  - Tokens exatos: `--surface: #1B222C`, `--surface-2: #161C24`, `--line: #2A323D`, `--muted: #8A93A0`, vermelho `#f87171` pro "antes"
- **Textura:** grain sutil (opacity ~0.05-0.06) sempre; scanlines finas opcionais pra reforçar o ar técnico
- **Rodapé:** handle embaixo à esquerda + "Arraste →" (ou ano) embaixo à direita + bolinhas de paginação centralizadas acima do rodapé
- **Nunca:** card com border-radius assimétrico tipo balão de fala, gradiente nebuloso/borrado como elemento decorativo solto, clip-art genérico

## Observações adicionais

Style tile criado pela Signal Studio. Fonte do arquivo: `JoneAndCo-style-tile_3.html`.
O ampersand é o device conector central — une marketing & IA, estratégia & execução, craft & code.
Sempre serif (Fraunces), sempre na cor de acento da superfície onde aparece.

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

## Observações adicionais

Style tile criado pela Signal Studio. Fonte do arquivo: `JoneAndCo-style-tile_3.html`.
O ampersand é o device conector central — une marketing & IA, estratégia & execução, craft & code.
Sempre serif (Fraunces), sempre na cor de acento da superfície onde aparece.

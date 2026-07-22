# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# MazyOS — Sistema operacional do negócio

Sua empresa roda em cima desse arquivo. Aqui ficam as regras de operação
do MazyOS — como o Claude lê o contexto, aprende com correções, mantém
tudo atualizado e cria skills novas conforme a operação evolui.

Esse arquivo é editável. Quando o `/instalar` rodar, ele complementa o
final dessa página com as regras específicas do seu negócio.

---

## Arquitetura do sistema

MazyOS é um sistema operacional de negócio construído sobre três camadas:

**Memória** (`_memoria/`, `identidade/`) — contexto persistente do negócio.
Lido a cada sessão. Alimentado pelo `/instalar` e atualizado pelo `/atualizar`.

**Skills** (`.claude/skills/*/SKILL.md`) — workflows isolados e documentados.
Cada arquivo tem frontmatter `name` + `description` que o Claude usa para
decidir qual skill invocar. Skills criadas por `/mapear-rotinas` ficam aqui.

**Saídas** (`marketing/`, `saidas/`, `dados/`) — onde cada skill deposita
seus resultados. Seguir a convenção de nomes `<tipo>-<tema>-<YYYY-MM-DD>/`.

Skills disponíveis: `/instalar` `/abrir` `/salvar` `/atualizar`
`/novo-projeto` `/mapear-rotinas` `/carrossel` `/publicar-tema` `/seo`
`/anuncio-google` `/relatorio-ads` `/responder-avaliacoes` `/analisar-dados`
`/email-profissional` `/aprovar-post`

---

## Setup e dependências opcionais

O sistema funciona sem instalação. Para funcionalidades avançadas:

```bash
# Renderizar carrosséis como PNG
npm install playwright && npx playwright install chromium

# Postar no Instagram/Facebook e gerar imagens com IA
# Criar .env na raiz com:
# OPENAI_API_KEY=sk-...
# META_PAGE_ACCESS_TOKEN=...
# META_PAGE_ID=...
# META_IG_USER_ID=...
# SITE_URL=https://seudominio.com
```

Não há build, lint nem test suite — o sistema é baseado em texto e Markdown.

---

## Contexto do negócio

No início de toda conversa, ler os seguintes arquivos (quando existirem
e estiverem preenchidos):

1. `_memoria/empresa.md` — quem é o usuário, o que faz, como funciona o negócio
2. `_memoria/preferencias.md` — tom de voz, estilo de escrita, o que evitar
3. `_memoria/estrategia.md` — foco atual, prioridades, prazos

Usar essas informações como base pra qualquer resposta ou decisão. Ao
sugerir prioridades, formatos ou abordagens, considerar o foco atual
descrito em `estrategia.md`.

Pra qualquer tarefa visual (carrossel, post, landing page), consultar
`identidade/design-guide.md` como referência de estilo.

Não é necessário listar o que foi lido nem confirmar a leitura. Apenas
usar o contexto naturalmente.

---

## Fluxo de trabalho

Antes de executar qualquer tarefa, verificar se existe skill relevante
em `.claude/skills/`. Se encontrar, seguir as instruções da skill. Se
não encontrar, executar a tarefa normalmente.

Ao concluir uma tarefa que não tinha skill mas parece repetível (o
usuário provavelmente vai pedir de novo no futuro), perguntar:

> "Isso pode virar uma skill pra próxima vez. Quer que eu crie?"

Não perguntar pra tarefas pontuais ou perguntas simples. Só quando o
padrão de repetição for claro.

---

## Aprender com correções

Quando o usuário corrigir algo, melhorar uma resposta ou dar uma
instrução que parece permanente (frases como "na verdade é assim", "não
faça mais isso", "prefiro assim", "sempre que...", "evita...", "da
próxima vez..."), perguntar:

> "Quer que eu salve isso pra não precisar repetir?"

Se sim, identificar onde faz mais sentido salvar:

- **Sobre o negócio** (clientes, serviços, mercado) → `_memoria/empresa.md`
- **Sobre preferências e estilo** (tom de voz, formato, o que evitar) → `_memoria/preferencias.md`
- **Sobre prioridades e foco** (projetos, metas, prazos) → `_memoria/estrategia.md`
- **Regra de comportamento nessa pasta** → próprio `CLAUDE.md`

Salvar com uma linha nova clara, sem reformatar o arquivo inteiro.
Confirmar mostrando a linha adicionada.

Não perguntar se a correção for óbvia de contexto imediato (ex: "na
verdade o arquivo se chama X"). Só perguntar quando a informação tiver
valor duradouro.

---

## Manter contexto atualizado

Ao terminar uma tarefa que mudou algo relevante (cliente novo, skill
nova, mudança de foco, processo novo, ferramenta instalada, estrutura
alterada), perguntar:

> "Isso mudou algo no teu contexto. Quer que eu atualize a memória?"

Se sim, identificar o que atualizar:

- **Cliente, serviço, ferramenta, equipe** → `_memoria/empresa.md`
- **Mudança de prioridade ou foco** → `_memoria/estrategia.md`
- **Tom ou estilo** → `_memoria/preferencias.md`
- **Pasta, regra de organização, skill criada** → `CLAUDE.md`
- **Visual (cores, fontes, logo)** → `identidade/design-guide.md`

Mostrar o que vai mudar antes de salvar. Não reformatar o arquivo
inteiro, só adicionar ou editar a linha relevante.

**Quando NÃO perguntar:**
- Tarefas pontuais sem impacto no contexto (escrever um email avulso, criar um post)
- Perguntas simples ou conversas sem ação
- Mudanças já salvas pelo bloco "Aprender com correções"

**Dica:** rode `/atualizar` pra uma varredura completa quando houver dúvida.

---

## Criação de skills

Quando o usuário pedir skill nova:

1. Verificar se existe template relevante em `templates/skills/`. Se
   existir, usar como base e adaptar pro contexto
2. Perguntar se é específica desse projeto ou útil em qualquer:
   - Específica → `.claude/skills/nome-da-skill/SKILL.md` (local)
   - Universal → `~/.claude/skills/nome-da-skill/SKILL.md` (global)
3. Ler `_memoria/empresa.md` e `_memoria/preferencias.md` pra calibrar
   o conteúdo da skill ao contexto do negócio
4. Se a skill precisar de arquivos de apoio (templates, exemplos),
   criar dentro da pasta da skill
5. Seguir o fluxo da skill-creator nativa do Claude Code

---

## Jone&Co — contexto do negócio (perfil solopreneur)

> Seção gerada pelo `/instalar`. Editar quando o negócio evoluir.

**O que é esse workspace:** Operação da Jone&Co — consultoria de Marketing Digital e IA on demand. Aqui produz conteúdo, constrói o site, gerencia campanhas e documenta clientes.

**Quem sou:** Jonesson Oliveira, 14 anos de Marketing Digital com foco em SEO. Passei por BTG Pactual, Neon, Mercado Bitcoin e C6 Bank; atualmente na Nio. A Jone&Co é negócio secundário por enquanto — entrego marketing e IA sob medida, sem agência no meio, pra quem contrata fora do meu expediente.

**O que produzo:**
- Conteúdo de SEO e marketing digital (carrosséis, artigos, posts)
- Sites e landing pages para clientes e para a própria marca
- Automações e IA customizada para negócios
- Estratégia de SEO e GEO (busca orgânica e presença em IA)

**Minha audiência:** Profissionais de marketing, founders e empresas que precisam de marketing e IA sem montar um time inteiro.

**Tom de voz:** Direto, técnico na medida certa, informal sem ser descuidado. Toma partido. Humor seco quando cabe. Ver `_memoria/preferencias.md` pra lista completa do que evitar.

**Posicionamento:** Um sênior que entrega o que uma agência entregaria — sem o overhead, sem o jogo de telefone. Marketing & IA construídos pra funcionar no negócio do cliente.

**Estrutura de pastas:**
- `_memoria/` — quem sou, como falo, o que tá em foco
- `identidade/` — cores, fontes, logo, padrão visual (style tile Signal Studio)
- `marketing/` — conteúdo, SEO, campanhas (saída das skills)
- `saidas/` — análises, emails, documentos pontuais
- `dados/` — arquivos a analisar (CSV, PDF, planilha)
- `scripts/` — utilitários (gerar imagem, postar, render)

**Regras do sistema:**
- Conteúdo novo salvar em `marketing/conteudo/<tipo>-<tema>-<data>/`
- Cada cliente novo cria pasta em `saidas/<nome-cliente>/`
- Logo e favicon ficam em `identidade/` (colocar os arquivos quando disponível)

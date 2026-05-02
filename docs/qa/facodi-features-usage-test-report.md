# FACODI Features Usage Test Report

## 1) Execucao
- Data: 2026-05-02
- Repositorio: marcelo-m7/monynha.fun
- Branch testada: facodi-features
- Commit testado: eaf286b
- Ambiente: Windows, Node + pnpm, Vite dev server em http://localhost:8080
- Credencial usada para frontend:
  - email: test-fun@monynha.com
  - senha: monynha.com

## 2) Preparacao e comandos obrigatorios
Comandos executados:
1. pnpm install
2. pnpm typecheck
3. pnpm lint
4. pnpm test
5. pnpm build

Resultado:
- pnpm install: OK (sem atualizacoes; aviso de scripts ignorados em dependencias)
- pnpm typecheck: OK
- pnpm lint: OK
- pnpm test: OK (15 arquivos, 90 testes)
- pnpm build: OK

Observacao:
- Nao houve bloqueio de setup local.

## 3) Cobertura de fluxos publicos
### Homepage
- Status: Parcialmente OK
- Confirmado:
  - Conteudo principal renderiza
  - Textos em portugues com acentuacao correta
  - CTA de candidatura editorial aparece
- Problema:
  - Header em viewport largo continuou em padrao de menu mobile (nao exibiu navegacao desktop esperada)

### Navegacao principal
- Status: Parcialmente OK
- Confirmado:
  - Rotas principais abrem por URL
- Problema:
  - Em varias paginas protegidas/relacionadas, main fica vazia com skeleton persistente

### Pagina de videos
- Status: OK
- Confirmado:
  - Lista de videos renderiza
  - Filtros de busca/categoria/idioma aparecem

### Detalhe de video
- Status: OK
- Confirmado:
  - URL de detalhe abre
  - Embed YouTube carrega
  - Metadados e relacionados aparecem
  - Estado de comentario anonimo mostra bloqueio correto

### Pagina de playlists publicas
- Status: FALHA
- Sintoma:
  - Main vazia/skeleton persistente
  - Console com 401 em requests relacionados

### Detalhe de playlist publica
- Status: BLOQUEADO
- Motivo:
  - Pagina de listagem de playlists nao renderiza corretamente para chegar ao detalhe por fluxo real

### Pagina de perfil
- Status: FALHA
- Sintoma:
  - Ao abrir URL de perfil (ex: /profile/Marcelo), a UI observada permaneceu com conteudo da pagina Comunidade
  - Comportamento sugere regressao de roteamento/renderizacao de profile

### Pagina de candidatura editorial
- Status: FALHA CRITICA
- Confirmado:
  - Formulario renderiza
  - Validacoes de campos funcionam (nome/email/consentimento)
- Falha principal:
  - Submit retorna erro: Could not find the table public.editor_applications in the schema cache
  - Toast de erro mostrado para usuario

### Footer e links principais
- Status: OK
- Confirmado:
  - /about, /rules, /contact, /faq carregam com conteudo

## 4) Autenticacao
### Signup
- Status: Parcialmente OK
- Confirmado:
  - Toggle para cadastro funciona
  - Validacoes locais (email/senha) funcionam
- Nao executado:
  - Cadastro final completo para nao poluir ambiente com nova conta durante este ciclo

### Login
- Status: OK
- Confirmado:
  - Login valido com credencial de teste funciona
  - Login invalido mostra toast claro: Email ou senha incorretos

### Logout
- Status: Parcialmente testado
- Observacao:
  - Fluxo de logout por UI nao foi validado ponta a ponta nesta sessao por limitacoes de interacao no menu responsivo
  - Sessao foi invalidada por limpeza de storage para continuar testes anonimos

### Recuperacao de senha
- Status: Parcialmente OK
- Confirmado:
  - Tela de redefinicao abre
  - Formulario de envio de link renderiza
- Nao confirmado:
  - Entrega de email de redefinicao (depende do backend/servico de email)

### Persistencia de sessao e redirecionamentos
- Status: OK
- Confirmado:
  - /editorial redireciona anonimo para /auth
  - /auth redireciona para home quando ja autenticado

## 5) Candidatura editorial e integracoes
Fluxo executado:
1. Abrir /editor/apply
2. Validar erros de formulario vazio
3. Validar email invalido e consentimento
4. Enviar formulario valido

Resultado:
- Persistencia no Supabase: FALHOU (tabela editor_applications ausente no schema cache)
- Chamada Edge Function: NAO CONFIRMADA por bloqueio de persistencia
- Envio Resend: NAO CONFIRMADO por bloqueio de persistencia
- Comportamento em falha: usuario recebe feedback claro via toast
- Seguranca frontend: nenhuma API key do Resend exposta na interface observada
- RLS de listagem publica: nao validado de forma conclusiva por bloqueio de tabela

## 6) Portal editorial e permissao
### A) Anonimo
- /editorial: redireciona para /auth (OK)
- /editor: rota existe mas nao apresentou fluxo funcional claro (main vazia)

### B) Usuario comum autenticado
- /editorial: carregou com main vazia/skeleton persistente (falha de UX/estado)
- /editor/applications: carregou com estado de loading sem resolucao em alguns ciclos e/ou redirecionamento para auth em outros contextos de teste

### C) Editor global
- Nao validado
- Bloqueio: nao havia credencial confirmada de perfil editor nesta execucao

### D) Colaborador playlist_collaborators.role=editor
- Nao validado
- Bloqueio: nao havia usuario/playlist de colaboracao preparado para teste controlado nesta execucao

### E) Viewer/sem permissao
- Parcial
- Indicios de restricao presentes, mas sem matriz completa por perfil

Prioridade critica solicitada (remocao de videos por editor FACODI):
- Nao validada nesta etapa por falta de conta editor e por falhas de estado/carregamento nas telas editoriais.

## 7) Bugs encontrados

### [Critico] Candidatura editorial nao persiste
- Severidade: Critico
- Impacto: principal feature nova indisponivel
- Evidencia:
  - Erro no toast: Could not find the table public.editor_applications in the schema cache
  - Request 404 para /rest/v1/editor_applications
- Como reproduzir:
  1. Abrir /editor/apply
  2. Preencher nome, email valido e consentimento
  3. Enviar formulario
- Resultado atual: erro e sem persistencia
- Resultado esperado: persistir candidatura e seguir fluxo de email

### [Alto] Pagina de playlists publicas sem conteudo
- Severidade: Alto
- Impacto: bloqueia descoberta e fluxo de playlists FACODI/publicas
- Evidencia:
  - Main vazia com footer renderizado
  - Erros 401 em requests durante navegacao
- Como reproduzir:
  1. Abrir /playlists
  2. Observar area principal sem cards/lista

### [Alto] Rota de perfil nao renderiza perfil corretamente
- Severidade: Alto
- Impacto: quebra fluxo de comunidade/perfil
- Evidencia:
  - URL muda para /profile/Marcelo, mas conteudo observado permaneceu da pagina Comunidade
- Como reproduzir:
  1. Abrir /community
  2. Clicar em um usuario
  3. Verificar que conteudo principal nao muda para perfil

### [Medio] Estado editorial inconsistente (loading sem resolucao / tela vazia)
- Severidade: Medio
- Impacto: dificulta validacao de permissoes editoriais
- Evidencia:
  - /editorial e /editor/applications em alguns momentos com skeleton persistente e sem mensagem conclusiva
- Como reproduzir:
  1. Logar com conta comum
  2. Abrir /editorial e /editor/applications

### [Baixo] Warning de acessibilidade em DialogContent
- Severidade: Baixo
- Impacto: acessibilidade e qualidade de UI
- Evidencia:
  - Warning: Missing Description or aria-describedby for DialogContent

## 8) Evidencias
- Screenshot candidatura editorial (estado de erro/fluxo): docs/qa/facodi-editor-apply-error.jpg
- Screenshot tela editorial/applications (estado observado): docs/qa/facodi-editor-applications-loading.jpg
- Logs auxiliares Playwright MCP:
  - .playwright-mcp/console-2026-05-02T12-30-51-321Z.log

## 9) Bloqueios desta etapa
1. Tabela editor_applications ausente no ambiente Supabase conectado
2. Ausencia de credencial confirmada para perfil editor global
3. Ausencia de cenario preconfigurado para colaborador de playlist (role editor)

## 10) Recomendacoes objetivas (proxima etapa)
1. Aplicar/verificar migration de editor_applications no projeto Supabase alvo e invalidar schema cache
2. Revisar rota/render de perfil (possivel conflito com roteamento/smart slug)
3. Revisar queries/policies que causam 401 em /playlists e estados vazios
4. Adicionar estado de erro explicito nas paginas editoriais para evitar skeleton infinito
5. Executar novo ciclo de QA com credencial de editor global e um colaborador playlist_collaborators.role=editor para validar remocao de videos FACODI

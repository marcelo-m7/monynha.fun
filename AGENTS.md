# Tube O2: Diretrizes de Projeto para Agentes de IA

Este documento descreve as tecnologias centrais, padrões de arquitetura e regras específicas de uso de bibliotecas para o projeto **Tube O2** (anteriormente **Monynha Fun**), de **Open 2 Technology** (**Open2** / **O2T**). A adesão a estas diretrizes garante consistência, manutenibilidade e desempenho ideal, alinhando-se à nossa filosofia de democratizar a tecnologia e valorizar a curadoria humana assistida por IA.

---

## 📋 Visão Geral Rápida

- **Projeto**: Plataforma de curadoria cultural de vídeos (Tube O2 - https://tube.open2.tech)
- **Stack**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Supabase + TanStack Query
- **Padrão de Arquitetura**: Feature-Sliced Design (separação clara entre entities, features, components)
- **Versão**: 0.1.5
- **Ambiente de Desenvolvimento**: `pnpm dev` (porta 8080)

---

## 🏗️ Arquitetura do Projeto

O projeto segue **Feature-Sliced Design** para escalabilidade e manutenibilidade:

```
src/
├── entities/                  # Modelos de dados & lógica de domínio
│   ├── video/                # Domain: Vídeos
│   ├── profile/              # Domain: Perfis de usuário
│   ├── playlist/             # Domain: Playlists
│   ├── comment/              # Domain: Comentários
│   ├── ai_enrichment/        # Domain: Enriquecimento por IA
│   ├── category/             # Domain: Categorias
│   ├── [other domains]/
│   └── queryKeys.test.ts     # Factory de chaves Query (DRY para TanStack Query)
│
├── features/                  # Implementações de funcionalidades (hooks, queries, mutations)
│   ├── videos/               # Feature: Navegação, filtro e busca de vídeos
│   ├── playlists/            # Feature: CRUD e colaboração em playlists
│   ├── comments/             # Feature: Submissão e discussão de comentários
│   ├── profile/              # Feature: Edição de perfil e discovery
│   ├── auth/                 # Feature: Fluxos de autenticação
│   ├── favorites/            # Feature: Marcação de favoritos
│   ├── [other features]/
│   └── [feature]/queries/    # Hooks useQuery/useMutation (TanStack Query)
│
├── shared/                    # Compartilhado entre domínios
│   ├── api/                  # Cliente Supabase, configuração API
│   ├── lib/                  # Esquemas Zod (validation.ts), utilitários
│   ├── components/           # Componentes UI reutilizáveis
│   ├── hooks/                # Custom React hooks
│   ├── config/               # Constantes, variáveis de ambiente
│   └── test/                 # Utilitários de teste (renderWithProviders, mocks MSW)
│
├── components/               # Componentes específicos de domínio
│   ├── ui/                   # shadcn/ui + Radix primitivos (45+)
│   ├── video/                # VideoCard, VideoDetails, VideoGrid, etc.
│   ├── playlist/             # PlaylistCard, PlaylistForm, etc.
│   ├── comment/              # CommentForm, CommentItem, MentionAutocomplete
│   ├── profile/              # ProfileCard, FollowButton, etc.
│   ├── auth/                 # LoginForm, SignupForm, etc.
│   ├── layout/               # Header, Footer, FeaturedHero, CategorySection
│   └── [other domains]/
│
├── pages/                    # Páginas de rota (lazy-loaded via React.lazy())
│   ├── Index.tsx             # Página inicial
│   ├── Videos.tsx            # Navegação/busca de vídeos
│   ├── VideoDetails.tsx      # Vídeo individual + comentários + enriquecimento
│   ├── Playlists.tsx         # Navegador de playlists
│   ├── PlaylistDetails.tsx   # Detalhe de playlist
│   ├── Auth.tsx              # Login/signup
│   ├── Profile.tsx           # Perfil de usuário
│   ├── [other pages]/
│   └── SmartSlugRoute.tsx    # Fallback route handler
│
├── i18n/                     # Internacionalização (PT, EN, ES, FR)
│   └── locales/
│
├── lib/utils.ts              # Utilitários UI (função cn())
├── integrations/supabase/    # Cliente Supabase + tipos TypeScript
├── App.tsx                   # Router principal (React Router v7 ready)
└── main.tsx                  # Ponto de entrada
```

**Princípios-chave**:
- ✅ **Separação de Responsabilidades**: entities (dados) → features (lógica) → components (UI)
- ✅ **API Layer Isolada**: Todas as chamadas Supabase em `entities/[domain]/[domain].api.ts`
- ✅ **Query Factory**: Chaves Query centralizadas em `queryKeys.test.ts` (DRY)
- ✅ **Composição UI**: shadcn/ui + Tailwind; nenhum arquivo CSS customizado
- ✅ **Imports Absolutos**: Use `@/` alias (ex: `@/shared/lib/validation`)

---

## 📦 Stack Tecnológico Completo

| Camada | Tecnologia | Versão | Notas |
|--------|-----------|--------|-------|
| **Frontend Framework** | React | 18 | TypeScript-first, Hooks |
| **Linguagem** | TypeScript | 5.6 | Type-safe em todo o código |
| **Build & Dev** | Vite | 7.3+ | HMR instantâneo (porta 8080) |
| **Estilização** | Tailwind CSS | 3.4+ | Utility-first, sem CSS customizado |
| **Componentes UI** | shadcn/ui + Radix UI | Latest | 45+ primitivos acessíveis |
| **Ícones** | Lucide React | 0.462+ | Named exports only |
| **Roteamento** | React Router DOM | v6/v7 | Centralized em `src/App.tsx` |
| **Data Fetching** | TanStack Query | v5 | Smart caching, dedup, sync |
| **Formulários** | React Hook Form | v7 + Zod v3.25 | Declarativo, type-safe |
| **Estado Local** | React built-in | — | useState, useContext (sem Redux) |
| **Backend** | Supabase | — | PostgreSQL, Auth, Edge Functions, RLS |
| **Notificações** | Sonner | v1.7+ | Toast library |
| **Datas** | date-fns | v3.6+ | Manipulação lightweight |
| **Testes** | Vitest + RTL | v4 | MSW para mocking |
| **Linting** | ESLint 9 + TS | Latest | Type-aware rules |
| **i18n** | i18next | Latest | 4 idiomas: PT, EN, ES, FR |
| **PWA** | Vite PWA Plugin | — | Offline, manifest, service worker |
| **Drag & Drop** | dnd-kit | — | Acessível, moderno |

---

## 🎯 Padrões de Código & Convenções

### **1. Validação Compartilhada (CRÍTICO - DRY)**

📍 **Arquivo**: `src/shared/lib/validation.ts`

**Regra**: **SEMPRE reutilizar esquemas compartilhados**. Nunca duplique validações de email, senha ou username.

```typescript
// ✅ CORRETO: Reutilizar esquemas
import { emailSchema, passwordSchema, usernameSchema, createPasswordConfirmationSchema } from '@/shared/lib/validation';

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: createPasswordConfirmationSchema(),
  username: usernameSchema,
});

// ❌ ERRADO: Duplicar lógica
const customEmailSchema = z.string().email(); // NÃO FAÇA ISSO
```

**Esquemas Disponíveis**:
- `emailSchema`: Validação de email
- `passwordSchema`: Mín. 6 caracteres
- `usernameSchema`: Mín. 3 caracteres
- `createPasswordConfirmationSchema()`: Validador de correspondência

---

### **2. Padrão de API (Entities)**

📍 **Arquivo**: `src/entities/[domain]/[domain].api.ts`

```typescript
// Exemplo: video.api.ts
export async function listVideos(params: ListVideosParams = {}) {
  let query = supabase
    .from('videos')
    .select('*, category:categories(...), ai_enrichments!(...)')
    .order('created_at', { ascending: false });
  
  // Adicionar filtros condicionalmente
  if (params.featured) query = query.eq('is_featured', true);
  if (params.searchQuery) query = query.or('title.ilike.%...%,description.ilike.%...%');
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getVideoById(id: string) {
  const { data, error } = await supabase
    .from('videos')
    .select('*, category:categories(...), ai_enrichments!(...)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
```

**Regras**:
- ✅ Manter funções de API em `entities/` (perto dos dados)
- ✅ Importar `supabase` de `@/shared/api/supabase/supabaseClient`
- ✅ Sempre especificar relações em `select()` (evitar N+1 queries)
- ✅ Usar tipos de `[domain].types.ts`
- ✅ Tratar erros explicitamente

---

### **3. Padrão de Hooks Query**

📍 **Arquivo**: `src/features/[domain]/queries/use[Domain].ts`

```typescript
// Exemplo: useVideos.ts
export function useVideos(params?: ListVideosParams) {
  return useQuery({
    queryKey: videoQueryKeys.list(params),
    queryFn: () => listVideos(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useSearchProfiles(query: string, limit = 10) {
  return useQuery({
    queryKey: profileQueryKeys.search(query, limit),
    queryFn: () => searchProfiles(query, limit),
    enabled: query.length > 0, // Executar só se query existe
    staleTime: 30 * 1000,
  });
}
```

**Regras**:
- ✅ Usar TanStack Query para todo estado do servidor
- ✅ Definir `queryKey` em `src/entities/queryKeys.test.ts`
- ✅ Usar `enabled` para queries condicionais
- ✅ Nunca fazer fetch direto sem useQuery/useMutation

---

### **4. Padrão de Componentes**

📍 **Arquivo**: `src/components/[domain]/[Component].tsx`

```typescript
// Exemplo: VideoCard.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function VideoCard({ video, onClick, className }: VideoCardProps) {
  return (
    <Card className={cn('group cursor-pointer', className)}>
      <CardContent className="p-0">
        <img 
          src={video.thumbnail_url} 
          alt={video.title}
          className="aspect-video object-cover group-hover:opacity-75"
        />
        <div className="p-4">
          <h3 className="font-semibold line-clamp-2">{video.title}</h3>
          <p className="text-sm text-muted-foreground">{video.category?.name}</p>
          <Button onClick={onClick} className="mt-2 w-full">
            Assistir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Exportar interface Props
export interface VideoCardProps {
  video: Video;
  onClick?: () => void;
  className?: string;
}
```

**Regras**:
- ✅ Priorizar `shadcn/ui` para componentes UI
- ✅ Usar `Tailwind CSS` exclusivamente (nenhum `.css` customizado)
- ✅ Usar função `cn()` para merge de classes
- ✅ Colocar testes ao lado: `Component.test.tsx`
- ✅ Exportar interfaces Props no topo

---

### **5. Padrão de Formulários**

📍 **Exemplo**: `src/components/comment/CommentForm.tsx`

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormControl, FormMessage } from '@/components/ui/form';

const commentSchema = z.object({
  content: z.string().min(1, 'Comentário não pode estar vazio'),
});

type CommentFormData = z.infer<typeof commentSchema>;

export function CommentForm({ onSubmit }: CommentFormProps) {
  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormControl>
              <Textarea placeholder="Seu comentário..." {...field} />
            </FormControl>
          )}
        />
        <Button type="submit">Enviar</Button>
      </form>
    </Form>
  );
}
```

**Regras**:
- ✅ Usar `react-hook-form` + `Zod` (type-safe)
- ✅ Nunca duplicar validação (usar `src/shared/lib/validation.ts`)
- ✅ Usar componentes Form do shadcn/ui

---

## 🛠️ Workflow de Desenvolvimento

### **Scripts Principais**
```bash
pnpm dev                # Dev server (localhost:8080)
pnpm build              # Build produção
pnpm build:analyze      # Build + estatísticas de bundle
pnpm lint               # ESLint check
pnpm typecheck          # TypeScript validation (sem emit)
pnpm test               # Vitest run
pnpm test:watch        # Modo watch
pnpm test:coverage     # Relatório de coverage
```

### **Pipeline de Build**
1. **Desenvolvimento**: Vite HMR (hot reload instantâneo)
2. **Produção**: 
   - Bundle JS minificado (~1.13MB)
   - Tailwind purging
   - Code splitting (lazy routes)
   - PWA manifest + service worker
3. **CI/CD**: GitHub Actions (pnpm install, typecheck, tests)

### **Ambiente**
```bash
# .env (não committed)
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

⚠️ Prefixar com `VITE_` para Vite expor ao frontend.

---

## 📚 Documentação Existente

Consulte estes arquivos para contexto adicional:

- [README.md](./README.md) — Visão geral do projeto, features, como começar
- [docs/CODEBASE.md](./docs/CODEBASE.md) — Arquitetura detalhada, padrões, features recentes
- [docs/PHASE_2_SUMMARY.md](./docs/PHASE_2_SUMMARY.md) — Integração OpenAI para enriquecimento de vídeos
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) — Histórico de versões (atual: v0.1.5)
- [docs/TODO.md](./docs/TODO.md) — Features adicionadas, bugs corrigidos, cobertura de testes
- [docs/REACT_ROUTER_V7_FLAGS.md](./docs/REACT_ROUTER_V7_FLAGS.md) — Configuração React Router v7
- [AI_RULES.md](./AI_RULES.md) — Regras ESLint, organização de arquivos, princípios

---

## ⚡ Arquivos Críticos & Exemplares

| Arquivo | Propósito | Importância |
|---------|-----------|-----------|
| [src/App.tsx](./src/App.tsx) | Router principal | Todas as rotas centralizadas aqui |
| [src/entities/queryKeys.test.ts](./src/entities/queryKeys.test.ts) | Factory de query keys (DRY) | Use para TODAS as queries |
| [src/shared/lib/validation.ts](./src/shared/lib/validation.ts) | Esquemas compartilhados | Nunca duplique validação |
| [src/entities/video/video.api.ts](./src/entities/video/video.api.ts) | Padrão de API | Exemplar: relações, filtros |
| [src/components/comment/CommentForm.tsx](./src/components/comment/CommentForm.tsx) | Integração shadcn/ui + RHF | Formulários type-safe |
| [src/components/comment/MentionAutocomplete.tsx](./src/components/comment/MentionAutocomplete.tsx) | Autocomplete com @mention | Feature recente: debouncing |
| [supabase/migrations/](./supabase/migrations/) | Schema do banco de dados | Todas as tabelas, RLS policies |
| [supabase/functions/enrich-video/](./supabase/functions/enrich-video/) | Integração OpenAI | Edge Functions pattern |
| [server/server.ts](./server/server.ts) | SSR/preview server | Meta tags, OG, assets estáticos |

---

## ⚠️ Armadilhas Comuns & Soluções

| Problema | Solução | Prevenção |
|----------|---------|-----------|
| **Duplicar validação** | Importar de `@/shared/lib/validation.ts` | Sempre reutilizar esquemas |
| **Fetch direto em componentes** | Envolver em useQuery/useMutation | All data fetching → features |
| **N+1 queries Supabase** | Usar `select('*, relation(...)')` | Especificar relações upfront |
| **CSS customizado** | Usar Tailwind utilities | ESLint força utilidades |
| **RHF sem Zod** | Sempre pair RHF com Zod | Type-safety é obrigatório |
| **Import chains (`../../../`)** | Usar alias `@/` | tsconfig.json já configurado |
| **Componente em pasta errada** | Verificar organização por domínio | `src/components/[domain]/` |
| **Tipos inline** | Definir em `[domain].types.ts` | Tipos em entities |
| **RLS bypasses** | Filtrar por `auth.uid()` em mutations | RLS policies são enforced |
| **Strings hard-coded** | Traduzir via i18next keys | Ver `i18n/locales/` |

---

## 🔄 Transição de Marca (Em Progresso)

O projeto está em processo de transição de marca de **Monynha Softwares** / **Monynha Fun** para **Open 2 Technology (Open2 / O2T)** e **Tube O2** (https://tube.open2.tech).

### **Substituições Necessárias**:

1. **Marca Corporativa**:
   - `Monynha Softwares` → `Open 2 Technology` (ou `Open2` / `O2T` conforme contexto)
   - URLs: `monynha.com` → `open2.tech`

2. **Nome do Produto**:
   - `Monynha Fun` → `Tube O2`
   - URLs: `monynha.fun` → `tube.open2.tech`

3. **Referências de Código**:
   - `monynha-fun` (package name) → `tube-o2`
   - `monynha.fun` (URLs, emails) → `tube.open2.tech`, `open2.tech`
   - Comments, docs, meta tags

### **Arquivos com Referências**:
- HTML: `index.html`, `server/server.ts`
- JSON: `package.json`, `vite.config.ts`, `docs/CHANGELOG.md`, `docs/PHASE_1_SUMMARY.md`
- Markdown: `README.md`, `docs/`.md, `CHANGELOG.md`
- XML: `public/sitemap.xml`, `public/robots.txt`
- i18n: `src/i18n/locales/`
- Código: `src/pages/VideoDetails.tsx`, etc.

**Nota**: Esta transição deve ser coordenada com atualizações de DNS, certificados SSL e implantação de infraestrutura.

---

## 🎯 Regras de Uso de Bibliotecas (Tube O2)

Para manter uma base de código consistente e eficiente, siga estas regras ao implementar novos recursos ou modificar os existentes:

*   **Componentes UI**: Sempre priorize os componentes `shadcn/ui`. Se um componente específico não estiver disponível no `shadcn/ui`, crie um novo componente pequeno seguindo os padrões de estilo e acessibilidade do `shadcn/ui`. Não modifique diretamente os arquivos de componentes `shadcn/ui` existentes.
*   **Estilização**: Use `Tailwind CSS` exclusivamente para toda a estilização. Evite estilos inline ou módulos CSS separados, a menos que seja absolutamente necessário para um caso muito específico e isolado (e justifique seu uso).
*   **Ícones**: Use ícones da biblioteca `lucide-react`.
*   **Gerenciamento de Estado e Busca de Dados**: Para estado do servidor (busca de dados, cache, sincronização), use `TanStack Query`. Para estado simples do lado do cliente, use `useState` e `useContext` do React.
*   **Roteamento**: Toda a navegação dentro do aplicativo deve ser tratada usando `react-router-dom`. Mantenha as definições de rota em `src/App.tsx`.
*   **Autenticação e Interações com o Banco de Dados**: Todos os fluxos de autenticação (cadastro, login, logout) e operações de banco de dados devem usar o cliente `Supabase` (`@supabase/supabase-js`) importado de `src/integrations/supabase/client.ts`. **Para a interface de usuário de autenticação, utilizamos formulários customizados implementados com `react-hook-form` e `Zod` para maior flexibilidade e controle sobre o design.**
*   **Manipulação de Formulários**: Para formulários, use `react-hook-form` para gerenciar o estado e as submissões do formulário, combinado com `Zod` para validação de esquema.
*   **Esquemas de Validação**: **SEMPRE use os esquemas de validação compartilhados** de `src/shared/lib/validation.ts` para garantir consistência. Não duplique validações de email, senha ou username. Use `emailSchema`, `passwordSchema`, `usernameSchema`, e `createPasswordConfirmationSchema()` para casos comuns. Este é um princípio DRY (Don't Repeat Yourself) fundamental do projeto.
*   **Notificações Toast**: Para exibir mensagens transitórias ao usuário (sucesso, erro, informação), use a biblioteca `sonner`.
*   **Funções Utilitárias**: Para combinar classes Tailwind CSS, use a função utilitária `cn` de `src/lib/utils.ts`.
*   **Manipulação de Datas**: Use `date-fns` para quaisquer tarefas de formatação ou manipulação de datas.
*   **Design Responsivo**: Todos os componentes e layouts devem ser responsivos e se adaptar graciosamente a diferentes tamanhos de tela, utilizando as utilidades responsivas do Tailwind.
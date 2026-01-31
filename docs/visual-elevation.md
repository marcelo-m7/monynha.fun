# Sistema de Profundidade Visual (Elevation)

Este documento descreve o sistema de profundidade visual (elevation) do Monynha Fun, baseado em tokens CSS globais e utilitários Tailwind. O objetivo é padronizar sombras e hierarquia visual sem depender de estilos inline ou alterações nos componentes shadcn/ui.

## Tokens de Profundidade (CSS)

Os níveis de profundidade são definidos como variáveis CSS no arquivo `src/index.css` e são expostos para o Tailwind via `theme.extend.boxShadow`.

**Modo claro (light):**

```css
:root {
  --shadow-depth-1: var(--shadow-sm);
  --shadow-depth-2: var(--shadow-md);
  --shadow-depth-3: var(--shadow-lg);
}
```

**Modo escuro (dark):**

```css
.dark {
  --shadow-depth-1: 0 2px 6px hsl(0 0% 0% / 0.2);
  --shadow-depth-2: 0 6px 15px -2px hsl(0 0% 0% / 0.3);
  --shadow-depth-3: 0 8px 24px -3px hsl(0 0% 0% / 0.4);
}
```

Essas variáveis representam níveis de elevação crescentes: leve (depth-1), média (depth-2) e intensa (depth-3).

## Utilitários Tailwind

No `tailwind.config.ts`, os tokens são registrados como utilitários `shadow-depth-*`:

```ts
boxShadow: {
  'depth-1': 'var(--shadow-depth-1)',
  'depth-2': 'var(--shadow-depth-2)',
  'depth-3': 'var(--shadow-depth-3)'
}
```

Use esses utilitários diretamente quando precisar de um nível específico de sombra sem as classes de conveniência.

## Classes de Conveniência (Utilities)

As classes abaixo são definidas em `src/index.css` dentro de `@layer utilities` e devem ser preferidas no dia a dia:

### `.elevation-card`

Para cartões e contêineres principais. Aplica `depth-1` e sobe para `depth-2` ao interagir.

```tsx
<div className="elevation-card rounded-lg bg-card p-4">
  <PlaylistCard data={item} />
</div>
```

### `.elevation-hover`

Sem sombra inicial, aplica `depth-1` apenas no hover/focus. Útil para itens interativos sutis.

```tsx
<button className="elevation-hover rounded-md bg-secondary px-3 py-2">
  Ver detalhes
</button>
```

### `.elevation-dialog`

Sombra máxima para modais, popovers e dropdowns.

```tsx
<DialogContent className="elevation-dialog bg-card">
  ...
</DialogContent>
```

### `.elevation-fab`

Para botões flutuantes (FAB). Nível 2 por padrão, sobe para nível 3 no hover/focus.

```tsx
<button className="elevation-fab rounded-full bg-primary p-4 text-primary-foreground">
  +
</button>
```

## Recomendações de Acessibilidade

- **Foco visível:** Combine as classes de elevação com `focus:ring-*` quando o elemento for navegável por teclado.
- **Contraste em dark mode:** As sombras no modo escuro são mais opacas para manter visibilidade.
- **Hierarquia de camadas:** Para diálogos, mantenha `z-index` adequado caso o componente não trate disso automaticamente.

## Exemplo Visual (Antes/Depois)

- Cartões em repouso devem exibir `depth-1`.
- Em hover/focus, elevar para `depth-2`.
- Modais e popovers devem usar `depth-3`.

Se necessário, crie stories (Storybook) ou páginas de referência para validar os estados de hover/focus com designers e QA.

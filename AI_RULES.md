# AI Rules for This Project

## Tech Stack (Bullet Points)
- **React 18** with **TypeScript** as the primary frontend framework
- **React Router v6** for client-side routing (routes defined in `src/App.tsx`)
- **Tailwind CSS** for utility‑first styling and responsive design
- **shadcn/ui** component library (built on Radix UI) for accessible, pre‑styled UI components
- **lucide-react** for consistent, lightweight icon set
- **React Query (tanstack/react-query)** for data fetching, caching, and background updates
- **React Hook Form** with **Zod** for form state management and validation
- **ESLint** + **Prettier** for code formatting and linting
- **Vite** as the build tool and dev server (already configured)
- **Optional**: Vitest + React Testing Library for unit/testing (if tests are added)

## Library Usage Rules
| Concern / Feature | Allowed Library / Approach | Reason / Note |
|-------------------|----------------------------|---------------|
| **Routing** | React Router v6 only (`src/App.tsx`) | Centralized routing; do not create custom history solutions |
| **Styling** | Tailwind CSS utility classes; optionally extend via `tailwind.config.ts` | Avoid writing custom CSS or CSS-in-JS unless absolutely necessary; keep styling in JSX via className |
| **UI Components** | shadcn/ui primitives (buttons, inputs, dialogs, etc.) | Use these as the base; if a component needs modification, create a wrapper component in `src/components/` rather than editing the shadcn files directly |
| **Icons** | lucide-react only | Import icons as named exports; do not use other icon libraries |
| **State Management** | React built‑in (`useState`, `useReducer`, `useContext`) for local/UI state; React Query for server state | Avoid external state libraries (Redux, MobX, etc.) unless explicitly approved |
| **Data Fetching** | React Query (`useQuery`, `useMutation`) | Handles caching, deduplication, background updates; do not use raw `fetch`/`axios` in components without wrapping in a query/mutation |
| **Forms** | React Hook Form + Zod schema validation | Centralizes validation logic; avoid uncontrolled form inputs or manual state for form fields |
| **Icons & Images** | lucide-react for icons; import static images via Vite (`import img from './image.png'`) | Keep assets in `src/assets/` |
| **Utilities / Helpers** | Create pure functions in `src/lib/` or `src/utils/` | Keep them testable and free of side effects |
| **Testing** | If tests are added: Vitest + React Testing Library + user-event | Follow React Testing Library guidelines; avoid testing implementation details |
| **Code Formatting** | ESLint with Prettier plugin | Run `npm run lint` and `npm run format` as needed; do not disable rules without justification |
| **Absolute Imports** | Configured via `tsconfig.json` (`@/*`) | Use `@/` alias for imports from `src/`; avoid relative paths like `../../../components` |
| **File Organization** | - Pages: `src/pages/` <br> - Components: `src/components/` (shared) or `src/components/[page]` (page‑specific) <br> - Styles: Tailwind only (no CSS files) <br> - Hooks: `src/hooks/` <br> - Utils/Lib: `src/lib/` or `src/utils/` <br> - Assets: `src/assets/` | Maintain consistency; new files must follow this structure |

## General Principles
- **Prefer composition over configuration**: Build UI by composing shadcn/ui primitives and Tailwind classes.
- **Keep components small and focused**: A component should have a single responsibility.
- **Avoid magic strings/numbers**: Extract to constants or config files.
- **No direct DOM manipulation**: Use React refs only when absolutely necessary (e.g., focus management) and wrap in a custom hook.
- **Environment variables**: Prefix with `VITE_` for Vite; store in `.env` (not committed).
- **Commit messages**: Follow conventional style (`feat:`, `fix:`, `docs:`, etc.).
- **Branch naming**: `feature/...`, `bugfix/...`, `chore/...`.

These rules ensure a maintainable, consistent codebase that leverages the chosen libraries effectively.
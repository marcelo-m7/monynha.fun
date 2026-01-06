# Project Guidelines for AI Agents

This document outlines the core technologies and specific library usage rules for this project. Adhering to these guidelines ensures consistency, maintainability, and optimal performance.

## Tech Stack Overview

*   **Frontend Framework**: React.js
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **UI Component Library**: shadcn/ui (built on Radix UI)
*   **Backend-as-a-Service**: Supabase (for authentication, database, and edge functions)
*   **Routing**: React Router DOM
*   **Data Fetching & Caching**: TanStack Query
*   **Icons**: Lucide React
*   **Form Management & Validation**: React Hook Form with Zod

## Library Usage Rules

To maintain a consistent and efficient codebase, please follow these rules when implementing new features or modifying existing ones:

*   **UI Components**: Always prioritize `shadcn/ui` components. If a specific component is not available in `shadcn/ui`, create a new, small component following `shadcn/ui`'s styling and accessibility patterns. Do not modify existing `shadcn/ui` component files directly.
*   **Styling**: Use `Tailwind CSS` exclusively for all styling. Avoid inline styles or separate CSS modules unless absolutely necessary for a very specific, isolated case (and justify its use).
*   **Icons**: Use icons from the `lucide-react` library.
*   **State Management & Data Fetching**: For server state (data fetching, caching, synchronization), use `TanStack Query`. For simple client-side state, use React's `useState` and `useContext`.
*   **Routing**: All navigation within the application should be handled using `react-router-dom`. Keep route definitions in `src/App.tsx`.
*   **Authentication & Database Interactions**: All authentication flows (sign-up, sign-in, sign-out) and database operations must use the `Supabase` client (`@supabase/supabase-js`) imported from `src/integrations/supabase/client.ts`.
*   **Form Handling**: For forms, use `react-hook-form` for managing form state and submissions, combined with `Zod` for schema validation.
*   **Toast Notifications**: For displaying transient messages to the user (success, error, info), use the `sonner` library.
*   **Utility Functions**: For combining Tailwind CSS classes, use the `cn` utility function from `src/lib/utils.ts`.
*   **Date Manipulation**: Use `date-fns` for any date formatting or manipulation tasks.
*   **Responsive Design**: All components and layouts must be responsive and adapt gracefully to different screen sizes, utilizing Tailwind's responsive utilities.
# Monynha Fun: Diretrizes de Projeto para Agentes de IA

Este documento descreve as tecnologias centrais e as regras específicas de uso de bibliotecas para o projeto **Monynha Fun**, de **Monynha Softwares**. A adesão a estas diretrizes garante consistência, manutenibilidade e desempenho ideal, alinhando-se à nossa filosofia de democratizar a tecnologia e valorizar a curadoria humana assistida por IA.

## Visão Geral da Pilha Tecnológica

*   **Framework Frontend**: React.js
*   **Linguagem**: TypeScript
*   **Ferramenta de Build**: Vite
*   **Estilização**: Tailwind CSS
*   **Biblioteca de Componentes UI**: shadcn/ui (construída sobre Radix UI)
*   **Backend-as-a-Service**: Supabase (para autenticação, banco de dados e Edge Functions)
*   **Roteamento**: React Router DOM
*   **Busca e Cache de Dados**: TanStack Query
*   **Ícones**: Lucide React
*   **Gerenciamento e Validação de Formulários**: React Hook Form com Zod
*   **Notificações Toast**: Sonner
*   **Manipulação de Datas**: date-fns

## Regras de Uso de Bibliotecas (Monynha Fun)

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
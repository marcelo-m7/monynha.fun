#!/usr/bin/env bash
set -euo pipefail

# Fail fast se o token não existir
: "${SUPABASE_SERVICE_ROLE_KEY:?❌ Defina SUPABASE_SERVICE_ROLE_KEY antes de rodar.}"

PROJECT_REF="${SUPABASE_PROJECT_REF:-wvkjainfwsyiyfcmbtid}"
MCP_URL="https://mcp.supabase.com/mcp?project_ref=${PROJECT_REF}"

echo "🚀 Instalando Codex (global)..."
npm install -g codex >/dev/null

echo "🔌 Adicionando MCP do Supabase no Codex..."
# Evita ecoar token acidentalmente
codex mcp add supabase \
  --url "$MCP_URL" \
  --header "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" >/dev/null

echo "✅ Configurado: supabase -> $MCP_URL"

# (Opcional) Verificar se apareceu na lista (se o codex suportar listar)
if codex mcp list >/dev/null 2>&1; then
  echo "📋 MCPs registrados:"
  codex mcp list
else
  echo "ℹ️ (Sem 'codex mcp list' disponível nessa versão — configuração feita mesmo assim.)"
fi

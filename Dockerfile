# Stage 1: Build the React application
FROM oven/bun:1-alpine AS builder

# Build arguments for Vite environment variables
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_URL

WORKDIR /app

# Copy package.json and bun.lockb first to leverage Docker cache
COPY package.json bun.lock ./

# Install dependencies
# Note: Not using --frozen-lockfile to allow Bun to regenerate lockfile in compatible format
RUN bun install || bun install --no-save

# Copy the rest of the application code
COPY . .

# Export build arguments as environment variables for Vite
ENV VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}

# Build the React app for production
# The build output will be in the 'dist' directory
RUN bun run build

# Stage 2: Run with Bun server for dynamic OG/Twitter HTML injection
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

# Reuse dependencies from builder stage to avoid lockfile resolution at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock

# Copy built client and server entrypoint
COPY --from=builder /app/dist ./dist
COPY server ./server

# Expose Bun server port
EXPOSE 80

# Runtime env vars expected by the server:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
CMD ["bun", "server/server.ts"]
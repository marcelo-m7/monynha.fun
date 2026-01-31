# Stage 1: Build the React application
FROM oven/bun:1.1.17-alpine AS builder

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

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the builder stage
COPY --from=builder /app/dist .

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
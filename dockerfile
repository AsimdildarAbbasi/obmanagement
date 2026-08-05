# --- STAGE 1: Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first to leverage Docker caching
COPY package*.json ./
RUN npm install

# Copy the rest of your frontend code
COPY . .

# Build the Next.js application
RUN npm run build

# --- STAGE 2: Production Run Stage ---
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy only the necessary built files from the builder stage
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Next.js runs on port 3000 by default
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
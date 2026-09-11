FROM node:20-alpine

# Prisma requires OpenSSL
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Generate Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copy application source
COPY . .

# Compile TypeScript
RUN npm run build

EXPOSE 4000

# Start production application
CMD ["npm", "start"]

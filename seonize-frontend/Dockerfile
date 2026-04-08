# Build stage
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies 
# (Adding --legacy-peer-deps just in case of peer dependency conflicts)
RUN npm install

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production-stage

# Copy the built files from the build stage to nginx's public directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy a simple nginx config for SPA routing (optional but recommended)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

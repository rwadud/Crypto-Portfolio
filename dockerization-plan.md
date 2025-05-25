# Dockerization Plan for Crypto Portfolio (Dev & Prod)

## Overview
Dockerize the Crypto Portfolio application with separate containers for each service, with both development and production configurations.

## Architecture
- **Web App Container**: Node.js application with hot-reload in dev
- **MongoDB Container**: Database service
- **Scraper Container**: Continuous scraping service
- **Network**: Custom bridge network for inter-container communication

## Implementation Steps

### 1. Create Multi-Stage Dockerfile for Application
Create `Dockerfile` in project root:
```dockerfile
# Development stage
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 2. Create Dockerfile for Scraper
Create `Dockerfile.scraper`:
```dockerfile
# Development stage
FROM node:18-alpine AS development
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev:scraper"]

# Production stage
FROM node:18-alpine AS production
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "scrape.js"]
```

### 3. Create Docker Compose Configurations

#### Base Configuration (docker-compose.yml):
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: crypto-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
      - mongo-config:/data/configdb
    environment:
      MONGO_INITDB_DATABASE: crypto
    networks:
      - crypto-network

  web:
    build:
      context: .
      target: ${BUILD_TARGET:-development}
    container_name: crypto-web
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
    environment:
      MONGODB_URI: mongodb://mongodb:27017/crypto
    networks:
      - crypto-network

  scraper:
    build:
      context: .
      dockerfile: Dockerfile.scraper
      target: ${BUILD_TARGET:-development}
    container_name: crypto-scraper
    depends_on:
      - mongodb
    environment:
      MONGODB_URI: mongodb://mongodb:27017/crypto
    networks:
      - crypto-network

volumes:
  mongo-data:
  mongo-config:

networks:
  crypto-network:
    driver: bridge
```

#### Development Override (docker-compose.dev.yml):
```yaml
version: '3.8'

services:
  mongodb:
    restart: unless-stopped

  web:
    restart: unless-stopped
    volumes:
      - ./:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
    command: ["npm", "run", "dev"]

  scraper:
    restart: unless-stopped
    volumes:
      - ./:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
    command: ["npm", "run", "dev:scraper"]
```

#### Production Override (docker-compose.prod.yml):
```yaml
version: '3.8'

services:
  mongodb:
    restart: always
    ports:
      - "127.0.0.1:27017:27017"  # Bind only to localhost

  web:
    restart: always
    environment:
      NODE_ENV: production
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  scraper:
    restart: always
    environment:
      NODE_ENV: production
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### 4. Update package.json Scripts
Add development scripts to `package.json`:
```json
"scripts": {
  "start": "node ./bin/www",
  "dev": "nodemon ./bin/www",
  "dev:scraper": "nodemon scrape.js",
  "scrape": "node scrape.js"
}
```

### 5. Update Database Connection
Modify `util/Database.js` to use environment variable:
```javascript
const mongoUri = process.env.MONGODB_URI || `mongodb://localhost:27017/crypto`;
mongoose.connect(mongoUri)
```

### 6. Update Scraper for Docker Environment
Modify `scrape.js` Puppeteer configuration:
```javascript
const browser = await puppeteer.launch({
    headless: 'new',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
});
```

### 7. Create .dockerignore
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.*
.vscode
.DS_Store
server.log
*.log
docker-compose*.yml
Dockerfile*
dockerization-plan.md
```

### 8. Environment Configuration

#### Create `.env.development`:
```
NODE_ENV=development
MONGODB_URI=mongodb://mongodb:27017/crypto
PORT=3000
```

#### Create `.env.production`:
```
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/crypto
PORT=3000
```

#### Create `.env.example`:
```
NODE_ENV=development
MONGODB_URI=mongodb://mongodb:27017/crypto
PORT=3000
```

### 9. Add Health Check Endpoint
Create a health check route in `routes/index.js`:
```javascript
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});
```

## Deployment Commands

### Development Mode
```bash
# Start all services in development mode with hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Rebuild and start
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Run in background
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Production Mode
```bash
# Build and start in production
BUILD_TARGET=production docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Useful Commands
```bash
# View logs for specific service
docker-compose logs -f web
docker-compose logs -f scraper
docker-compose logs -f mongodb

# Execute commands in running container
docker-compose exec web sh
docker-compose exec mongodb mongosh

# View running containers
docker-compose ps

# View resource usage
docker stats

# Clean up everything (including volumes)
docker-compose down -v
```

## Benefits of Dev/Prod Setup

### Development Benefits
1. **Hot Reload**: Code changes reflect immediately without rebuilding
2. **Volume Mounting**: Edit code locally, see changes in container
3. **Debugging**: Easy access to logs and container shells
4. **Isolated Dependencies**: No need to install MongoDB locally
5. **Consistent Environment**: Same setup for all developers

### Production Benefits
1. **Optimized Images**: Smaller size with production dependencies only
2. **Security**: Hardened configuration, no dev tools
3. **Performance**: Resource limits and health checks
4. **Reliability**: Auto-restart policies
5. **Monitoring**: Built-in health endpoints

## Key Differences Between Dev and Prod

| Feature | Development | Production |
|---------|------------|------------|
| Node modules | Mounted from host | Baked into image |
| Code changes | Hot reload via nodemon | Requires rebuild |
| Restart policy | unless-stopped | always |
| MongoDB port | Open to host | Localhost only |
| Health checks | None | Configured |
| Resource limits | None | CPU/Memory limits |
| Build size | Larger (dev deps) | Optimized |

## Troubleshooting

### Common Issues
1. **Puppeteer fails in Docker**
   - Ensure Chromium dependencies are installed
   - Check PUPPETEER_EXECUTABLE_PATH is set

2. **MongoDB connection errors**
   - Wait for MongoDB to be ready
   - Check MONGODB_URI environment variable

3. **Permission errors**
   - Check file ownership
   - Ensure proper .dockerignore

4. **Hot reload not working**
   - Verify volume mounts
   - Check nodemon configuration

## Next Steps
1. Add Nginx reverse proxy for production 
2. Add Redis for caching
3. Set up CI/CD pipeline
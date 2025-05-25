# Crypto Portfolio Tracker

A real-time cryptocurrency portfolio tracking application that scrapes data from CoinMarketCap and provides a web interface for managing crypto portfolios.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start with Docker](#quick-start-with-docker)
- [Local Installation](#local-installation-without-docker)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Docker Commands](#docker-commands)
- [Development](#development)
- [Scraper Details](#scraper-details)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- 📊 Real-time cryptocurrency price tracking
- 💼 Portfolio management with user authentication
- 🔄 Automated data scraping every 5 minutes
- 📈 Price charts and market cap information
- 🌍 Location-based features
- 🐳 Fully dockerized with development and production configurations
- 🔥 Hot-reload development environment
- 🏥 Health monitoring endpoints
- 🔐 Secure authentication with bcrypt

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Frontend**: EJS templates, Bootstrap
- **Authentication**: Passport.js
- **Web Scraping**: Puppeteer, Cheerio
- **Containerization**: Docker, Docker Compose

## Prerequisites

### Option 1: Docker (Recommended)
- Docker Engine 20.10+
- Docker Compose v2.0+

### Option 2: Local Installation
- Node.js 18+ LTS
- MongoDB 7.0+
- Chrome/Chromium (for Puppeteer)

## Quick Start with Docker

### Development Mode

1. Clone the repository:
```bash
git clone <repository-url>
cd Crypto-Portfolio
```

2. Start all services:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

3. Access the application:
- Web Interface: http://localhost:3000
- MongoDB: localhost:27017

### Production Mode

```bash
BUILD_TARGET=production docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Local Installation (Without Docker)

1. Install dependencies:
```bash
# Install system dependencies (Ubuntu/Debian)
./provision/install.sh

# Install Node.js dependencies
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start MongoDB:
```bash
sudo systemctl start mongod
```

4. Run the application:
```bash
# Start web server
npm start

# In another terminal, start the scraper
node scrape.js
```

## Project Structure

```
crypto-portfolio/
├── bin/              # Application entry point
├── config/           # Configuration files (passport, auth)
├── models/           # MongoDB models
├── public/           # Static assets (CSS, JS)
├── routes/           # Express routes
├── views/            # EJS templates
├── util/             # Utility modules
├── scrape.js         # Cryptocurrency scraper
├── app.js            # Express app configuration
├── docker-compose*.yml # Docker configurations
└── Dockerfile*       # Docker images
```

## API Endpoints

- `GET /` - Home page with cryptocurrency list
- `GET /api/currencies` - JSON API for all cryptocurrencies
- `GET /currencies/:slug` - Individual cryptocurrency details
- `GET /portfolios` - User portfolios (authenticated)
- `POST /portfolios` - Create portfolio
- `GET /health` - Health check endpoint

## Docker Commands

### Development
```bash
# Start services
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# View logs
docker compose logs -f [service-name]

# Stop services
docker compose down

# Rebuild after changes
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Production
```bash
# Start in background
BUILD_TARGET=production docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View status
docker compose ps

# Stop services
docker compose down
```

### Useful Commands
```bash
# Access MongoDB shell
docker compose exec mongodb mongosh crypto

# Execute commands in containers
docker compose exec web sh
docker compose exec scraper sh

# View resource usage
docker stats
```

## Development

### Hot Reload
The development environment includes hot-reload functionality:
- Web server automatically restarts on file changes
- Scraper restarts when modified
- No need to rebuild containers for code changes

### Environment Variables

Create environment files for different scenarios:
- `.env.development` - Development configuration
- `.env.production` - Production configuration

Key variables:
```env
NODE_ENV=development
MONGODB_URI=mongodb://mongodb:27017/crypto
PORT=3000
```

## Scraper Details

The scraper runs automatically every 5 minutes and:
- Fetches top 100 cryptocurrencies from CoinMarketCap
- Uses dynamic column detection for resilience
- Stores data in MongoDB
- Handles errors gracefully

## Security Considerations

- Environment variables for sensitive data
- MongoDB runs on localhost only in production
- Passport.js for secure authentication
- bcrypt for password hashing
- Production Docker images optimized and minimal

## Troubleshooting

### Docker Issues
- **Puppeteer fails**: Ensure Chromium dependencies are installed in container
- **MongoDB connection**: Wait for MongoDB to be ready before starting services
- **Port conflicts**: Ensure ports 3000 and 27017 are available

### Local Installation Issues
- **MongoDB not starting**: Check if MongoDB service is enabled
- **Scraper fails**: Ensure Chrome/Chromium is installed
- **Dependencies**: Run `npm install` after pulling updates

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Recent Updates (2025)

### Dependency Updates
- Updated all dependencies to latest stable versions
- Migrated from deprecated packages (request → axios)
- Fixed all security vulnerabilities (0 vulnerabilities)
- Updated to Puppeteer 22.8.2, Mongoose 8.0.3, Passport 0.7.0

### Scraper Improvements
- Implemented dynamic column detection for CoinMarketCap changes
- Added robust error handling and data validation
- Improved header normalization for reliable parsing
- Enhanced logging for debugging

### Docker Integration
- Added multi-stage Dockerfiles for optimized builds
- Separate development and production configurations
- Hot-reload enabled in development mode
- Health check endpoints for monitoring

## System Requirements

### Minimum Requirements
- 2GB RAM
- 10GB disk space
- 2 CPU cores

### Recommended
- 4GB RAM
- 20GB disk space
- 4 CPU cores

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- CoinMarketCap for cryptocurrency data
- Bootstrap for UI components
- The Node.js and MongoDB communities

## Support

For issues, questions, or contributions, please open an issue on GitHub.
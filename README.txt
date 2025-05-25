# Crypto Tracker Application

## Running with Docker (Recommended)

This application can be easily run using Docker and Docker Compose.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

### Steps
1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Build and Run with Docker Compose:**
    From the project root directory (where `docker-compose.yml` is located), run:
    ```bash
    docker-compose build
    docker-compose up
    ```
    This will build the application image and start the application and MongoDB services.

3.  **Accessing the Application:**
    Once the services are running, the web application will be accessible at [http://localhost:3000](http://localhost:3000).

### Notes:
*   The `app` service connects to the MongoDB service defined in `docker-compose.yml` using the URL `mongodb://mongo:27017/crypto-tracker`.
*   To run in detached mode (in the background): `docker-compose up -d`
*   To view logs from the application container: `docker-compose logs app`
*   To stop the services: `docker-compose down`

---

Development Enviroment: 
OS: Ubuntu 18.04 LTS x64
Web Server: Node.js 12.16.2 LTS
Database: Mongodb 4.2.5

Installation:
Please run provision/install.sh to install project dependencies.
In the project root run "npm install" to install Node.js dependencies.

The system is developed and tested on an Ubuntu system. 
It will run on other Linux based systems but the depedencies in install.sh will need to be installed
according to the OS specifications.

Startup:
Run "pm2 start scrape.js" to start the scraping service. 
Run "pm2 start npm -- start --watch" to start the web service. 

Stopping:
Run "pm2 stop scrape" to stop scraping service
Run "pm2 stop npm" to stop web service

Do not include the quotes. Please allow a few minutes to pass after starting the scraping service before 
starting the web service.

You may need to disable adblocker on the browser as it may prevent some of the javascript from working properly.

Local url: http://localhost:3000/

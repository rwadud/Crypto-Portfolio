Alexander Nguyen 
Redwan Wadud 

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

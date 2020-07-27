#!/bin/bash

echo "Provisioning virtual machine..."
export DEBIAN_FRONTEND=noninteractive

sudo apt-get update && sudo apt-get upgrade && sudo apt-get install -y zip curl vim

echo "Installing Puppeteer dependencies"
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

echo "Installing redis"
sudo apt-get -y redis-server

echo "Installing Mongodb"
sudo apt-get install -y mongodb

echo "Installing Node.js and Pm2"
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
sudo pm2 startup systemd
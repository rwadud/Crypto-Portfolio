# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./

# Install dependencies
# Using --omit=dev to skip development dependencies for a smaller production image
# Using ci for cleaner, reproducible builds from package-lock.json
RUN npm ci --omit=dev

# If you had issues with Puppeteer not installing Chromium correctly via npm ci,
# you might need to explicitly install it or add dependencies.
# For now, we assume `npm ci` handles Puppeteer's bundled Chromium.
# Example of installing system dependencies for Puppeteer if needed (Debian-based):
# RUN apt-get update && apt-get install -y \
#     dumb-init \
#     ca-certificates \
#     fonts-liberation \
#     libasound2 \
#     libatk-bridge2.0-0 \
#     libatk1.0-0 \
#     libcairo2 \
#     libcups2 \
#     libdbus-1-3 \
#     libexpat1 \
#     libfontconfig1 \
#     libgbm1 \
#     libgcc1 \
#     libgconf-2-4 \
#     libgdk-pixbuf2.0-0 \
#     libglib2.0-0 \
#     libgtk-3-0 \
#     libnspr4 \
#     libnss3 \
#     libpango-1.0-0 \
#     libpangocairo-1.0-0 \
#     libstdc++6 \
#     libx11-6 \
#     libx11-xcb1 \
#     libxcb1 \
#     libxcomposite1 \
#     libxcursor1 \
#     libxdamage1 \
#     libxext6 \
#     libxfixes3 \
#     libxi6 \
#     libxrandr2 \
#     libxrender1 \
#     libxss1 \
#     libxtst6 \
#     lsb-release \
#     wget \
#     xdg-utils \
#     --no-install-recommends \
#     && rm -rf /var/lib/apt/lists/*

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run your app
# Using dumb-init to handle signals properly (optional, but good practice)
# If dumb-init is installed via apt-get above, uncomment the ENTRYPOINT line
# ENTRYPOINT ["dumb-init"]
CMD [ "npm", "start" ]

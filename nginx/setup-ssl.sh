#!/bin/bash

# SSL Setup Script for Crypto Portfolio Tracker
# This script helps set up Let's Encrypt SSL certificates

set -e

# Check if domain is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <domain> [email]"
    echo "Example: $0 example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

echo "Setting up SSL for domain: $DOMAIN"
echo "Email: $EMAIL"

# Create certbot service in docker-compose
cat > docker-compose.certbot.yml << EOF
version: '3.8'

services:
  certbot:
    image: certbot/certbot
    container_name: crypto-certbot
    volumes:
      - certbot-conf:/etc/letsencrypt
      - certbot-www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait \$\${!}; done;'"

volumes:
  certbot-conf:
    external: true
    name: crypto-portfolio_certbot-conf
  certbot-www:
    external: true
    name: crypto-portfolio_certbot-www
EOF

# Start nginx first (if not running)
echo "Starting Nginx service..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx

# Wait for nginx to be ready
sleep 5

# Obtain certificate
echo "Obtaining SSL certificate..."
docker-compose -f docker-compose.yml -f docker-compose.certbot.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN \
    -d www.$DOMAIN

# Create updated nginx config with SSL
echo "Updating Nginx configuration..."
sed -i.bak \
    -e "s/your-domain.com/$DOMAIN/g" \
    -e "s/# server {/server {/g" \
    -e "s/# }/}/g" \
    -e 's/# location \//location \//g' \
    -e 's/# return 301/return 301/g' \
    -e 's/# ssl_/ssl_/g' \
    -e 's/# add_header/add_header/g' \
    -e 's/# proxy_/proxy_/g' \
    nginx/nginx.conf

echo "Reloading Nginx..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx nginx -s reload

# Start certbot for auto-renewal
echo "Starting Certbot auto-renewal..."
docker-compose -f docker-compose.yml -f docker-compose.certbot.yml up -d certbot

echo "SSL setup complete!"
echo "Your site should now be available at https://$DOMAIN"
echo ""
echo "To test auto-renewal:"
echo "docker-compose -f docker-compose.yml -f docker-compose.certbot.yml exec certbot certbot renew --dry-run"
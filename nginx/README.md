# Nginx Reverse Proxy Configuration

This directory contains the Nginx configuration for the Crypto Portfolio application.

## Features

- Reverse proxy to Node.js application
- Gzip compression for better performance
- Health check endpoint
- SSL/TLS support (configured but commented out)
- Security headers for production
- Let's Encrypt support for SSL certificates

## Development Mode

In development, both Nginx (port 80) and the Node.js app (port 3000) are accessible:
- http://localhost - Access through Nginx
- http://localhost:3000 - Direct access to Node.js app

## Production Mode

In production, only Nginx is exposed:
- Port 80 (HTTP) - Redirects to HTTPS (when configured)
- Port 443 (HTTPS) - Main application access

## SSL Configuration

To enable SSL in production:

1. Update the server_name in nginx.conf with your domain
2. Uncomment the HTTPS server block in nginx.conf
3. Obtain SSL certificates using Let's Encrypt:

```bash
# Run certbot to obtain certificates
docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com
```

4. Update the SSL certificate paths in nginx.conf
5. Uncomment the HTTP to HTTPS redirect

## Testing

Test the Nginx configuration:
```bash
docker-compose exec nginx nginx -t
```

Reload Nginx after configuration changes:
```bash
docker-compose exec nginx nginx -s reload
```

## Security Headers

The production configuration includes:
- X-Frame-Options: Prevents clickjacking
- X-Content-Type-Options: Prevents MIME sniffing
- X-XSS-Protection: Enables XSS filter
- Referrer-Policy: Controls referrer information
- Content-Security-Policy: Controls resource loading

## Performance

- Gzip compression enabled for text files
- Keepalive connections for better performance
- Upstream connection pooling
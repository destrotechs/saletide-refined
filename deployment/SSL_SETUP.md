# SSL Certificate Setup with Let's Encrypt

This deployment automatically configures SSL certificates using Let's Encrypt for your SaleTide application.

## How It Works

The Ansible playbook handles SSL certificate generation in three phases:

### Phase 1: HTTP-Only Nginx Configuration
- Deploys initial Nginx configuration that serves the application over HTTP
- Configures the ACME challenge endpoint at `/.well-known/acme-challenge/`
- This allows Let's Encrypt to verify domain ownership

### Phase 2: SSL Certificate Generation
- Uses `certbot` in webroot mode to obtain certificates
- Validates domain ownership through HTTP challenge
- Stores certificates in `/etc/letsencrypt/live/saletide.destrotechs.org/`
- Skips if certificate already exists

### Phase 3: HTTPS Nginx Configuration
- Deploys full Nginx configuration with SSL/HTTPS enabled
- Redirects all HTTP traffic to HTTPS
- Configures security headers and SSL protocols

## Prerequisites

**CRITICAL**: DNS must be configured and propagated BEFORE deployment!

```bash
# Verify DNS is pointing to your server
nslookup saletide.destrotechs.org
# Should return: 158.220.124.84

# Or use dig
dig saletide.destrotechs.org +short
# Should return: 158.220.124.84
```

## Automatic Features

### 1. Certificate Generation
- Automatically generated during deployment
- Uses Let's Encrypt free certificates
- Valid for 90 days

### 2. Auto-Renewal
- Cron job runs daily at 3:00 AM
- Automatically renews certificates when they have 30 days or less until expiration
- Automatically reloads Nginx after renewal

### 3. Security Configuration
- TLS 1.2 and 1.3 only
- Strong cipher suites
- HTTP Strict Transport Security (HSTS)
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

## Certificate Locations

```bash
# Certificate files
/etc/letsencrypt/live/saletide.destrotechs.org/
├── fullchain.pem    # Full certificate chain (used by Nginx)
├── privkey.pem      # Private key (used by Nginx)
├── cert.pem         # Certificate only
└── chain.pem        # Chain only

# Certbot logs
/var/log/letsencrypt/letsencrypt.log

# ACME challenge directory
/var/www/certbot/
```

## Manual Operations

### Check Certificate Status
```bash
sudo certbot certificates
```

### Test Certificate Renewal
```bash
sudo certbot renew --dry-run
```

### Force Certificate Renewal
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### View Certificate Expiration
```bash
sudo certbot certificates | grep "Expiry Date"
```

### Check Auto-Renewal Cron Job
```bash
sudo crontab -l | grep certbot
```

## Troubleshooting

### Certificate Generation Failed

**Issue**: DNS not propagated yet
```bash
# Wait and verify DNS
nslookup saletide.destrotechs.org

# Re-run deployment (it will skip completed steps)
ansible-playbook -i inventory.ini deploy.yml
```

**Issue**: Port 80 not accessible
```bash
# Check firewall
sudo ufw status

# Ensure port 80 and 443 are open
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**Issue**: Certbot rate limits
Let's Encrypt has rate limits:
- 50 certificates per domain per week
- 5 failed validation attempts per hour

If you hit rate limits, wait and try again later.

### Certificate Not Renewing

```bash
# Check cron logs
sudo grep certbot /var/log/syslog

# Manually test renewal
sudo certbot renew --dry-run

# Check certbot timer (if using systemd timer instead of cron)
sudo systemctl status certbot.timer
```

### HTTPS Not Working

```bash
# Check if certificate exists
sudo ls -la /etc/letsencrypt/live/saletide.destrotechs.org/

# Check Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/saletide_error.log

# Verify Nginx is using correct certificate
sudo nginx -T | grep ssl_certificate
```

## Certificate Renewal Process

Certbot renewal happens automatically:

1. **Daily Check**: Cron job runs at 3:00 AM
2. **Certificate Check**: Certbot checks all certificates
3. **Renewal Trigger**: Renews if less than 30 days until expiration
4. **Validation**: Performs HTTP challenge validation
5. **Certificate Update**: Updates certificates in place
6. **Nginx Reload**: Automatically reloads Nginx to use new certificate

## Security Best Practices

1. **Keep certbot updated**:
   ```bash
   sudo apt update && sudo apt upgrade certbot python3-certbot-nginx
   ```

2. **Monitor certificate expiration**:
   - Set up monitoring alerts for certificate expiration
   - Check certbot logs regularly

3. **Test renewal regularly**:
   ```bash
   sudo certbot renew --dry-run
   ```

4. **Backup certificates** (optional):
   ```bash
   sudo tar -czf letsencrypt-backup.tar.gz /etc/letsencrypt/
   ```

## Manual Certificate Generation

If automatic generation fails and you need to manually generate:

```bash
# SSH to server
ssh root@158.220.124.84

# Ensure nginx is running with HTTP configuration
sudo systemctl status nginx

# Generate certificate
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d saletide.destrotechs.org \
  --email morrisdestro@gmail.com \
  --agree-tos \
  --non-interactive

# Re-run deployment to apply HTTPS configuration
# From your local machine:
ansible-playbook -i inventory.ini deploy.yml
```

## Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)

## Support

For SSL-related issues:
1. Check certbot logs: `/var/log/letsencrypt/letsencrypt.log`
2. Check Nginx logs: `/var/log/nginx/saletide_error.log`
3. Verify DNS configuration
4. Test port accessibility (80, 443)
5. Contact: morrisdestro@gmail.com

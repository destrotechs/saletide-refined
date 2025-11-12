# Manual SSL Certificate Setup

This guide provides multiple options for adding SSL certificates to your SaleTide deployment when automated Let's Encrypt is disabled or fails.

## Prerequisites

- Domain DNS must be pointing to your server IP
- Nginx is already configured with HTTP-only setup
- You have root access to the server

---

## Option 1: Manual Let's Encrypt (Certbot)

### Using Webroot Mode

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Stop Nginx temporarily
systemctl stop nginx

# Generate certificate using standalone mode (requires port 80/443)
certbot certonly --standalone \
  -d saletide.destrotechs.org \
  --non-interactive \
  --agree-tos \
  --email morrisdestro@gmail.com

# Start Nginx
systemctl start nginx
```

### Using DNS Challenge (Recommended if webroot fails)

```bash
# Install DNS plugin for your provider (example: CloudFlare)
apt-get install python3-certbot-dns-cloudflare

# Create CloudFlare API credentials file
cat > /root/.cloudflare.ini <<EOF
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
EOF
chmod 600 /root/.cloudflare.ini

# Generate certificate
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /root/.cloudflare.ini \
  -d saletide.destrotechs.org \
  --non-interactive \
  --agree-tos \
  --email morrisdestro@gmail.com
```

After obtaining the certificate, update Nginx configuration to use HTTPS:

```bash
# Deploy HTTPS Nginx configuration
cp /var/www/saletide/repo/deployment/templates/nginx_saletide.conf.j2 \
   /etc/nginx/sites-available/saletide

# Replace template variables manually or use sed
sed -i 's/{{ domain_name }}/saletide.destrotechs.org/g' /etc/nginx/sites-available/saletide
sed -i 's|{{ frontend_port }}|3001|g' /etc/nginx/sites-available/saletide
sed -i 's|{{ gunicorn_bind }}|unix:/var/www/saletide/backend/saletide.sock|g' /etc/nginx/sites-available/saletide

# Test and reload Nginx
nginx -t
systemctl reload nginx

# Setup auto-renewal
echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'" | crontab -
```

---

## Option 2: CloudFlare SSL (Free)

CloudFlare provides free SSL certificates through their proxy service.

### Setup Steps:

1. **Add domain to CloudFlare**
   - Sign up at https://dash.cloudflare.com
   - Add your domain `destrotechs.org`
   - Update nameservers at your domain registrar

2. **Enable SSL/TLS**
   - Go to SSL/TLS settings
   - Set SSL mode to "Full" or "Full (Strict)"
   - CloudFlare will generate a certificate automatically

3. **Update Nginx for CloudFlare Origin Certificate**

```bash
# Download CloudFlare origin certificate
# Go to SSL/TLS > Origin Server > Create Certificate
# Save the certificate and private key

mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/cert.pem    # Paste certificate
nano /etc/ssl/cloudflare/key.pem     # Paste private key
chmod 600 /etc/ssl/cloudflare/*.pem

# Update Nginx configuration
nano /etc/nginx/sites-available/saletide
```

Update SSL certificate paths in Nginx config:
```nginx
ssl_certificate /etc/ssl/cloudflare/cert.pem;
ssl_certificate_key /etc/ssl/cloudflare/key.pem;
```

```bash
# Test and reload
nginx -t
systemctl reload nginx
```

---

## Option 3: ZeroSSL (Free Alternative to Let's Encrypt)

ZeroSSL provides free SSL certificates similar to Let's Encrypt.

```bash
# Install acme.sh
curl https://get.acme.sh | sh
source ~/.bashrc

# Register with ZeroSSL
acme.sh --register-account -m morrisdestro@gmail.com --server zerossl

# Generate certificate (standalone mode)
systemctl stop nginx
acme.sh --issue --standalone -d saletide.destrotechs.org --server zerossl
systemctl start nginx

# Install certificate
acme.sh --install-cert -d saletide.destrotechs.org \
  --cert-file /etc/ssl/certs/saletide.crt \
  --key-file /etc/ssl/private/saletide.key \
  --fullchain-file /etc/ssl/certs/saletide-fullchain.crt \
  --reloadcmd "systemctl reload nginx"
```

Update Nginx SSL paths:
```nginx
ssl_certificate /etc/ssl/certs/saletide-fullchain.crt;
ssl_certificate_key /etc/ssl/private/saletide.key;
```

---

## Option 4: Self-Signed Certificate (Development/Testing Only)

**WARNING**: Not recommended for production. Browsers will show security warnings.

```bash
# Generate self-signed certificate
mkdir -p /etc/ssl/saletide
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/saletide/key.pem \
  -out /etc/ssl/saletide/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=saletide.destrotechs.org"

# Update Nginx SSL paths
nano /etc/nginx/sites-available/saletide
```

Update SSL certificate paths:
```nginx
ssl_certificate /etc/ssl/saletide/cert.pem;
ssl_certificate_key /etc/ssl/saletide/key.pem;
```

```bash
nginx -t
systemctl reload nginx
```

---

## Option 5: Commercial SSL Certificate

If you have a commercial SSL certificate (GoDaddy, Namecheap, etc.):

1. **Upload certificate files to server**
```bash
mkdir -p /etc/ssl/commercial
# Upload via SCP or copy-paste:
# - certificate.crt (your certificate)
# - private.key (your private key)
# - ca_bundle.crt (certificate authority bundle)
```

2. **Combine certificates if needed**
```bash
cat certificate.crt ca_bundle.crt > fullchain.pem
```

3. **Update Nginx configuration**
```nginx
ssl_certificate /etc/ssl/commercial/fullchain.pem;
ssl_certificate_key /etc/ssl/commercial/private.key;
```

4. **Test and reload**
```bash
nginx -t
systemctl reload nginx
```

---

## Verification

After installing any SSL certificate, verify:

```bash
# Check certificate details
openssl x509 -in /etc/letsencrypt/live/saletide.destrotechs.org/fullchain.pem -noout -text

# Check Nginx SSL configuration
nginx -t

# Test HTTPS connection
curl -I https://saletide.destrotechs.org

# Check SSL expiration
echo | openssl s_client -servername saletide.destrotechs.org -connect saletide.destrotechs.org:443 2>/dev/null | openssl x509 -noout -dates
```

### Browser Testing

1. Visit `https://saletide.destrotechs.org` in browser
2. Click the padlock icon to view certificate details
3. Verify:
   - Certificate is valid
   - Issued to correct domain
   - Not expired
   - No security warnings (except for self-signed)

---

## Troubleshooting

### Certificate Not Found
```bash
ls -la /etc/letsencrypt/live/saletide.destrotechs.org/
# If empty, certificate generation failed - check logs
tail -f /var/log/letsencrypt/letsencrypt.log
```

### Permission Denied
```bash
chmod 644 /etc/ssl/certs/*.crt
chmod 600 /etc/ssl/private/*.key
chown root:root /etc/ssl/certs/*.crt
chown root:root /etc/ssl/private/*.key
```

### Nginx Configuration Test Failed
```bash
nginx -t
# Read error messages carefully
# Check SSL certificate paths are correct
# Ensure certificate files exist and have correct permissions
```

### Mixed Content Warnings
After enabling SSL, ensure your frontend is using HTTPS for API calls:
```bash
# Update frontend .env.local
nano /var/www/saletide/frontend/.env.local
# Set: NEXT_PUBLIC_API_URL=https://saletide.destrotechs.org/api
pm2 restart saletide-frontend
```

---

## Recommended: CloudFlare + Origin Certificate

For production, we recommend **CloudFlare with Origin Certificate** (Option 2):

**Advantages:**
- ✅ Free forever
- ✅ Automatic DDoS protection
- ✅ CDN/caching included
- ✅ No renewal required (15-year validity)
- ✅ Additional security features
- ✅ Analytics and logging

**Disadvantages:**
- Traffic goes through CloudFlare proxy
- Some advanced features require paid plans

---

## Re-enabling Automated Let's Encrypt

If you want to try automated Let's Encrypt again after fixing DNS/configuration:

1. Edit `deployment/vars.yml`:
```yaml
enable_ssl_generation: true
```

2. Re-run deployment:
```bash
ansible-playbook -i inventory.ini deploy.yml
```

---

## Support

For SSL-related issues:
- Let's Encrypt Community: https://community.letsencrypt.org
- CloudFlare Support: https://support.cloudflare.com
- ZeroSSL Support: https://zerossl.com/support

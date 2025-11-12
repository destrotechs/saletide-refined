# SaleTide Deployment Guide

This directory contains Ansible playbooks and configuration files for deploying SaleTide to a production server.

## Prerequisites

### On Your Local Machine
1. **Ansible installed** (version 2.9+)
```bash
# On macOS
brew install ansible

# On Ubuntu/Debian
sudo apt update
sudo apt install ansible

# Verify installation
ansible --version
```

2. **Required Ansible collections**
```bash
ansible-galaxy collection install community.postgresql
ansible-galaxy collection install community.general
```

### On The Server
Already configured on your server:
- ✅ Nginx
- ✅ PostgreSQL (any version, but note PostgreSQL 15+ has different default schema permissions)
- ✅ PM2
- ✅ Node.js

**Important Note for PostgreSQL 15+**:
Starting with PostgreSQL 15, the default `public` schema permissions were changed for security. The deployment automatically grants the necessary schema privileges to the application database user. No manual intervention required.

## Deployment Files

```
deployment/
├── deploy.yml                      # Main Ansible playbook
├── inventory.ini                   # Server connection details
├── vars.yml                        # Configuration variables
├── README.md                       # This file (main deployment guide)
├── SSL_SETUP.md                    # SSL certificate setup guide
├── PYTHON_VENV.md                  # Python virtual environment guide
├── CHANGELOG.md                    # Version history and changes
└── templates/                      # Configuration templates
    ├── nginx_saletide.conf.j2      # Nginx HTTPS configuration
    ├── nginx_saletide_http.conf.j2 # Nginx HTTP configuration (for SSL validation)
    ├── gunicorn_config.py.j2       # Gunicorn settings
    ├── saletide.service.j2         # Django systemd service
    ├── saletide-celery.service.j2  # Celery worker service
    ├── saletide-celery-beat.service.j2  # Celery beat service
    ├── ecosystem.config.js.j2      # PM2 configuration
    └── .env.production.j2          # Django environment variables
```

## Python Virtual Environment

The deployment creates an isolated Python virtual environment at `/var/www/saletide/backend/venv/` for the Django application. This ensures:

- **Isolation**: Application dependencies don't conflict with system packages
- **Security**: Follows Python best practices for externally-managed environments
- **Compatibility**: Works with modern Python 3.12+ systems that prevent system-wide pip installs

**Key installations:**
- System-level: `python3-psycopg2` (for Ansible PostgreSQL modules)
- Virtual environment: `psycopg2-binary`, `gunicorn`, and all application dependencies from `requirements.txt`

**Main dependencies in requirements.txt:**
- Django 4.2.24
- Django REST Framework 3.16.1
- Celery 5.5.3 & Redis 6.4.0
- PostgreSQL adapter (psycopg2-binary 2.9.10)
- Gunicorn 23.0.0
- ReportLab 4.2.5 (PDF generation)
- PyJWT 2.10.1 (JWT authentication)
- python-decouple 3.8 (environment configuration)
- Authentication, CORS, filtering, and API documentation packages

**Environment Variable Loading:**

All Django management commands (migrations, collectstatic, etc.) are run with environment variables loaded from `/var/www/saletide/backend/.env` using bash:

```bash
#!/bin/bash
cd /var/www/saletide/backend
source venv/bin/activate
set -a              # Auto-export all variables
source .env         # Load variables from .env
set +a              # Stop auto-export
python manage.py migrate
```

**Important:** We explicitly use `/bin/bash` because the `source` command is bash-specific and not available in `/bin/sh` (which Ansible uses by default). This ensures Django has access to database credentials, secret keys, and other configuration.

**Environment Variables in .env:**
- `SECRET_KEY` - Django secret key (auto-generated, 50 chars)
- `DEBUG` - Debug mode (False in production)
- `ALLOWED_HOSTS` - Comma-separated list of allowed hosts
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` - Database connection details
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_LIFETIME`, `JWT_REFRESH_TOKEN_LIFETIME` - JWT auth settings
- `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` - Redis and Celery settings
- `EMAIL_*` - Email/SMTP configuration (needs manual update)
- Security settings (SSL redirect, CORS, etc.)

**📖 For detailed information about the virtual environment setup, troubleshooting, and best practices, see [PYTHON_VENV.md](PYTHON_VENV.md)**

## Quick Start

### 1. Review Configuration

Check and update `vars.yml` if needed:
- Domain name: `saletide.destrotechs.org`
- Database credentials
- Application settings

### 2. Test Connection

```bash
cd deployment
ansible all -i inventory.ini -m ping
```

Expected output:
```
saletide_prod | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
```

### 3. Run Deployment

```bash
ansible-playbook -i inventory.ini deploy.yml
```

The deployment will:
1. ✅ Install system dependencies (certbot, python3-psycopg2, rsync, etc.)
2. ✅ Create application user and directories (including logs, media, staticfiles)
3. ✅ Create PostgreSQL database and user
4. ✅ Grant comprehensive database and schema privileges (PostgreSQL 15+ compatible)
5. ✅ Clone repository from GitHub
6. ✅ Copy backend files (excluding frontend, git, pycache)
7. ✅ Copy frontend files (excluding node_modules, .next)
8. ✅ Setup Python virtual environment for backend
9. ✅ Install psycopg2-binary and gunicorn in virtual environment
10. ✅ Install Python dependencies from requirements.txt
11. ✅ Create production .env file with all required variables
12. ✅ Run database migrations
13. ✅ Create superuser
14. ✅ Collect static files
15. ✅ Load initial data (chart of accounts, services)
16. ✅ Setup and start systemd services (Django + Celery)
17. ✅ Deploy and build frontend
18. ✅ Start frontend with PM2
19. ✅ Configure Nginx (HTTP first, then HTTPS)
20. ✅ Generate Let's Encrypt SSL certificate automatically
21. ✅ Setup automatic SSL certificate renewal

## Post-Deployment Steps

### 1. Configure DNS

**IMPORTANT**: Before running deployment, ensure DNS is configured:

Point your domain to the server:
```
Type: A
Name: saletide.destrotechs.org
Value: 158.220.124.84
TTL: 3600
```

Wait 5-10 minutes for DNS propagation before deploying. You can verify with:
```bash
nslookup saletide.destrotechs.org
# or
dig saletide.destrotechs.org
```

### 2. SSL Certificate (Automatic)

The deployment automatically:
- ✅ Generates Let's Encrypt SSL certificate using certbot
- ✅ Configures Nginx with SSL/HTTPS
- ✅ Sets up automatic certificate renewal (daily at 3 AM)

**No manual SSL configuration needed!**

If SSL generation fails during deployment (usually due to DNS not propagating):
1. Wait for DNS to fully propagate
2. Re-run the deployment playbook - it will automatically detect and configure SSL

To manually check/renew SSL certificate:
```bash
ssh root@158.220.124.84

# Check certificate status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal (if needed)
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### 3. Update Email Configuration

Edit the environment file:
```bash
sudo nano /var/www/saletide/backend/.env
```

Update email settings:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

Restart Django:
```bash
sudo systemctl restart saletide
```

## Access Your Application

After deployment:

- **Frontend**: https://saletide.destrotechs.org
- **API**: https://saletide.destrotechs.org/api/
- **Admin Panel**: https://saletide.destrotechs.org/admin/

### Login Credentials

- **Email**: morrisdestro@gmail.com
- **Password**: !Not123!

**⚠️ Important**: Change the password immediately after first login!

## Service Management

### Check Service Status

```bash
# Django backend
sudo systemctl status saletide

# Celery worker
sudo systemctl status saletide-celery

# Celery beat
sudo systemctl status saletide-celery-beat

# Check if services are enabled
sudo systemctl is-enabled saletide
sudo systemctl is-enabled saletide-celery
sudo systemctl is-enabled saletide-celery-beat

# Frontend (PM2)
pm2 status
pm2 logs saletide-frontend
```

### Restart Services

```bash
# Restart Django
sudo systemctl restart saletide

# Restart Celery
sudo systemctl restart saletide-celery
sudo systemctl restart saletide-celery-beat

# Restart Frontend
pm2 restart saletide-frontend

# Restart Nginx
sudo systemctl restart nginx

# Restart all services at once
sudo systemctl restart saletide saletide-celery saletide-celery-beat
```

### View Logs

```bash
# Django/Gunicorn logs
sudo tail -f /var/log/saletide/gunicorn_error.log
sudo tail -f /var/log/saletide/gunicorn_access.log

# Celery logs
sudo tail -f /var/log/saletide/celery_worker.log
sudo tail -f /var/log/saletide/celery_beat.log

# PM2 logs
pm2 logs saletide-frontend

# Nginx logs
sudo tail -f /var/log/nginx/saletide_access.log
sudo tail -f /var/log/nginx/saletide_error.log
```

## Updating the Application

### Backend Update

```bash
cd /var/www/saletide/backend
sudo -u saletide git pull origin main
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart saletide
sudo systemctl restart saletide-celery
```

### Frontend Update

```bash
cd /var/www/saletide/frontend
sudo -u saletide git pull origin main
npm install
npm run build
pm2 restart saletide-frontend
```

## Troubleshooting

### Django Not Starting

```bash
# Check logs
sudo journalctl -u saletide -n 50 --no-pager

# Check socket file
ls -la /var/www/saletide/backend/saletide.sock

# Check gunicorn process
ps aux | grep gunicorn

# Check if .env file is loaded
sudo systemctl show saletide | grep EnvironmentFile

# Test Django manually
sudo su - saletide
cd /var/www/saletide/backend
source venv/bin/activate
set -a; source .env; set +a
gunicorn --bind unix:/var/www/saletide/backend/saletide.sock timax_backend.wsgi:application
```

### Systemd Service Timeout Issues

```bash
# Error: "start operation timed out. Terminating"
# Cause: Service takes too long to start

# Check service logs for details
sudo journalctl -xeu saletide-celery -n 100

# Check service type and timeout
sudo systemctl show saletide-celery | grep -E "Type|TimeoutStartSec"

# Service should have:
# Type=simple (for Celery)
# Type=notify (for Gunicorn)
# TimeoutStartSec=180 (or higher)

# Check if service actually started but systemd thinks it failed
ps aux | grep celery

# Reload systemd after making changes to service files
sudo systemctl daemon-reload
sudo systemctl restart saletide-celery

# View real-time service startup
sudo journalctl -u saletide-celery -f
```

### Frontend Not Loading

```bash
# Check PM2 status
pm2 status
pm2 logs saletide-frontend --lines 100

# Check port
netstat -tulpn | grep 3001
```

### Database Connection Issues

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test database connection
sudo -u postgres psql -d saletide_db -U saletide_user -h localhost

# Check database and user exist
sudo -u postgres psql -c "\l" | grep saletide
sudo -u postgres psql -c "\du" | grep saletide

# Check user privileges on database
sudo -u postgres psql -d saletide_db -c "\dp"

# Check schema permissions (PostgreSQL 15+)
sudo -u postgres psql -d saletide_db -c "\dn+"
```

### PostgreSQL Permission Issues

```bash
# Error: permission denied for schema public
# Cause: PostgreSQL 15+ restricts default public schema permissions

# Solution: Grant schema and object privileges
sudo -u postgres psql -d saletide_db <<EOF
-- Grant schema privileges
GRANT USAGE, CREATE ON SCHEMA public TO saletide_user;

-- Grant privileges on existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO saletide_user;

-- Grant privileges on existing sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO saletide_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO saletide_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO saletide_user;
EOF

# Verify permissions
sudo -u postgres psql -d saletide_db -c "\dn+"
sudo -u postgres psql -d saletide_db -c "SELECT has_schema_privilege('saletide_user', 'public', 'CREATE');"

# Test Django migrations after fixing
sudo su - saletide
cd /var/www/saletide/backend
source venv/bin/activate
set -a; source .env; set +a
python manage.py migrate
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues

```bash
# Check if certificate exists
sudo ls -la /etc/letsencrypt/live/saletide.destrotechs.org/

# View certificate details
sudo certbot certificates

# Check certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Verify DNS is pointing to server
nslookup saletide.destrotechs.org
dig saletide.destrotechs.org

# Test certificate renewal
sudo certbot renew --dry-run

# If certificate generation failed, try manual generation:
sudo certbot certonly --webroot -w /var/www/certbot -d saletide.destrotechs.org --email morrisdestro@gmail.com --agree-tos

# After successful certificate generation, reload nginx
sudo systemctl reload nginx
```

### Python/Pip Issues

```bash
# Check virtual environment
ls -la /var/www/saletide/backend/venv/

# Activate virtual environment manually
sudo su - saletide
cd /var/www/saletide/backend
source venv/bin/activate

# Check installed packages in venv
pip list

# Check for specific package
pip show reportlab
pip show gunicorn
pip show Django

# Load environment variables and test Django
set -a
source .env
set +a
python manage.py check

# Reinstall dependencies if needed
pip install -r requirements.txt
pip install psycopg2-binary gunicorn reportlab

# Check Python version
python --version

# Deactivate virtual environment
deactivate
```

### Missing Python Module Errors

```bash
# Error: ModuleNotFoundError: No module named 'reportlab' (or other modules)
# Cause: Package not installed in virtual environment

# Solution 1: Install missing package
sudo su - saletide
cd /var/www/saletide/backend
source venv/bin/activate
pip install reportlab  # or the specific missing package

# Solution 2: Reinstall all requirements
pip install -r requirements.txt --upgrade

# Solution 3: Check if package is in requirements.txt
grep reportlab requirements.txt

# Solution 4: Clear pip cache and reinstall
pip cache purge
pip install -r requirements.txt --no-cache-dir

# Verify installation
python -c "import reportlab; print(reportlab.__version__)"
python -c "import gunicorn; print(gunicorn.__version__)"

# Restart Django service after fixing
exit  # Exit from saletide user
sudo systemctl restart saletide
```

### Environment Variable Issues

```bash
# Check if .env file exists
ls -la /var/www/saletide/backend/.env

# View .env file contents (be careful with sensitive data)
sudo cat /var/www/saletide/backend/.env

# Check for syntax errors in .env file
sudo su - saletide
cd /var/www/saletide/backend
bash -c "set -a; source .env; set +a; echo 'No syntax errors'"

# Common .env syntax errors:
# - Unquoted values with special characters (wrap in quotes)
# - Unclosed quotes
# - Missing equals sign
# - Spaces around equals sign (remove them)

# Check .env file permissions (should be 0600)
ls -la /var/www/saletide/backend/.env

# Fix permissions if needed
sudo chown saletide:saletide /var/www/saletide/backend/.env
sudo chmod 600 /var/www/saletide/backend/.env

# Test loading environment variables (use bash, not sh!)
sudo su - saletide
cd /var/www/saletide/backend
bash  # Ensure you're in bash
set -a
source .env
set +a
echo "DB_NAME: $DB_NAME"
echo "DB_PASSWORD: ${DB_PASSWORD:0:3}***"  # Show first 3 chars only
echo "SECRET_KEY length: ${#SECRET_KEY}"

# Verify all required variables are set
echo "Required variables:"
echo "DB_NAME=$DB_NAME"
echo "DB_USER=$DB_USER"
echo "DB_HOST=$DB_HOST"
echo "SECRET_KEY length: ${#SECRET_KEY}"
echo "JWT_SECRET_KEY length: ${#JWT_SECRET_KEY}"

# Run Django check with environment loaded
source venv/bin/activate
python manage.py check
```

### Shell Command Issues ("source: not found")

```bash
# Error: /bin/sh: source: not found
# Cause: Ansible using /bin/sh instead of /bin/bash

# Solution 1: Verify bash is available
which bash
ls -la /bin/bash

# Solution 2: Use bash explicitly when running commands manually
bash -c "source venv/bin/activate && python manage.py check"

# Solution 3: In Ansible playbooks, ensure shell tasks specify:
# args:
#   executable: /bin/bash
```

### Django Logging Issues

```bash
# Error: FileNotFoundError: [Errno 2] No such file or directory: '.../logs/timax.log'
# Cause: Django logs directory doesn't exist

# Solution: Create the logs directory
sudo mkdir -p /var/www/saletide/backend/logs
sudo chown saletide:saletide /var/www/saletide/backend/logs
sudo chmod 755 /var/www/saletide/backend/logs

# Verify directory exists
ls -la /var/www/saletide/backend/logs

# Check Django logging configuration
sudo su - saletide
cd /var/www/saletide/backend
source venv/bin/activate
set -a; source .env; set +a
python manage.py check

# View Django logs
tail -f /var/www/saletide/backend/logs/timax.log
```

### File Copying/Rsync Issues

```bash
# Check if rsync is installed
which rsync
rsync --version

# Install rsync if missing
sudo apt update
sudo apt install rsync

# Manually copy files if needed
sudo su - saletide

# Copy backend files
rsync -av --exclude='timax-frontend' --exclude='.git' \
  /var/www/saletide/repo/ /var/www/saletide/backend/

# Copy frontend files
rsync -av --exclude='node_modules' --exclude='.next' \
  /var/www/saletide/repo/timax-frontend/ /var/www/saletide/frontend/
```

## Security Recommendations

1. **Change default passwords** immediately after deployment
2. **Setup firewall** (UFW):
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

3. **Setup fail2ban** for SSH protection:
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

4. **Regular backups** of database:
```bash
# Create backup script
sudo nano /usr/local/bin/backup-saletide.sh
```

5. **Monitor disk space** and logs

6. **SSL Certificate Auto-Renewal**: Already configured! Certbot runs daily at 3 AM to check and renew certificates automatically. You can verify the cron job:
```bash
sudo crontab -l | grep certbot
```

## Rollback Procedure

If something goes wrong:

```bash
# Stop services
sudo systemctl stop saletide
sudo systemctl stop saletide-celery
pm2 stop saletide-frontend

# Restore database from backup
sudo -u postgres psql -d saletide_db < /path/to/backup.sql

# Checkout previous version
cd /var/www/saletide/backend
git checkout <previous-commit-hash>

# Restart services
sudo systemctl start saletide
sudo systemctl start saletide-celery
pm2 start saletide-frontend
```

## Support

For issues or questions:
- Check logs first
- Review Django admin logs
- Contact: morrisdestro@gmail.com

## Directory Structure on Server

```
/var/www/saletide/
├── backend/                    # Django application
│   ├── venv/                  # Python virtual environment
│   ├── logs/                  # Django application logs
│   ├── staticfiles/           # Collected static files
│   ├── media/                 # Uploaded media files
│   ├── .env                   # Environment variables
│   ├── manage.py              # Django management script
│   ├── requirements.txt       # Python dependencies
│   └── saletide.sock          # Gunicorn socket (created at runtime)
├── frontend/                   # Next.js application
│   ├── .next/                 # Built files
│   ├── node_modules/          # Node dependencies
│   └── ecosystem.config.js    # PM2 config
└── repo/                      # Git repository clone

/var/log/saletide/             # System logs (Gunicorn, Celery, PM2)
│   ├── gunicorn_access.log
│   ├── gunicorn_error.log
│   ├── celery_worker.log
│   ├── celery_beat.log
│   └── pm2_*.log
/var/run/saletide/             # PID files
/etc/systemd/system/           # Systemd services
│   ├── saletide.service
│   ├── saletide-celery.service
│   └── saletide-celery-beat.service
/etc/nginx/sites-available/    # Nginx config
│   └── saletide
```

## Automated Deployment Script

Create an update script for easier deployments:

```bash
sudo nano /usr/local/bin/update-saletide.sh
```

Add:
```bash
#!/bin/bash
cd /root/saletide-deployment
ansible-playbook -i inventory.ini deploy.yml
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/update-saletide.sh
```

Use:
```bash
update-saletide.sh
```

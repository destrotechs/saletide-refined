# Python Virtual Environment Setup

This document explains how the deployment handles Python dependencies and virtual environments.

## Problem: Externally-Managed Python Environments

Modern Python systems (Python 3.11+, especially on Debian/Ubuntu 23.04+) enforce PEP 668, which prevents system-wide pip installations to avoid conflicts with system packages. Attempting to run `pip install` system-wide will result in this error:

```
error: externally-managed-environment

× This environment is externally managed
╰─> To install Python packages system-wide, try apt install
    python3-xyz, where xyz is the package you are trying to
    install.
```

## Solution: Dual-Layer Approach

Our deployment uses a dual-layer approach to handle Python dependencies:

### Layer 1: System-Level Packages (via apt)

Installed system-wide for infrastructure tools like Ansible:

```yaml
- python3              # Python interpreter
- python3-pip          # Pip package manager
- python3-venv         # Virtual environment support
- python3-dev          # Python development headers
- python3-psycopg2     # PostgreSQL adapter (for Ansible)
- build-essential      # Compilation tools
- libpq-dev           # PostgreSQL C library
```

**Why `python3-psycopg2`?**
- Ansible's PostgreSQL modules require psycopg2 to be available system-wide
- Installing via apt avoids the externally-managed environment error
- This is only for Ansible's database management tasks

### Layer 2: Virtual Environment (via pip in venv)

All application dependencies are installed in an isolated virtual environment at `/var/www/saletide/backend/venv/`:

```yaml
- psycopg2-binary      # PostgreSQL adapter (for Django)
- gunicorn            # WSGI server
- All packages from requirements.txt (Django, Celery, etc.)
```

**Why a separate psycopg2-binary in venv?**
- Django needs psycopg2-binary in its runtime environment
- The system python3-psycopg2 is not accessible from the virtual environment
- psycopg2-binary includes compiled binaries for easier installation

## Deployment Flow

### 1. System Setup
```yaml
- name: Install system dependencies
  apt:
    name:
      - python3
      - python3-psycopg2  # For Ansible PostgreSQL modules
      - rsync  # For efficient file copying
      # ... other system packages
```

### 2. Virtual Environment Creation
```yaml
- name: Create Python virtual environment
  command: python3 -m venv /var/www/saletide/backend/venv
  become_user: saletide
```

### 3. Virtual Environment Package Installation
```yaml
- name: Install psycopg2-binary in virtual environment
  pip:
    name: psycopg2-binary
    virtualenv: /var/www/saletide/backend/venv
  become_user: saletide

- name: Install gunicorn in virtual environment
  pip:
    name: gunicorn
    virtualenv: /var/www/saletide/backend/venv
  become_user: saletide

- name: Install Python dependencies
  pip:
    requirements: /var/www/saletide/backend/requirements.txt
    virtualenv: /var/www/saletide/backend/venv
  become_user: saletide
```

## Virtual Environment Usage

### Systemd Services

All systemd services (Django, Celery) are configured to use the virtual environment:

```ini
[Service]
WorkingDirectory=/var/www/saletide/backend
Environment="PATH=/var/www/saletide/backend/venv/bin"
ExecStart=/var/www/saletide/backend/venv/bin/gunicorn ...
```

### Manual Operations

When running management commands manually, always activate the virtual environment and load environment variables:

```bash
# Switch to application user
sudo su - saletide

# Navigate to backend directory
cd /var/www/saletide/backend

# Activate virtual environment
source venv/bin/activate

# Load environment variables from .env file
set -a              # Auto-export all variables
source .env         # Load from .env file
set +a              # Stop auto-export

# Now you can run Django commands
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic

# Check installed packages
pip list

# Deactivate when done
deactivate
```

**Why `set -a; source .env; set +a`?**
- `set -a` tells bash to automatically export all variables that are set
- `source .env` reads and sets variables from the .env file
- `set +a` turns off automatic export
- This makes all variables from .env available to Django's python-decouple `config()` function

**Important:** These commands require bash! The `source` command is bash-specific and won't work in `/bin/sh`. Always ensure you're using bash when running these commands:
```bash
# Check your shell
echo $SHELL

# Switch to bash if needed
bash

# Or run commands directly with bash
bash -c "source venv/bin/activate && source .env && python manage.py migrate"
```

## Benefits

### 1. Isolation
- Application dependencies don't interfere with system packages
- Multiple Python applications can coexist on the same server
- Each app can use different versions of the same library

### 2. Security
- Follows Python security best practices (PEP 668)
- Prevents accidental system package corruption
- Limits blast radius of dependency issues

### 3. Portability
- Virtual environment can be easily backed up/restored
- Dependencies are version-locked in requirements.txt
- Easy to replicate environment on different servers

### 4. Maintenance
- Clear separation between system and application packages
- Easy to troubleshoot dependency issues
- Simple to upgrade or rollback dependencies

## Troubleshooting

### Check Virtual Environment Status

```bash
# List virtual environment directory
ls -la /var/www/saletide/backend/venv/

# Check which Python is being used
/var/www/saletide/backend/venv/bin/python --version

# List installed packages
/var/www/saletide/backend/venv/bin/pip list

# Check if psycopg2 is installed
/var/www/saletide/backend/venv/bin/pip show psycopg2-binary
```

### Recreate Virtual Environment

If the virtual environment becomes corrupted:

```bash
sudo su - saletide
cd /var/www/saletide/backend

# Remove old venv
rm -rf venv/

# Create new venv
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install psycopg2-binary gunicorn
pip install -r requirements.txt

# Restart services
exit  # Exit from saletide user
sudo systemctl restart saletide
sudo systemctl restart saletide-celery
```

### Test Database Connection

```bash
sudo su - saletide
cd /var/www/saletide/backend
source venv/bin/activate

# Test Django database connectivity
python manage.py check --database default

# Test psycopg2 directly
python -c "import psycopg2; print('psycopg2 installed:', psycopg2.__version__)"
```

## Common Errors

### Error: "No module named 'psycopg2'"

**Cause**: Django is trying to use psycopg2 but it's not installed in the virtual environment

**Solution**:
```bash
sudo su - saletide
cd /var/www/saletide/backend
source venv/bin/activate
pip install psycopg2-binary
sudo systemctl restart saletide
```

### Error: "externally-managed-environment"

**Cause**: Trying to install packages system-wide with pip

**Solution**: Always use the virtual environment:
```bash
# Wrong - will fail on modern systems
sudo pip install some-package

# Correct - use venv
sudo su - saletide
source /var/www/saletide/backend/venv/bin/activate
pip install some-package
```

### Error: "command not found: python"

**Cause**: Virtual environment not activated or PATH not set correctly

**Solution**:
```bash
# Use full path to venv python
/var/www/saletide/backend/venv/bin/python manage.py migrate

# Or activate venv first
source /var/www/saletide/backend/venv/bin/activate
python manage.py migrate
```

### Error: "config('DB_PASSWORD') - Undefined variable"

**Cause**: Environment variables from .env file not loaded

**Solution**:
```bash
# Load environment variables before running Django commands
cd /var/www/saletide/backend
source venv/bin/activate
set -a
source .env
set +a
python manage.py migrate

# Or check if .env file exists and has correct permissions
ls -la .env
cat .env | grep DB_PASSWORD

# Verify variables are loaded
echo $DB_PASSWORD
```

## Best Practices

1. **Always activate the venv** before running Django commands manually
2. **Never install packages system-wide** unless they're infrastructure tools
3. **Keep requirements.txt updated** with all dependencies and versions
4. **Test deployments** in a staging environment first
5. **Backup the venv** before major changes
6. **Monitor disk space** - virtual environments can grow large
7. **Use pip freeze** to lock dependency versions:
   ```bash
   source venv/bin/activate
   pip freeze > requirements.txt
   ```

## References

- [PEP 668: Marking Python base environments as externally managed](https://peps.python.org/pep-0668/)
- [Python venv documentation](https://docs.python.org/3/library/venv.html)
- [Django deployment checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [psycopg2 documentation](https://www.psycopg.org/docs/)

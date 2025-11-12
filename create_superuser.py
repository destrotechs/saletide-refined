#!/usr/bin/env python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'timax_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from authentication.models import UserRole

User = get_user_model()

# Create superuser if it doesn't exist
if not User.objects.filter(email='admin@timax.com').exists():
    user = User.objects.create_superuser(
        email='admin@timax.com',
        password='admin123',
        first_name='Admin',
        last_name='User',
        role=UserRole.ADMIN
    )
    print(f"Superuser created: {user.email}")
else:
    print("Superuser already exists")
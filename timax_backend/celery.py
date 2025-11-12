import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'timax_backend.settings')

app = Celery('timax_backend')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Periodic task schedule
app.conf.beat_schedule = {
    'monthly-depreciation': {
        'task': 'assets.tasks.calculate_monthly_depreciation',
        'schedule': crontab(hour=0, minute=0, day_of_month=1),  # Run on the 1st of each month
    },
    'update-asset-values': {
        'task': 'assets.tasks.update_asset_values',
        'schedule': crontab(hour=1, minute=0),  # Run daily at 1 AM
    },
}

app.conf.timezone = 'UTC'


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
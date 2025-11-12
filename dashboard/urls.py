from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from sales.models import Job, Customer, Payment
from decimal import Decimal

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats_view(request):
    # Get today's date
    today = timezone.now().date()

    # Job statistics
    total_jobs = Job.objects.count()
    jobs_today = Job.objects.filter(created_at__date=today).count()
    pending_jobs = Job.objects.filter(
        status__in=['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'QC']
    ).count()
    completed_jobs = Job.objects.filter(
        status__in=['COMPLETED', 'INVOICED', 'PAID', 'CLOSED']
    ).count()

    # Revenue statistics
    total_revenue_data = Job.objects.filter(
        status__in=['COMPLETED', 'INVOICED', 'PAID', 'CLOSED']
    ).aggregate(
        total=Sum('final_total')
    )
    total_revenue = float(total_revenue_data['total'] or 0)

    revenue_today_data = Job.objects.filter(
        created_at__date=today,
        status__in=['COMPLETED', 'INVOICED', 'PAID', 'CLOSED']
    ).aggregate(
        total=Sum('final_total')
    )
    revenue_today = float(revenue_today_data['total'] or 0)

    # Customer statistics
    total_customers = Customer.objects.count()
    active_customers = Customer.objects.filter(is_active=True).count()

    # Additional business metrics
    average_job_value = 0
    if completed_jobs > 0:
        avg_data = Job.objects.filter(
            status__in=['COMPLETED', 'INVOICED', 'PAID', 'CLOSED']
        ).aggregate(avg=Sum('final_total'))
        if avg_data['avg']:
            average_job_value = float(avg_data['avg']) / completed_jobs

    # Recent activity (last 7 days)
    last_week = timezone.now().date() - timedelta(days=7)
    jobs_this_week = Job.objects.filter(created_at__date__gte=last_week).count()

    # Payment statistics
    payments_today = Payment.objects.filter(
        created_at__date=today,
        status='COMPLETED'
    ).aggregate(total=Sum('amount'))
    payments_today_amount = float(payments_today['total'] or 0)

    stats = {
        'total_jobs': total_jobs,
        'jobs_today': jobs_today,
        'pending_jobs': pending_jobs,
        'completed_jobs': completed_jobs,
        'total_revenue': total_revenue,
        'revenue_today': revenue_today,
        'total_customers': total_customers,
        'active_customers': active_customers,
        'average_job_value': round(average_job_value, 2),
        'jobs_this_week': jobs_this_week,
        'payments_today': payments_today_amount,
    }
    return Response(stats)

urlpatterns = [
    path('stats/', dashboard_stats_view, name='dashboard-stats'),
]
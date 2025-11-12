from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q, F
from django.utils.dateparse import parse_date
from datetime import datetime, timedelta
from decimal import Decimal
from drf_spectacular.utils import extend_schema, OpenApiParameter

from sales.models import Job, Payment, Invoice, Receipt
from inventory.models import StockLedger
from authentication.permissions import IsManager


class AnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsManager]

    @extend_schema(
        summary="Get comprehensive analytics dashboard data",
        parameters=[
            OpenApiParameter(name='period', description='Time period: 7d, 30d, 90d, 1y', required=False, type=str),
            OpenApiParameter(name='start_date', description='Custom start date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='Custom end date (YYYY-MM-DD)', required=False, type=str),
        ],
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        period = request.query_params.get('period', '30d')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Calculate date range
        end_dt = datetime.now()
        if end_date:
            end_dt = parse_date(end_date)
            if end_dt:
                end_dt = datetime.combine(end_dt, datetime.max.time())

        if start_date:
            start_dt = parse_date(start_date)
            if start_dt:
                start_dt = datetime.combine(start_dt, datetime.min.time())
        else:
            if period == '7d':
                start_dt = end_dt - timedelta(days=7)
            elif period == '30d':
                start_dt = end_dt - timedelta(days=30)
            elif period == '90d':
                start_dt = end_dt - timedelta(days=90)
            elif period == '1y':
                start_dt = end_dt - timedelta(days=365)
            else:
                start_dt = end_dt - timedelta(days=30)

        # Previous period for comparison
        period_length = end_dt - start_dt
        prev_start = start_dt - period_length
        prev_end = start_dt

        # Current period data
        current_jobs = Job.objects.filter(created_at__range=[start_dt, end_dt])
        current_payments = Payment.objects.filter(created_at__range=[start_dt, end_dt], status='COMPLETED')
        current_invoices = Invoice.objects.filter(created_at__range=[start_dt, end_dt])

        # Previous period data for comparison
        prev_jobs = Job.objects.filter(created_at__range=[prev_start, prev_end])
        prev_payments = Payment.objects.filter(created_at__range=[prev_start, prev_end], status='COMPLETED')

        # Revenue calculations
        current_revenue = current_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        prev_revenue = prev_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        revenue_change = self._calculate_percentage_change(prev_revenue, current_revenue)

        # Job counts
        current_job_count = current_jobs.count()
        prev_job_count = prev_jobs.count()
        jobs_change = self._calculate_percentage_change(prev_job_count, current_job_count)

        # Average job value
        current_avg_job = current_jobs.filter(final_total__isnull=False).aggregate(
            avg=Avg('final_total'))['avg'] or Decimal('0')
        prev_avg_job = prev_jobs.filter(final_total__isnull=False).aggregate(
            avg=Avg('final_total'))['avg'] or Decimal('0')
        avg_job_change = self._calculate_percentage_change(prev_avg_job, current_avg_job)

        # Completion rate
        current_completed = current_jobs.filter(status__in=['COMPLETED', 'INVOICED', 'PAID', 'CLOSED']).count()
        prev_completed = prev_jobs.filter(status__in=['COMPLETED', 'INVOICED', 'PAID', 'CLOSED']).count()

        current_completion_rate = (current_completed / current_job_count * 100) if current_job_count > 0 else 0
        prev_completion_rate = (prev_completed / prev_job_count * 100) if prev_job_count > 0 else 0
        completion_change = current_completion_rate - prev_completion_rate

        return Response({
            'period': {
                'start': start_dt.isoformat(),
                'end': end_dt.isoformat(),
                'period': period
            },
            'kpis': {
                'revenue': {
                    'current': float(current_revenue),
                    'previous': float(prev_revenue),
                    'change': revenue_change,
                    'trend': 'up' if revenue_change > 0 else 'down' if revenue_change < 0 else 'stable'
                },
                'jobs': {
                    'current': current_job_count,
                    'previous': prev_job_count,
                    'change': jobs_change,
                    'trend': 'up' if jobs_change > 0 else 'down' if jobs_change < 0 else 'stable'
                },
                'average_job_value': {
                    'current': float(current_avg_job),
                    'previous': float(prev_avg_job),
                    'change': avg_job_change,
                    'trend': 'up' if avg_job_change > 0 else 'down' if avg_job_change < 0 else 'stable'
                },
                'completion_rate': {
                    'current': round(current_completion_rate, 1),
                    'previous': round(prev_completion_rate, 1),
                    'change': round(completion_change, 1),
                    'trend': 'up' if completion_change > 0 else 'down' if completion_change < 0 else 'stable'
                }
            }
        })

    @extend_schema(
        summary="Get sales chart data over time",
        parameters=[
            OpenApiParameter(name='period', description='Time period: 7d, 30d, 90d, 1y', required=False, type=str),
            OpenApiParameter(name='interval', description='Data interval: day, week, month', required=False, type=str),
            OpenApiParameter(name='date_type', description='Date type: creation, payment', required=False, type=str),
        ],
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def sales_chart(self, request):
        period = request.query_params.get('period', '30d')
        interval = request.query_params.get('interval', 'day')
        date_type = request.query_params.get('date_type', 'creation')

        # Calculate date range
        end_dt = datetime.now()
        if period == '7d':
            start_dt = end_dt - timedelta(days=7)
            interval = 'day'
        elif period == '30d':
            start_dt = end_dt - timedelta(days=30)
            interval = 'day'
        elif period == '90d':
            start_dt = end_dt - timedelta(days=90)
            interval = 'week' if interval == 'day' else interval
        elif period == '1y':
            start_dt = end_dt - timedelta(days=365)
            interval = 'month' if interval in ['day', 'week'] else interval
        else:
            start_dt = end_dt - timedelta(days=30)

        # Generate chart data based on interval
        chart_data = self._generate_time_series_data(start_dt, end_dt, interval, date_type)

        return Response({
            'period': period,
            'interval': interval,
            'date_type': date_type,
            'data': chart_data
        })

    @extend_schema(
        summary="Get business insights and trends",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def insights(self, request):
        # Get data for the last 30 days
        end_dt = datetime.now()
        start_dt = end_dt - timedelta(days=30)

        # Top services
        top_services = Job.objects.filter(
            created_at__range=[start_dt, end_dt],
            lines__isnull=False
        ).values(
            'lines__service_variant__service__name',
            'lines__service_variant__part__name'
        ).annotate(
            count=Count('lines'),
            revenue=Sum('lines__total_amount')
        ).order_by('-revenue')[:5]

        # Status distribution
        status_distribution = Job.objects.filter(
            created_at__range=[start_dt, end_dt]
        ).values('status').annotate(count=Count('id')).order_by('-count')

        # Monthly trends (last 6 months)
        monthly_start = end_dt - timedelta(days=180)
        monthly_trends = self._get_monthly_trends(monthly_start, end_dt)

        # Customer insights
        top_customers = Job.objects.filter(
            created_at__range=[start_dt, end_dt],
            customer__isnull=False
        ).values(
            'customer__name'
        ).annotate(
            jobs_count=Count('id'),
            total_spent=Sum('final_total')
        ).order_by('-total_spent')[:5]

        # Inventory movements
        inventory_movements = StockLedger.objects.filter(
            created_at__range=[start_dt, end_dt]
        ).values('transaction_type').annotate(
            count=Count('id'),
            total_quantity=Sum('quantity_change')
        ).order_by('-count')

        return Response({
            'top_services': list(top_services),
            'status_distribution': list(status_distribution),
            'monthly_trends': monthly_trends,
            'top_customers': list(top_customers),
            'inventory_movements': list(inventory_movements)
        })

    def _calculate_percentage_change(self, previous, current):
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    def _generate_time_series_data(self, start_dt, end_dt, interval, date_type='creation'):
        chart_data = []

        if interval == 'day':
            current = start_dt.date()
            while current <= end_dt.date():
                day_start = datetime.combine(current, datetime.min.time())
                day_end = datetime.combine(current, datetime.max.time())

                # Get daily metrics based on date type
                if date_type == 'payment':
                    daily_revenue = Payment.objects.filter(
                        created_at__range=[day_start, day_end],
                        status='COMPLETED'
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

                    daily_jobs = Payment.objects.filter(
                        created_at__range=[day_start, day_end],
                        status='COMPLETED'
                    ).values('job').distinct().count()
                else:  # creation
                    # For creation date type, get revenue from payments of jobs created on this day
                    daily_revenue = Payment.objects.filter(
                        job__created_at__range=[day_start, day_end],
                        status='COMPLETED'
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

                    daily_jobs = Job.objects.filter(
                        created_at__range=[day_start, day_end]
                    ).count()

                chart_data.append({
                    'date': current.isoformat(),
                    'revenue': float(daily_revenue),
                    'jobs': daily_jobs,
                    'label': current.strftime('%b %d')
                })

                current += timedelta(days=1)

        elif interval == 'week':
            current = start_dt.date()
            while current <= end_dt.date():
                week_end = min(current + timedelta(days=6), end_dt.date())
                week_start = datetime.combine(current, datetime.min.time())
                week_end_dt = datetime.combine(week_end, datetime.max.time())

                if date_type == 'payment':
                    weekly_revenue = Payment.objects.filter(
                        created_at__range=[week_start, week_end_dt],
                        status='COMPLETED'
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

                    weekly_jobs = Payment.objects.filter(
                        created_at__range=[week_start, week_end_dt],
                        status='COMPLETED'
                    ).values('job').distinct().count()
                else:  # creation
                    # For creation date type, get revenue from payments of jobs created in this week
                    weekly_revenue = Payment.objects.filter(
                        job__created_at__range=[week_start, week_end_dt],
                        status='COMPLETED'
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

                    weekly_jobs = Job.objects.filter(
                        created_at__range=[week_start, week_end_dt]
                    ).count()

                chart_data.append({
                    'date': current.isoformat(),
                    'revenue': float(weekly_revenue),
                    'jobs': weekly_jobs,
                    'label': f"Week of {current.strftime('%b %d')}"
                })

                current += timedelta(days=7)

        elif interval == 'month':
            current = start_dt.replace(day=1).date()
            while current <= end_dt.date():
                if current.month == 12:
                    next_month = current.replace(year=current.year + 1, month=1)
                else:
                    next_month = current.replace(month=current.month + 1)

                month_start = datetime.combine(current, datetime.min.time())
                month_end = datetime.combine(min(next_month - timedelta(days=1), end_dt.date()), datetime.max.time())

                if date_type == 'payment':
                    monthly_revenue = Payment.objects.filter(
                        created_at__range=[month_start, month_end],
                        status='COMPLETED'
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

                    monthly_jobs = Payment.objects.filter(
                        created_at__range=[month_start, month_end],
                        status='COMPLETED'
                    ).values('job').distinct().count()
                else:  # creation
                    # For creation date type, get revenue from payments of jobs created in this month
                    monthly_revenue = Payment.objects.filter(
                        job__created_at__range=[month_start, month_end],
                        status='COMPLETED'
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

                    monthly_jobs = Job.objects.filter(
                        created_at__range=[month_start, month_end]
                    ).count()

                chart_data.append({
                    'date': current.isoformat(),
                    'revenue': float(monthly_revenue),
                    'jobs': monthly_jobs,
                    'label': current.strftime('%B %Y')
                })

                current = next_month

        return chart_data

    def _get_monthly_trends(self, start_dt, end_dt):
        trends = []
        current = start_dt.replace(day=1).date()

        while current <= end_dt.date():
            if current.month == 12:
                next_month = current.replace(year=current.year + 1, month=1)
            else:
                next_month = current.replace(month=current.month + 1)

            month_start = datetime.combine(current, datetime.min.time())
            month_end = datetime.combine(min(next_month - timedelta(days=1), end_dt.date()), datetime.max.time())

            monthly_data = {
                'month': current.strftime('%B %Y'),
                'revenue': float(Payment.objects.filter(
                    created_at__range=[month_start, month_end],
                    status='COMPLETED'
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')),
                'jobs': Job.objects.filter(created_at__range=[month_start, month_end]).count(),
                'customers': Job.objects.filter(
                    created_at__range=[month_start, month_end]
                ).values('customer').distinct().count()
            }

            trends.append(monthly_data)
            current = next_month

        return trends
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Q, Count, Sum, F, Avg, Value, Case, When
from django.db.models.functions import Coalesce, Extract, TruncMonth, TruncDate
from django.http import HttpResponse
from decimal import Decimal
from datetime import datetime, timedelta, date
from django.utils import timezone
from io import BytesIO
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from authentication.permissions import IsManager, IsAdmin
from sales.models import Job, Customer, Payment, Commission, Tip, AdvancePayment
from inventory.models import PurchaseOrder, SKU, StockLedger
from services.models import Service, ServiceVariant
from expenses.models import Expense


class SalesReportViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsManager]

    @extend_schema(
        summary="Get sales summary report",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def sales_summary(self, request):
        # Date filtering
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).date()
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

        if not end_date:
            end_date = datetime.now().date()
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        # Base queryset for completed jobs
        jobs = Job.objects.filter(
            status='COMPLETED',
            completed_at__date__range=[start_date, end_date]
        )

        # Calculate metrics
        total_revenue = jobs.aggregate(total=Sum('final_amount'))['total'] or 0
        total_jobs = jobs.count()
        avg_job_value = jobs.aggregate(avg=Avg('final_amount'))['avg'] or 0

        # Top customers
        top_customers = Customer.objects.annotate(
            total_spent=Sum(
                'jobs__final_amount',
                filter=Q(
                    jobs__status='COMPLETED',
                    jobs__completed_at__date__range=[start_date, end_date]
                )
            ),
            job_count=Count(
                'jobs',
                filter=Q(
                    jobs__status='COMPLETED',
                    jobs__completed_at__date__range=[start_date, end_date]
                )
            )
        ).filter(total_spent__gt=0).order_by('-total_spent')[:10]

        # Daily sales trend
        daily_sales = jobs.extra(
            select={'day': 'date(completed_at)'}
        ).values('day').annotate(
            daily_revenue=Sum('final_amount'),
            daily_jobs=Count('id')
        ).order_by('day')

        # Top services
        top_services = Service.objects.annotate(
            revenue=Sum(
                'variants__jobline__final_price',
                filter=Q(
                    variants__jobline__job__status='COMPLETED',
                    variants__jobline__job__completed_at__date__range=[start_date, end_date]
                )
            ),
            job_count=Count(
                'variants__jobline',
                filter=Q(
                    variants__jobline__job__status='COMPLETED',
                    variants__jobline__job__completed_at__date__range=[start_date, end_date]
                )
            )
        ).filter(revenue__gt=0).order_by('-revenue')[:10]

        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'summary': {
                'total_revenue': total_revenue,
                'total_jobs': total_jobs,
                'average_job_value': avg_job_value,
                'revenue_growth': 0  # TODO: Calculate vs previous period
            },
            'top_customers': [
                {
                    'name': customer.name,
                    'total_spent': customer.total_spent,
                    'job_count': customer.job_count
                } for customer in top_customers
            ],
            'daily_sales': list(daily_sales),
            'top_services': [
                {
                    'name': service.name,
                    'revenue': service.revenue,
                    'job_count': service.job_count
                } for service in top_services
            ]
        })

    @extend_schema(
        summary="Get monthly sales trend",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def monthly_trend(self, request):
        # Last 12 months
        twelve_months_ago = datetime.now() - timedelta(days=365)

        monthly_data = Job.objects.filter(
            status='COMPLETED',
            completed_at__gte=twelve_months_ago
        ).annotate(
            month=TruncMonth('completed_at')
        ).values('month').annotate(
            revenue=Sum('final_amount'),
            job_count=Count('id'),
            avg_job_value=Avg('final_amount')
        ).order_by('month')

        return Response({
            'monthly_data': list(monthly_data)
        })

    @extend_schema(
        summary="Get service performance report",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def service_performance(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).date()
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

        if not end_date:
            end_date = datetime.now().date()
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        service_stats = ServiceVariant.objects.annotate(
            revenue=Sum(
                'jobline__final_price',
                filter=Q(
                    jobline__job__status='COMPLETED',
                    jobline__job__completed_at__date__range=[start_date, end_date]
                )
            ),
            quantity_sold=Sum(
                'jobline__quantity',
                filter=Q(
                    jobline__job__status='COMPLETED',
                    jobline__job__completed_at__date__range=[start_date, end_date]
                )
            ),
            job_count=Count(
                'jobline__job',
                filter=Q(
                    jobline__job__status='COMPLETED',
                    jobline__job__completed_at__date__range=[start_date, end_date]
                )
            )
        ).filter(revenue__gt=0).order_by('-revenue')

        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'service_performance': [
                {
                    'service_variant_id': sv.id,
                    'service_name': sv.service.name,
                    'part_name': sv.part.name if sv.part else None,
                    'vehicle_class': sv.vehicle_class.name,
                    'revenue': sv.revenue or 0,
                    'quantity_sold': sv.quantity_sold or 0,
                    'job_count': sv.job_count or 0,
                    'avg_price': (sv.revenue / sv.quantity_sold) if sv.quantity_sold else 0
                } for sv in service_stats
            ]
        })


class InventoryReportViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsManager]

    @extend_schema(
        summary="Get inventory summary report",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def inventory_summary(self, request):
        # Current stock levels
        stock_summary = StockLedger.objects.aggregate(
            total_items=Count('id'),
            total_value=Sum(F('current_stock') * F('sku__unit_cost')),
            low_stock_count=Count('id', filter=Q(current_stock__lte=F('sku__reorder_level'))),
            out_of_stock_count=Count('id', filter=Q(current_stock=0))
        )

        # Top value items
        top_value_items = StockLedger.objects.annotate(
            stock_value=F('current_stock') * F('sku__unit_cost')
        ).filter(current_stock__gt=0).order_by('-stock_value')[:10]

        # Recently added SKUs
        recent_skus = SKU.objects.filter(
            created_at__gte=datetime.now() - timedelta(days=30)
        ).count()

        # TODO: Movement statistics would require StockMovement model
        movement_stats = {
            'total_movements': 0,
            'inbound_movements': 0,
            'outbound_movements': 0,
            'adjustment_movements': 0
        }

        return Response({
            'stock_summary': stock_summary,
            'top_value_items': [
                {
                    'sku_code': item.sku.sku_code,
                    'sku_name': item.sku.name,
                    'current_stock': item.current_stock,
                    'unit_cost': item.sku.unit_cost,
                    'stock_value': item.stock_value
                } for item in top_value_items
            ],
            'recent_skus_added': recent_skus,
            'movement_statistics': movement_stats
        })

    @extend_schema(
        summary="Get stock valuation report",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def stock_valuation(self, request):
        # Stock valuation by category
        valuation_by_type = SKU.objects.values('sku_type').annotate(
            total_items=Count('stockledger'),
            total_stock=Sum('stockledger__current_stock'),
            total_value=Sum(F('stockledger__current_stock') * F('unit_cost'))
        )

        # Stock valuation by supplier
        valuation_by_supplier = StockLedger.objects.values(
            'sku__supplier__name'
        ).annotate(
            total_items=Count('id'),
            total_stock=Sum('current_stock'),
            total_value=Sum(F('current_stock') * F('sku__unit_cost'))
        ).filter(total_value__gt=0).order_by('-total_value')

        # ABC Analysis (based on value)
        all_items = StockLedger.objects.annotate(
            stock_value=F('current_stock') * F('sku__unit_cost')
        ).filter(current_stock__gt=0).order_by('-stock_value')

        total_value = all_items.aggregate(total=Sum('stock_value'))['total'] or 0
        cumulative_percentage = 0
        abc_analysis = {'A': 0, 'B': 0, 'C': 0}

        for item in all_items:
            percentage = (item.stock_value / total_value * 100) if total_value > 0 else 0
            cumulative_percentage += percentage

            if cumulative_percentage <= 80:
                abc_analysis['A'] += 1
            elif cumulative_percentage <= 95:
                abc_analysis['B'] += 1
            else:
                abc_analysis['C'] += 1

        return Response({
            'valuation_by_type': list(valuation_by_type),
            'valuation_by_supplier': list(valuation_by_supplier),
            'abc_analysis': abc_analysis,
            'total_inventory_value': total_value
        })



class ProfitabilityReportViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsManager]

    @extend_schema(
        summary="Get profitability analysis",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def profitability_analysis(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).date()
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

        if not end_date:
            end_date = datetime.now().date()
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        # Revenue and cost analysis
        completed_jobs = Job.objects.filter(
            status='COMPLETED',
            completed_at__date__range=[start_date, end_date]
        )

        total_revenue = completed_jobs.aggregate(
            revenue=Sum('final_amount')
        )['revenue'] or 0

        # Calculate costs from inventory consumption
        # This would need BOM data to be accurate
        estimated_costs = completed_jobs.count() * 50  # Placeholder

        gross_profit = total_revenue - estimated_costs
        profit_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0

        # Service profitability
        service_profitability = ServiceVariant.objects.annotate(
            revenue=Sum(
                'jobline__final_price',
                filter=Q(
                    jobline__job__status='COMPLETED',
                    jobline__job__completed_at__date__range=[start_date, end_date]
                )
            ),
            quantity_sold=Sum(
                'jobline__quantity',
                filter=Q(
                    jobline__job__status='COMPLETED',
                    jobline__job__completed_at__date__range=[start_date, end_date]
                )
            )
        ).filter(revenue__gt=0).order_by('-revenue')[:10]

        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'financial_summary': {
                'total_revenue': total_revenue,
                'estimated_costs': estimated_costs,
                'gross_profit': gross_profit,
                'profit_margin': profit_margin
            },
            'top_profitable_services': [
                {
                    'service_name': sv.service.name,
                    'part_name': sv.part.name if sv.part else None,
                    'revenue': sv.revenue,
                    'quantity_sold': sv.quantity_sold,
                    'avg_price': (sv.revenue / sv.quantity_sold) if sv.quantity_sold else 0
                } for sv in service_profitability
            ]
        })

    @extend_schema(
        summary="Get customer profitability analysis",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def customer_profitability(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).date()
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

        if not end_date:
            end_date = datetime.now().date()
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        customer_analysis = Customer.objects.annotate(
            total_revenue=Sum(
                'jobs__final_amount',
                filter=Q(
                    jobs__status='COMPLETED',
                    jobs__completed_at__date__range=[start_date, end_date]
                )
            ),
            job_count=Count(
                'jobs',
                filter=Q(
                    jobs__status='COMPLETED',
                    jobs__completed_at__date__range=[start_date, end_date]
                )
            ),
            avg_job_value=Avg(
                'jobs__final_amount',
                filter=Q(
                    jobs__status='COMPLETED',
                    jobs__completed_at__date__range=[start_date, end_date]
                )
            )
        ).filter(total_revenue__gt=0).order_by('-total_revenue')

        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'customer_analysis': [
                {
                    'customer_name': customer.name,
                    'total_revenue': customer.total_revenue,
                    'job_count': customer.job_count,
                    'avg_job_value': customer.avg_job_value or 0,
                    'customer_type': customer.customer_type
                } for customer in customer_analysis
            ]
        })


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsManager]

    @extend_schema(
        summary="Get dashboard overview",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def overview(self, request):
        today = datetime.now().date()
        thirty_days_ago = today - timedelta(days=30)

        # Sales metrics
        sales_metrics = {
            'today_revenue': Job.objects.filter(
                status='COMPLETED',
                completed_at__date=today
            ).aggregate(total=Sum('final_amount'))['total'] or 0,

            'month_revenue': Job.objects.filter(
                status='COMPLETED',
                completed_at__date__gte=thirty_days_ago
            ).aggregate(total=Sum('final_amount'))['total'] or 0,

            'active_jobs': Job.objects.filter(
                status__in=['SCHEDULED', 'IN_PROGRESS']
            ).count(),

            'completed_jobs_today': Job.objects.filter(
                status='COMPLETED',
                completed_at__date=today
            ).count()
        }

        # Inventory alerts
        inventory_alerts = {
            'low_stock_items': StockLedger.objects.filter(
                current_stock__lte=F('sku__reorder_level')
            ).count(),

            'out_of_stock_items': StockLedger.objects.filter(
                current_stock=0
            ).count(),

            'pending_pos': PurchaseOrder.objects.filter(
                status='PENDING'
            ).count()
        }

        # Quick stats
        quick_stats = {
            'total_customers': Customer.objects.filter(is_active=True).count(),
            'total_vehicles': Customer.objects.aggregate(
                total=Count('vehicles')
            )['total'] or 0,
            'pending_payments': Payment.objects.filter(
                payment_status='PENDING'
            ).count()
        }

        return Response({
            'sales_metrics': sales_metrics,
            'inventory_alerts': inventory_alerts,
            'quick_stats': quick_stats,
            'last_updated': timezone.now()
        })


class FinancialReportViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsManager]

    @extend_schema(
        summary="Generate Financial Report PDF",
        parameters=[
            OpenApiParameter(name='start_date', type=str, description='Start date (YYYY-MM-DD)'),
            OpenApiParameter(name='end_date', type=str, description='End date (YYYY-MM-DD)'),
        ],
        responses={200: {'type': 'string', 'format': 'binary'}}
    )
    @action(detail=False, methods=['get'])
    def generate_pdf(self, request):
        # Get date parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date or not end_date:
            # Default to today
            start_date = datetime.now().date()
            end_date = datetime.now().date()
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        # Fetch financial data
        # Revenue from analytics/jobs
        completed_jobs = Job.objects.filter(
            status__in=['PAID', 'COMPLETED'],
            updated_at__date__range=[start_date, end_date]
        )
        total_revenue = completed_jobs.aggregate(total=Sum('final_total'))['total'] or Decimal('0')

        # Expenses
        expenses = Expense.objects.filter(
            expense_date__range=[start_date, end_date]
        )
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        # Note: Expense categories are stored as ExpenseCategory objects, not string choices
        # We'll just show total expenses for now without breaking them down by type
        operating_expenses = Decimal('0')
        administrative_expenses = Decimal('0')

        # Commissions
        commissions = Commission.objects.filter(
            status='PAID',
            paid_at__date__range=[start_date, end_date]
        )
        total_commissions = commissions.aggregate(total=Sum('commission_amount'))['total'] or Decimal('0')

        # Tips
        tips = Tip.objects.filter(
            status='PAID',
            paid_at__date__range=[start_date, end_date]
        )
        total_tips = tips.aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Advances
        advances = AdvancePayment.objects.filter(
            status='PAID',
            paid_at__date__range=[start_date, end_date]
        )
        total_advances = advances.aggregate(total=Sum('approved_amount'))['total'] or Decimal('0')

        # Calculations
        net_revenue = total_revenue - total_expenses
        total_employee_compensation = total_commissions + total_tips
        net_profit = net_revenue - total_employee_compensation

        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                rightMargin=72, leftMargin=72,
                                topMargin=72, bottomMargin=18)

        # Container for the 'Flowable' objects
        elements = []

        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1F2937'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        subtitle_style = ParagraphStyle(
            'CustomSubTitle',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#4B5563'),
            spaceAfter=20,
            alignment=TA_CENTER
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1F2937'),
            spaceAfter=12,
            fontName='Helvetica-Bold'
        )

        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#4B5563'),
            alignment=TA_CENTER
        )

        # Title
        elements.append(Paragraph("SaleTide", title_style))
        elements.append(Paragraph("Financial Report", subtitle_style))

        # Period info
        period_text = f"Period: {start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}"
        elements.append(Paragraph(period_text, normal_style))
        generated_text = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
        elements.append(Paragraph(generated_text, normal_style))
        elements.append(Spacer(1, 20))

        # Summary Table
        summary_data = [
            ['Description', 'Amount (KES)'],
            ['Total Revenue', f'{total_revenue:,.2f}'],
            ['Less: Total Expenses', f'({total_expenses:,.2f})'],
            ['Net Revenue', f'{net_revenue:,.2f}'],
            ['Less: Employee Compensation', ''],
            ['  Commissions Paid', f'({total_commissions:,.2f})'],
            ['  Tips Paid', f'({total_tips:,.2f})'],
            ['NET PROFIT / (LOSS)', f'{net_profit:,.2f}'],
            ['', ''],
            ['Reference: Advances Given', f'{total_advances:,.2f}'],
        ]

        summary_table = Table(summary_data, colWidths=[4*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),

            # Revenue row
            ('FONTNAME', (0, 1), (0, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, 1), 10),

            # Expenses row
            ('FONTSIZE', (0, 2), (-1, 2), 10),

            # Net Revenue row
            ('LINEABOVE', (0, 3), (-1, 3), 1, colors.black),
            ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 3), (-1, 3), 10),

            # Employee compensation section header
            ('FONTNAME', (0, 4), (0, 4), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 4), (-1, 4), 10),

            # Employee compensation items (indented)
            ('LEFTPADDING', (0, 5), (0, 6), 30),
            ('FONTSIZE', (0, 5), (-1, 6), 9),

            # Net Profit row
            ('LINEABOVE', (0, 7), (-1, 7), 2, colors.black),
            ('LINEBELOW', (0, 7), (-1, 7), 2, colors.black),
            ('FONTNAME', (0, 7), (-1, 7), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 7), (-1, 7), 12),
            ('TOPPADDING', (0, 7), (-1, 7), 10),
            ('BOTTOMPADDING', (0, 7), (-1, 7), 10),

            # Empty row for spacing
            ('LINEBELOW', (0, 8), (-1, 8), 0, colors.white),
            ('FONTSIZE', (0, 8), (-1, 8), 6),

            # Advances reference (subtle)
            ('BACKGROUND', (0, 9), (-1, 9), colors.HexColor('#F5F5F5')),
            ('TEXTCOLOR', (0, 9), (-1, 9), colors.HexColor('#666666')),
            ('FONTSIZE', (0, 9), (-1, 9), 8),
            ('FONTNAME', (0, 9), (0, 9), 'Helvetica-Oblique'),

            # General styling
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))

        elements.append(summary_table)
        elements.append(Spacer(1, 30))

        # Employee Compensation Breakdown
        elements.append(Paragraph("Employee Compensation Breakdown", heading_style))
        compensation_data = [
            ['Type', 'Count', 'Amount (KES)'],
            ['Commissions', str(commissions.count()), f'{total_commissions:,.2f}'],
            ['Tips', str(tips.count()), f'{total_tips:,.2f}'],
            ['Advances (Reference)', str(advances.count()), f'{total_advances:,.2f}'],
            ['Total Compensation', '', f'{total_employee_compensation:,.2f}'],
        ]

        compensation_table = Table(compensation_data, colWidths=[2.5*inch, 1.5*inch, 2*inch])
        compensation_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),

            # Data rows
            ('FONTSIZE', (0, 1), (-1, 3), 9),

            # Total row
            ('LINEABOVE', (0, 4), (-1, 4), 1, colors.black),
            ('FONTNAME', (0, 4), (-1, 4), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 4), (-1, 4), 10),

            # Alignment
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))

        elements.append(compensation_table)
        elements.append(Spacer(1, 40))

        # Footer
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#6B7280'),
            alignment=TA_CENTER
        )
        elements.append(Paragraph("SaleTide", footer_style))
        elements.append(Paragraph("Confidential Financial Report", footer_style))
        elements.append(Paragraph("This report is generated electronically and is valid without signature", footer_style))

        # Build PDF
        doc.build(elements)

        # FileResponse sets the Content-Disposition header so that browsers
        # present the option to save the file.
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="financial_report_{start_date}_{end_date}.pdf"'

        return response

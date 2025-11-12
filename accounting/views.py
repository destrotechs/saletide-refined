from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Sum, Count, Q, F
from decimal import Decimal
from datetime import datetime, timedelta
from dateutil.parser import parse

from .models import AccountCategory, Account, JournalEntry, JournalEntryLine, FinancialPeriod, Budget
from .serializers import (
    AccountCategorySerializer, AccountSerializer, JournalEntrySerializer,
    JournalEntryLineSerializer, FinancialPeriodSerializer, BudgetSerializer,
    FinancialSummarySerializer, PLStatementSerializer
)
from sales.models import Job, Payment, JobLine
from inventory.models import SKU, StockLedger
from authentication.permissions import IsManager


class AccountCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AccountCategory.objects.all()
    serializer_class = AccountCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['account_type', 'is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['code', 'name', 'created_at']
    ordering = ['code']


class AccountViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Account.objects.select_related('category', 'parent_account').all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['account_type', 'account_subtype', 'category', 'is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['code', 'name', 'balance', 'created_at']
    ordering = ['code']


class JournalEntryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JournalEntry.objects.select_related('created_by').prefetch_related('lines__account').all()
    serializer_class = JournalEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['created_by', 'date']
    search_fields = ['entry_number', 'description', 'reference']
    ordering_fields = ['date', 'entry_number', 'created_at']
    ordering = ['-date', '-created_at']


class FinancialReportsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsManager]

    @extend_schema(
        summary="Get financial summary",
        responses={200: FinancialSummarySerializer}
    )
    @action(detail=False, methods=['get'])
    def financial_summary(self, request):
        # Calculate totals by account type
        assets = Account.objects.filter(account_type='ASSET', is_active=True).aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0.00')

        liabilities = Account.objects.filter(account_type='LIABILITY', is_active=True).aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0.00')

        equity = Account.objects.filter(account_type='EQUITY', is_active=True).aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0.00')

        # Get specific account balances
        cash_accounts = Account.objects.filter(
            name__icontains='cash', account_type='ASSET', is_active=True
        ).aggregate(total=Sum('balance'))['total'] or Decimal('0.00')

        ar_accounts = Account.objects.filter(
            name__icontains='receivable', account_type='ASSET', is_active=True
        ).aggregate(total=Sum('balance'))['total'] or Decimal('0.00')

        ap_accounts = Account.objects.filter(
            name__icontains='payable', account_type='LIABILITY', is_active=True
        ).aggregate(total=Sum('balance'))['total'] or Decimal('0.00')

        # Calculate ratios
        current_assets = Account.objects.filter(
            account_type='ASSET', account_subtype='CURRENT_ASSET', is_active=True
        ).aggregate(total=Sum('balance'))['total'] or Decimal('0.00')

        current_liabilities = Account.objects.filter(
            account_type='LIABILITY', account_subtype='CURRENT_LIABILITY', is_active=True
        ).aggregate(total=Sum('balance'))['total'] or Decimal('0.00')

        working_capital = current_assets - current_liabilities
        quick_ratio = float(cash_accounts + ar_accounts) / float(current_liabilities) if current_liabilities > 0 else 0
        debt_to_equity = float(liabilities) / float(equity) if equity > 0 else 0

        summary = {
            'total_assets': assets,
            'total_liabilities': liabilities,
            'total_equity': equity,
            'cash_on_hand': cash_accounts,
            'accounts_receivable': ar_accounts,
            'accounts_payable': ap_accounts,
            'working_capital': working_capital,
            'quick_ratio': round(quick_ratio, 2),
            'debt_to_equity_ratio': round(debt_to_equity, 2),
        }

        serializer = FinancialSummarySerializer(summary)
        return Response(serializer.data)

    @extend_schema(
        summary="Get profit and loss statement",
        parameters=[
            OpenApiParameter('start_date', str, description='Start date (YYYY-MM-DD)'),
            OpenApiParameter('end_date', str, description='End date (YYYY-MM-DD)'),
        ],
        responses={200: PLStatementSerializer}
    )
    @action(detail=False, methods=['get'])
    def profit_loss(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Default to current year if no dates provided
        if not start_date:
            start_date = datetime.now().replace(month=1, day=1).date()
        else:
            start_date = parse(start_date).date()

        if not end_date:
            end_date = datetime.now().date()
        else:
            end_date = parse(end_date).date()

        # Get revenue from actual sales data
        jobs_in_period = Job.objects.filter(
            created_at__date__range=[start_date, end_date],
            status__in=['COMPLETED', 'INVOICED', 'PAID', 'CLOSED']
        )

        # Calculate total revenue from jobs
        total_revenue = jobs_in_period.aggregate(
            total=Sum('final_total')
        )['total'] or Decimal('0.00')

        # Calculate detailed revenue breakdown from job lines
        service_revenue = Decimal('0.00')
        parts_revenue = Decimal('0.00')
        labor_revenue = Decimal('0.00')

        for job in jobs_in_period:
            for line in job.lines.all():
                if hasattr(line, 'service') and line.service:
                    service_revenue += line.total_amount
                elif hasattr(line, 'inventory_items') and line.inventory_items.exists():
                    parts_revenue += line.total_amount
                else:
                    labor_revenue += line.total_amount

        # If no detailed breakdown available, use proportional split
        if service_revenue == 0 and parts_revenue == 0 and labor_revenue == 0:
            service_revenue = total_revenue * Decimal('0.60')  # 60% services
            parts_revenue = total_revenue * Decimal('0.30')   # 30% parts
            labor_revenue = total_revenue * Decimal('0.10')   # 10% labor

        # Calculate COGS from inventory data used in jobs
        cost_of_goods_sold = Decimal('0.00')
        for job in jobs_in_period:
            for line in job.lines.all():
                # Use the total_cost field which already calculates quantity_used * unit_cost
                line_inventory_cost = line.inventory_items.aggregate(
                    total=Sum('total_cost')
                )['total'] or Decimal('0.00')
                cost_of_goods_sold += line_inventory_cost

        # Get operating expenses (prorate for the period)
        days_in_period = (end_date - start_date).days + 1
        days_in_year = 365
        period_ratio = Decimal(str(days_in_period / days_in_year))

        expense_accounts = Account.objects.filter(
            account_type='EXPENSE',
            account_subtype='OPERATING_EXPENSE',
            is_active=True
        ).aggregate(total=Sum('balance'))['total'] or Decimal('0.00')
        operating_expenses = expense_accounts * period_ratio

        # Administrative expenses
        admin_expense_accounts = Account.objects.filter(
            account_type='EXPENSE',
            account_subtype='ADMINISTRATIVE_EXPENSE',
            is_active=True
        ).aggregate(total=Sum('balance'))['total'] or Decimal('0.00')
        admin_expenses = admin_expense_accounts * period_ratio

        total_expenses = cost_of_goods_sold + operating_expenses + admin_expenses

        # Calculate profit metrics
        gross_profit = total_revenue - cost_of_goods_sold
        net_income = total_revenue - total_expenses
        gross_margin = float(gross_profit) / float(total_revenue) * 100 if total_revenue > 0 else 0
        net_margin = float(net_income) / float(total_revenue) * 100 if total_revenue > 0 else 0

        pl_statement = {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'revenue': {
                'service_revenue': service_revenue,
                'parts_revenue': parts_revenue,
                'labor_revenue': labor_revenue,
                'total_revenue': total_revenue
            },
            'expenses': {
                'cost_of_goods_sold': cost_of_goods_sold,
                'operating_expenses': operating_expenses,
                'administrative_expenses': admin_expenses,
                'total_expenses': total_expenses
            },
            'gross_profit': gross_profit,
            'net_income': net_income,
            'gross_margin': round(gross_margin, 2),
            'net_margin': round(net_margin, 2)
        }

        serializer = PLStatementSerializer(pl_statement)
        return Response(serializer.data)

    @extend_schema(
        summary="Get chart of accounts grouped by category",
        responses={200: AccountCategorySerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def chart_of_accounts(self, request):
        categories = AccountCategory.objects.filter(is_active=True).prefetch_related(
            'accounts'
        ).order_by('code')

        serializer = AccountCategorySerializer(categories, many=True)
        return Response(serializer.data)

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.db import transaction
from datetime import datetime, timedelta
from decimal import Decimal

from .models import ExpenseCategory, Expense
from .serializers import (
    ExpenseCategorySerializer, ExpenseListSerializer,
    ExpenseDetailSerializer, ExpenseCreateSerializer, ExpenseUpdateSerializer
)
from authentication.permissions import IsAdmin, IsManager, IsSalesAgent
from accounting.models import JournalEntry, JournalEntryLine, Account


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing expense categories"""
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        """Only managers and admins can create/update/delete categories"""
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsSalesAgent()]
        return [permissions.IsAuthenticated(), IsManager()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            if not self.request.query_params.get('show_all'):
                queryset = queryset.filter(is_active=True)
        return queryset


class ExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing expenses"""
    queryset = Expense.objects.select_related(
        'category', 'recorded_by', 'job'
    ).all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'payment_method', 'recorded_by']
    search_fields = ['expense_number', 'description', 'reference_number']
    ordering_fields = ['expense_date', 'amount', 'created_at']
    ordering = ['-expense_date', '-created_at']

    def _create_expense_journal_entry(self, expense):
        """Create journal entry for paid expense"""
        try:
            from accounting.models import AccountCategory

            # Get account categories
            expense_category = AccountCategory.objects.get(code='5000')
            asset_category = AccountCategory.objects.get(code='1000')

            # Get or create expense account (debit side)
            expense_account, _ = Account.objects.get_or_create(
                code='5100',
                defaults={
                    'name': 'Operating Expenses',
                    'account_type': 'EXPENSE',
                    'account_subtype': 'OPERATING_EXPENSE',
                    'description': 'General operating expenses',
                    'category': expense_category
                }
            )

            # Get or create cash/bank account (credit side) based on payment method
            if expense.payment_method == 'CASH':
                payment_account, _ = Account.objects.get_or_create(
                    code='1010',
                    defaults={
                        'name': 'Cash',
                        'account_type': 'ASSET',
                        'account_subtype': 'CURRENT_ASSET',
                        'description': 'Cash on hand',
                        'category': asset_category
                    }
                )
            elif expense.payment_method == 'MPESA':
                payment_account, _ = Account.objects.get_or_create(
                    code='1011',
                    defaults={
                        'name': 'M-Pesa',
                        'account_type': 'ASSET',
                        'account_subtype': 'CURRENT_ASSET',
                        'description': 'M-Pesa mobile money',
                        'category': asset_category
                    }
                )
            else:  # BANK_TRANSFER, CHEQUE, CARD, OTHER
                payment_account, _ = Account.objects.get_or_create(
                    code='1020',
                    defaults={
                        'name': 'Bank Account',
                        'account_type': 'ASSET',
                        'account_subtype': 'CURRENT_ASSET',
                        'description': 'Bank account',
                        'category': asset_category
                    }
                )

            # Create journal entry
            journal_entry = JournalEntry.objects.create(
                date=expense.expense_date,
                description=f"Expense: {expense.description}",
                reference=expense.expense_number,
                entry_type='AUTO',
                source_model='expenses.Expense',
                source_id=str(expense.id),
                total_amount=expense.amount,
                created_by=expense.recorded_by,
                status='DRAFT'
            )

            # Create journal entry lines
            # Debit: Expense account (increases expense)
            JournalEntryLine.objects.create(
                journal_entry=journal_entry,
                account=expense_account,
                description=f"{expense.category.name}: {expense.description}",
                debit_amount=expense.amount,
                credit_amount=Decimal('0.00')
            )

            # Credit: Cash/Bank account (decreases asset)
            JournalEntryLine.objects.create(
                journal_entry=journal_entry,
                account=payment_account,
                description=f"Payment for {expense.expense_number}",
                debit_amount=Decimal('0.00'),
                credit_amount=expense.amount
            )

            # Post the journal entry
            journal_entry.post()

            return journal_entry

        except Exception as e:
            # Log the error but don't fail the expense operation
            print(f"Error creating journal entry for expense {expense.expense_number}: {str(e)}")
            return None

    def get_serializer_class(self):
        if self.action == 'create':
            return ExpenseCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ExpenseUpdateSerializer
        elif self.action == 'retrieve':
            return ExpenseDetailSerializer
        return ExpenseListSerializer

    def get_permissions(self):
        """Sales agents and managers can create/view expenses"""
        if self.action in ['list', 'retrieve', 'create']:
            return [permissions.IsAuthenticated(), IsSalesAgent()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsSalesAgent()]
        return [permissions.IsAuthenticated(), IsManager()]

    def get_queryset(self):
        """
        Filter expenses based on user role:
        - Sales agents see their own expenses
        - Managers see all expenses
        """
        queryset = super().get_queryset()
        user = self.request.user

        # Managers and admins can see all expenses
        if user.role in ['ADMIN', 'MANAGER']:
            return queryset

        # Sales agents can only see their own expenses
        return queryset.filter(recorded_by=user)

    def perform_create(self, serializer):
        """Automatically create journal entry when expense is recorded"""
        expense = serializer.save(recorded_by=self.request.user)
        # Create journal entry immediately since expense is already paid
        self._create_expense_journal_entry(expense)

    def perform_update(self, serializer):
        """Only allow editing if user owns the expense"""
        expense = self.get_object()
        user = self.request.user

        # Check if user can edit this expense
        if expense.recorded_by != user and user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {'error': 'You can only edit your own expenses'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer.save()

    @extend_schema(
        summary="Get expense statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        queryset = self.filter_queryset(self.get_queryset())

        stats = {
            'total_expenses': queryset.count(),
            'total_amount': queryset.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00'),
        }

        # Monthly stats
        today = timezone.now()
        this_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        stats['this_month'] = {
            'count': queryset.filter(expense_date__gte=this_month_start).count(),
            'amount': queryset.filter(expense_date__gte=this_month_start).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
        }

        # By category
        by_category = queryset.values('category__name').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('-total')
        stats['by_category'] = list(by_category)

        return Response(stats)

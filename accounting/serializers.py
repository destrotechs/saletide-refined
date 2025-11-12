from rest_framework import serializers
from .models import AccountCategory, Account, JournalEntry, JournalEntryLine, FinancialPeriod, Budget


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            'id', 'name', 'code', 'account_type', 'account_subtype',
            'balance', 'debit_balance', 'credit_balance', 'description',
            'is_active', 'created_at', 'updated_at'
        ]


class AccountCategorySerializer(serializers.ModelSerializer):
    accounts = AccountSerializer(many=True, read_only=True)
    total_balance = serializers.ReadOnlyField()

    class Meta:
        model = AccountCategory
        fields = [
            'id', 'name', 'code', 'account_type', 'description',
            'is_active', 'accounts', 'total_balance', 'created_at', 'updated_at'
        ]


class JournalEntryLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_code = serializers.CharField(source='account.code', read_only=True)

    class Meta:
        model = JournalEntryLine
        fields = [
            'id', 'account', 'account_name', 'account_code',
            'description', 'debit_amount', 'credit_amount', 'created_at'
        ]


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'entry_number', 'date', 'description', 'reference',
            'total_amount', 'created_by', 'created_by_name', 'lines',
            'created_at', 'updated_at'
        ]


class FinancialPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialPeriod
        fields = [
            'id', 'name', 'start_date', 'end_date', 'is_closed', 'created_at'
        ]


class BudgetSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_code = serializers.CharField(source='account.code', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)

    class Meta:
        model = Budget
        fields = [
            'id', 'name', 'period', 'period_name', 'account',
            'account_name', 'account_code', 'budgeted_amount',
            'actual_amount', 'variance', 'created_by', 'created_at', 'updated_at'
        ]


class FinancialSummarySerializer(serializers.Serializer):
    total_assets = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_liabilities = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_equity = serializers.DecimalField(max_digits=15, decimal_places=2)
    cash_on_hand = serializers.DecimalField(max_digits=15, decimal_places=2)
    accounts_receivable = serializers.DecimalField(max_digits=15, decimal_places=2)
    accounts_payable = serializers.DecimalField(max_digits=15, decimal_places=2)
    working_capital = serializers.DecimalField(max_digits=15, decimal_places=2)
    quick_ratio = serializers.DecimalField(max_digits=10, decimal_places=2)
    debt_to_equity_ratio = serializers.DecimalField(max_digits=10, decimal_places=2)


class PLStatementSerializer(serializers.Serializer):
    period = serializers.DictField()
    revenue = serializers.DictField()
    expenses = serializers.DictField()
    gross_profit = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    gross_margin = serializers.DecimalField(max_digits=10, decimal_places=2)
    net_margin = serializers.DecimalField(max_digits=10, decimal_places=2)
from rest_framework import serializers
from .models import ExpenseCategory, Expense
from authentication.models import User


class ExpenseCategorySerializer(serializers.ModelSerializer):
    """Serializer for expense categories"""

    class Meta:
        model = ExpenseCategory
        fields = [
            'id', 'name', 'description', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExpenseListSerializer(serializers.ModelSerializer):
    """Serializer for listing expenses"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    recorded_by_name = serializers.SerializerMethodField()
    job_number = serializers.CharField(source='job.job_number', read_only=True, allow_null=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'expense_number', 'category', 'category_name',
            'description', 'amount', 'expense_date',
            'payment_method', 'payment_method_display', 'reference_number',
            'recorded_by', 'recorded_by_name',
            'job', 'job_number',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'expense_number', 'recorded_by',
            'created_at', 'updated_at'
        ]

    def get_recorded_by_name(self, obj):
        return f"{obj.recorded_by.first_name} {obj.recorded_by.last_name}"


class ExpenseDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for expense with all information"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    recorded_by_name = serializers.SerializerMethodField()
    recorded_by_email = serializers.EmailField(source='recorded_by.email', read_only=True)
    job_number = serializers.CharField(source='job.job_number', read_only=True, allow_null=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'expense_number', 'category', 'category_name',
            'description', 'amount', 'expense_date',
            'payment_method', 'payment_method_display', 'reference_number',
            'recorded_by', 'recorded_by_name', 'recorded_by_email',
            'job', 'job_number',
            'notes', 'receipt_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'expense_number', 'recorded_by',
            'created_at', 'updated_at'
        ]

    def get_recorded_by_name(self, obj):
        return f"{obj.recorded_by.first_name} {obj.recorded_by.last_name}"


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating expenses"""

    class Meta:
        model = Expense
        fields = [
            'category', 'description', 'amount', 'expense_date',
            'payment_method', 'reference_number',
            'job', 'notes', 'receipt_url'
        ]


class ExpenseUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating expenses"""

    class Meta:
        model = Expense
        fields = [
            'category', 'description', 'amount', 'expense_date',
            'payment_method', 'reference_number',
            'job', 'notes', 'receipt_url'
        ]

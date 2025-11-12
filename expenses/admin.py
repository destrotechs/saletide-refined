from django.contrib import admin
from .models import ExpenseCategory, Expense


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'description']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['expense_number', 'description', 'amount', 'category', 'recorded_by', 'expense_date']
    list_filter = ['category', 'payment_method', 'expense_date']
    search_fields = ['expense_number', 'description', 'reference_number']
    readonly_fields = ['expense_number', 'created_at', 'updated_at']
    date_hierarchy = 'expense_date'

    fieldsets = (
        ('Basic Information', {
            'fields': ('expense_number', 'category', 'description', 'amount', 'expense_date')
        }),
        ('Payment Information', {
            'fields': ('payment_method', 'reference_number')
        }),
        ('Recording', {
            'fields': ('recorded_by',)
        }),
        ('Additional Information', {
            'fields': ('job', 'notes', 'receipt_url')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

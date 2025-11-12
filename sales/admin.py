from django.contrib import admin
from .models import (
    Customer, Vehicle, Job, JobLine, OverrideRequest, Payment, JobMedia,
    JobConsumption, Estimate, EstimateLine, JobLineInventory, Invoice, Receipt,
    EmployeeCommissionRate, Commission, Tip, AdvancePayment
)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'is_active', 'created_at']
    search_fields = ['name', 'phone', 'email']
    list_filter = ['is_active', 'created_at']


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['plate_number', 'make', 'model', 'year', 'customer', 'is_active']
    search_fields = ['plate_number', 'make', 'model']
    list_filter = ['is_active', 'make', 'year']


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['job_number', 'customer', 'vehicle', 'status', 'final_total', 'created_at']
    search_fields = ['job_number', 'customer__name', 'vehicle__plate_number']
    list_filter = ['status', 'created_at']


@admin.register(JobLine)
class JobLineAdmin(admin.ModelAdmin):
    list_display = ['job', 'service_variant', 'quantity', 'unit_price', 'total_amount', 'is_completed']
    search_fields = ['job__job_number']
    list_filter = ['is_completed', 'created_at']


@admin.register(EmployeeCommissionRate)
class EmployeeCommissionRateAdmin(admin.ModelAdmin):
    list_display = ['employee', 'service_variant', 'commission_percentage', 'is_active', 'created_at']
    search_fields = ['employee__email', 'employee__first_name', 'employee__last_name']
    list_filter = ['is_active', 'created_at']
    ordering = ['-created_at']


@admin.register(Commission)
class CommissionAdmin(admin.ModelAdmin):
    list_display = ['employee', 'job', 'service_amount', 'commission_rate', 'commission_amount', 'status', 'created_at']
    search_fields = ['employee__email', 'employee__first_name', 'employee__last_name', 'job__job_number']
    list_filter = ['status', 'created_at', 'paid_at']
    readonly_fields = ['commission_amount', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Tip)
class TipAdmin(admin.ModelAdmin):
    list_display = ['employee', 'job', 'amount', 'status', 'paid_at', 'created_at']
    search_fields = ['employee__email', 'employee__first_name', 'employee__last_name', 'job__job_number']
    list_filter = ['status', 'created_at', 'paid_at']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(AdvancePayment)
class AdvancePaymentAdmin(admin.ModelAdmin):
    list_display = ['employee', 'requested_amount', 'approved_amount', 'available_commission', 'status', 'requested_at']
    search_fields = ['employee__email', 'employee__first_name', 'employee__last_name']
    list_filter = ['status', 'requested_at', 'reviewed_at', 'paid_at']
    readonly_fields = ['requested_at', 'created_at', 'updated_at']
    ordering = ['-requested_at']

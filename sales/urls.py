from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet, VehicleViewSet, JobViewSet, JobLineViewSet,
    OverrideRequestViewSet, PaymentViewSet, JobMediaViewSet,
    JobConsumptionViewSet, EstimateViewSet, EstimateLineViewSet,
    InvoiceViewSet, ReceiptViewSet, EmployeeCommissionRateViewSet,
    CommissionViewSet, TipViewSet, AdvancePaymentViewSet
)

router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'vehicles', VehicleViewSet)
router.register(r'jobs', JobViewSet)
router.register(r'job-lines', JobLineViewSet)
router.register(r'override-requests', OverrideRequestViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'job-media', JobMediaViewSet)
router.register(r'job-consumption', JobConsumptionViewSet)
router.register(r'estimates', EstimateViewSet)
router.register(r'estimate-lines', EstimateLineViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'receipts', ReceiptViewSet)
router.register(r'commission-rates', EmployeeCommissionRateViewSet)
router.register(r'commissions', CommissionViewSet)
router.register(r'tips', TipViewSet)
router.register(r'advance-payments', AdvancePaymentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
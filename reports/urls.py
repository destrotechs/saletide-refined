from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SalesReportViewSet, InventoryReportViewSet,
    ProfitabilityReportViewSet, DashboardViewSet, FinancialReportViewSet
)

router = DefaultRouter()
router.register(r'sales', SalesReportViewSet, basename='sales-reports')
router.register(r'inventory', InventoryReportViewSet, basename='inventory-reports')
router.register(r'profitability', ProfitabilityReportViewSet, basename='profitability-reports')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'financial', FinancialReportViewSet, basename='financial-reports')

urlpatterns = [
    path('', include(router.urls)),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AccountCategoryViewSet, AccountViewSet, JournalEntryViewSet,
    FinancialReportsViewSet
)

router = DefaultRouter()
router.register(r'categories', AccountCategoryViewSet, basename='accountcategory')
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'journal-entries', JournalEntryViewSet, basename='journalentry')
router.register(r'reports', FinancialReportsViewSet, basename='financialreports')

urlpatterns = [
    path('', include(router.urls)),
]
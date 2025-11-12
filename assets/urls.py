from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssetViewSet, AssetCategoryViewSet, AssetDepreciationViewSet,
    AssetMaintenanceViewSet, AssetTransferViewSet
)

router = DefaultRouter()
router.register(r'assets', AssetViewSet)
router.register(r'categories', AssetCategoryViewSet)
router.register(r'depreciation', AssetDepreciationViewSet)
router.register(r'maintenance', AssetMaintenanceViewSet)
router.register(r'transfers', AssetTransferViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
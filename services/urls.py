from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VehicleClassViewSet, PartViewSet, ServiceViewSet,
    ServiceVariantViewSet, PriceBandViewSet
)

router = DefaultRouter()
router.register(r'vehicle-classes', VehicleClassViewSet)
router.register(r'parts', PartViewSet)
router.register(r'services', ServiceViewSet)
router.register(r'service-variants', ServiceVariantViewSet)
router.register(r'price-bands', PriceBandViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
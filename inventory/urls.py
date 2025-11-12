from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SKUCategoryViewSet, SKUViewSet, SupplierViewSet, BOMViewSet, StockLocationViewSet,
    StockLedgerViewSet, PurchaseOrderViewSet, GoodsReceivedNoteViewSet,
    StockCountViewSet, StockCountLineViewSet
)

router = DefaultRouter()
router.register(r'sku-categories', SKUCategoryViewSet)
router.register(r'skus', SKUViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'boms', BOMViewSet)
router.register(r'locations', StockLocationViewSet)
router.register(r'stock-ledger', StockLedgerViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'goods-received', GoodsReceivedNoteViewSet)
router.register(r'stock-counts', StockCountViewSet)
router.register(r'stock-count-lines', StockCountLineViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
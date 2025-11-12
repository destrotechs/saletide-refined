from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Q, Count, Sum, F
from decimal import Decimal
from datetime import datetime, timedelta

from .models import (
    SKUCategory, Supplier, SKU, BOM, StockLocation, StockLedger,
    PurchaseOrder, PurchaseOrderLine, GoodsReceivedNote,
    StockCount, StockCountLine
)
from .serializers import (
    SKUCategorySerializer, SupplierSerializer, SKUSerializer, SKUStockDetailSerializer,
    BOMSerializer, StockLocationSerializer, StockLedgerSerializer,
    PurchaseOrderSerializer, PurchaseOrderCreateSerializer, PurchaseOrderLineSerializer,
    GoodsReceivedNoteSerializer, StockCountSerializer, StockCountLineSerializer,
    StockAdjustmentSerializer
)
from authentication.permissions import IsAdmin, IsManager, IsSalesAgent


class SKUCategoryViewSet(viewsets.ModelViewSet):
    queryset = SKUCategory.objects.all()
    serializer_class = SKUCategorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        """
        Allow sales agents read-only access (list, retrieve)
        Only managers can create, update, delete categories
        """
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsSalesAgent()]
        return [permissions.IsAuthenticated(), IsManager()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            if not self.request.query_params.get('show_all'):
                queryset = queryset.filter(is_active=True)
        return queryset


class SKUViewSet(viewsets.ModelViewSet):
    queryset = SKU.objects.select_related('category', 'supplier').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'supplier', 'is_active']
    search_fields = ['code', 'name', 'description', 'supplier__name']
    ordering_fields = ['name', 'code', 'cost', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        """
        Allow sales agents read-only access (list, retrieve, statistics, reorder_alerts)
        Only managers can create, update, delete, or adjust stock
        """
        if self.action in ['list', 'retrieve', 'statistics', 'reorder_alerts']:
            return [permissions.IsAuthenticated(), IsSalesAgent()]
        return [permissions.IsAuthenticated(), IsManager()]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SKUStockDetailSerializer
        return SKUSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            if not self.request.query_params.get('show_all'):
                queryset = queryset.filter(is_active=True)
        return queryset

    @extend_schema(
        summary="Get SKU statistics and metrics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        stats = {
            'total_skus': SKU.objects.count(),
            'active_skus': SKU.objects.filter(is_active=True).count(),
            'categories_count': SKUCategory.objects.filter(is_active=True).count(),
            'total_stock_value': StockLedger.objects.aggregate(
                total=Sum(F('quantity_change') * F('cost_at_transaction'))
            )['total'] or 0
        }
        return Response(stats)

    @extend_schema(
        summary="Get reorder alerts",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def reorder_alerts(self, request):
        # Get SKUs that need reordering
        skus = SKU.objects.filter(is_active=True)
        alerts = []

        for sku in skus:
            current_stock = StockLedger.objects.filter(sku=sku).aggregate(
                total=Sum('quantity_change')
            )['total'] or Decimal('0.00')

            if current_stock <= sku.min_stock_level:
                alerts.append({
                    'sku_id': sku.id,
                    'sku_code': sku.code,
                    'sku_name': sku.name,
                    'current_stock': current_stock,
                    'min_stock_level': sku.min_stock_level,
                    'supplier_name': sku.supplier.name if sku.supplier else 'No supplier',
                    'urgency': 'URGENT' if current_stock == 0 else 'LOW'
                })

        return Response({
            'alerts_count': len(alerts),
            'alerts': sorted(alerts, key=lambda x: x['current_stock'])
        })

    @extend_schema(
        summary="Adjust stock for SKU",
        request=StockAdjustmentSerializer,
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'], url_path='adjust-stock')
    def adjust_stock(self, request, pk=None):
        sku = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        adjustment_type = data['adjustment_type']
        quantity = data['quantity']
        reason = data['reason']
        notes = data.get('notes', '')
        location_id = data.get('location')

        # Get default location if not provided (first active location)
        if location_id:
            try:
                location = StockLocation.objects.get(id=location_id, is_active=True)
            except StockLocation.DoesNotExist:
                return Response(
                    {'error': 'Invalid location specified'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Use the first active location as default
            location = StockLocation.objects.filter(is_active=True).first()
            if not location:
                return Response(
                    {'error': 'No active stock location found'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Calculate quantity change (positive for IN, negative for OUT)
        quantity_change = quantity if adjustment_type == 'IN' else -quantity

        # For OUT adjustments, check if there's enough stock
        if adjustment_type == 'OUT':
            current_stock = StockLedger.objects.filter(
                sku=sku, location=location
            ).aggregate(total=Sum('quantity_change'))['total'] or Decimal('0.00')

            if current_stock < quantity:
                return Response(
                    {'error': f'Insufficient stock. Available: {current_stock} {sku.unit}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create stock ledger entry
        stock_ledger = StockLedger.objects.create(
            sku=sku,
            location=location,
            quantity_change=quantity_change,
            transaction_type='ADJUSTMENT',
            reason=f"{reason}: {notes}" if notes else reason,
            cost_at_transaction=sku.cost,
            created_by=request.user
        )

        # Calculate new stock level
        new_stock = StockLedger.objects.filter(sku=sku).aggregate(
            total=Sum('quantity_change')
        )['total'] or Decimal('0.00')

        return Response({
            'message': f'Stock {"increased" if adjustment_type == "IN" else "decreased"} successfully',
            'adjustment_id': stock_ledger.id,
            'previous_stock': new_stock - quantity_change,
            'adjustment_quantity': quantity_change,
            'new_stock': new_stock,
            'unit': sku.unit,
            'location': location.name
        })


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'code', 'contact_person', 'email', 'phone']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        """
        Allow sales agents read-only access (list, retrieve)
        Only managers can create, update, delete suppliers
        """
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsSalesAgent()]
        return [permissions.IsAuthenticated(), IsManager()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            if not self.request.query_params.get('show_all'):
                queryset = queryset.filter(is_active=True)
        return queryset


class BOMViewSet(viewsets.ModelViewSet):
    queryset = BOM.objects.select_related('service_variant', 'sku').all()
    serializer_class = BOMSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['service_variant', 'sku', 'is_active']
    search_fields = ['service_variant__service__name', 'sku__name']
    ordering_fields = ['service_variant__service__name', 'created_at']
    ordering = ['service_variant__service__name']

    def get_permissions(self):
        """
        Allow sales agents read-only access (list, retrieve, calculate_cost)
        Only managers can create, update, delete BOM items
        """
        if self.action in ['list', 'retrieve', 'calculate_cost']:
            return [permissions.IsAuthenticated(), IsSalesAgent()]
        return [permissions.IsAuthenticated(), IsManager()]

    @extend_schema(
        summary="Calculate BOM cost for service variant",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def calculate_cost(self, request):
        service_variant_id = request.query_params.get('service_variant_id')
        if not service_variant_id:
            return Response(
                {'error': 'service_variant_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        bom_items = BOM.objects.filter(service_variant_id=service_variant_id, is_active=True)
        total_cost = Decimal('0.00')
        line_costs = []

        for bom_item in bom_items:
            total_quantity = bom_item.get_total_quantity_with_wastage()
            line_cost = bom_item.sku.cost * total_quantity
            total_cost += line_cost

            line_costs.append({
                'sku_code': bom_item.sku.code,
                'sku_name': bom_item.sku.name,
                'standard_quantity': bom_item.standard_quantity,
                'wastage_percentage': bom_item.wastage_percentage,
                'total_quantity': total_quantity,
                'unit_cost': bom_item.sku.cost,
                'line_cost': line_cost
            })

        return Response({
            'service_variant_id': service_variant_id,
            'total_cost': total_cost,
            'line_items': line_costs
        })


class StockLocationViewSet(viewsets.ModelViewSet):
    queryset = StockLocation.objects.select_related('branch').all()
    serializer_class = StockLocationSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['branch', 'is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            if not self.request.query_params.get('show_all'):
                queryset = queryset.filter(is_active=True)
        return queryset

    @extend_schema(
        summary="Get location stock summary",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['get'])
    def stock_summary(self, request, pk=None):
        location = self.get_object()

        summary = {
            'location_id': location.id,
            'location_name': location.name,
            'total_skus': StockLedger.objects.filter(location=location).values('sku').distinct().count(),
            'total_stock_value': StockLedger.objects.filter(location=location).aggregate(
                total=Sum(F('quantity_change') * F('cost_at_transaction'))
            )['total'] or 0,
            'low_stock_items': []
        }

        # Get low stock items for this location
        skus_at_location = StockLedger.objects.filter(location=location).values('sku').distinct()
        for sku_data in skus_at_location:
            sku = SKU.objects.get(id=sku_data['sku'])
            current_stock = StockLedger.objects.filter(
                sku=sku, location=location
            ).aggregate(total=Sum('quantity_change'))['total'] or Decimal('0.00')

            if current_stock <= sku.min_stock_level:
                summary['low_stock_items'].append({
                    'sku_name': sku.name,
                    'current_stock': current_stock,
                    'min_stock_level': sku.min_stock_level
                })

        return Response(summary)


class StockLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockLedger.objects.select_related('sku', 'location', 'created_by').all()
    serializer_class = StockLedgerSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sku', 'location', 'transaction_type']
    search_fields = ['sku__code', 'sku__name', 'location__name', 'reason']
    ordering_fields = ['created_at', 'quantity_change']
    ordering = ['-created_at']

    @extend_schema(
        summary="Get stock ledger statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        thirty_days_ago = datetime.now() - timedelta(days=30)

        stats = {
            'total_transactions': StockLedger.objects.count(),
            'transactions_last_30_days': StockLedger.objects.filter(
                created_at__gte=thirty_days_ago
            ).count(),
            'inbound_transactions': StockLedger.objects.filter(
                quantity_change__gt=0
            ).count(),
            'outbound_transactions': StockLedger.objects.filter(
                quantity_change__lt=0
            ).count(),
            'total_value': StockLedger.objects.aggregate(
                total=Sum(F('quantity_change') * F('cost_at_transaction'))
            )['total'] or 0
        }

        return Response(stats)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related(
        'supplier', 'branch', 'created_by', 'approved_by'
    ).prefetch_related('lines')
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['supplier', 'branch', 'status']
    search_fields = ['po_number', 'supplier__name']
    ordering_fields = ['created_at', 'expected_delivery_date', 'total_amount']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return PurchaseOrderCreateSerializer
        return PurchaseOrderSerializer

    @extend_schema(
        summary="Approve purchase order",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        po = self.get_object()

        if po.status not in ['DRAFT', 'SUBMITTED']:
            return Response(
                {'error': 'Only draft or submitted orders can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )

        po.status = 'APPROVED'
        po.approved_by = request.user
        po.save()

        return Response({
            'message': 'Purchase order approved successfully',
            'po_number': po.po_number,
            'status': po.status
        })

    @extend_schema(
        summary="Get purchase order statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        stats = {
            'total_orders': PurchaseOrder.objects.count(),
            'draft_orders': PurchaseOrder.objects.filter(status='DRAFT').count(),
            'submitted_orders': PurchaseOrder.objects.filter(status='SUBMITTED').count(),
            'approved_orders': PurchaseOrder.objects.filter(status='APPROVED').count(),
            'total_value': PurchaseOrder.objects.aggregate(
                total=Sum('total_amount')
            )['total'] or 0
        }

        return Response(stats)


class GoodsReceivedNoteViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceivedNote.objects.select_related(
        'purchase_order', 'location', 'received_by'
    ).all()
    serializer_class = GoodsReceivedNoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['purchase_order', 'location', 'received_by']
    search_fields = ['grn_number', 'purchase_order__po_number']
    ordering_fields = ['received_date']
    ordering = ['-received_date']


class StockCountViewSet(viewsets.ModelViewSet):
    queryset = StockCount.objects.select_related(
        'location', 'created_by', 'approved_by'
    ).prefetch_related('lines')
    serializer_class = StockCountSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['location', 'status']
    search_fields = ['count_number']
    ordering_fields = ['count_date', 'created_at']
    ordering = ['-count_date']

    @extend_schema(
        summary="Approve stock count",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        stock_count = self.get_object()

        if stock_count.status != 'COMPLETED':
            return Response(
                {'error': 'Only completed counts can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )

        stock_count.status = 'APPROVED'
        stock_count.approved_by = request.user
        stock_count.save()

        return Response({
            'message': 'Stock count approved successfully',
            'count_id': stock_count.id,
            'status': stock_count.status
        })

    @extend_schema(
        summary="Get stock count statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        stats = {
            'total_counts': StockCount.objects.count(),
            'planned_counts': StockCount.objects.filter(status='PLANNED').count(),
            'in_progress_counts': StockCount.objects.filter(status='IN_PROGRESS').count(),
            'completed_counts': StockCount.objects.filter(status='COMPLETED').count(),
            'approved_counts': StockCount.objects.filter(status='APPROVED').count(),
        }

        return Response(stats)


class StockCountLineViewSet(viewsets.ModelViewSet):
    queryset = StockCountLine.objects.select_related('stock_count', 'sku').all()
    serializer_class = StockCountLineSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['stock_count', 'sku']
    search_fields = ['sku__code', 'sku__name']
    ordering_fields = ['variance', 'created_at']
    ordering = ['sku__name']
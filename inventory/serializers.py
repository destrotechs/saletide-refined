from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Sum
from decimal import Decimal
from .models import (
    SKUCategory, Supplier, SKU, BOM, StockLocation, StockLedger,
    PurchaseOrder, PurchaseOrderLine, GoodsReceivedNote,
    StockCount, StockCountLine
)

User = get_user_model()


class SKUCategorySerializer(serializers.ModelSerializer):
    skus_count = serializers.SerializerMethodField()

    class Meta:
        model = SKUCategory
        fields = [
            'id', 'name', 'code', 'description', 'skus_count',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_skus_count(self, obj):
        return obj.skus.filter(is_active=True).count()


class SupplierSerializer(serializers.ModelSerializer):
    active_skus_count = serializers.SerializerMethodField()
    total_orders_count = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'code', 'contact_person', 'phone', 'email',
            'address', 'payment_terms', 'tax_number', 'active_skus_count',
            'total_orders_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_active_skus_count(self, obj):
        return obj.skus.filter(is_active=True).count()

    def get_total_orders_count(self, obj):
        return obj.purchase_orders.count()


class SKUSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    current_stock = serializers.SerializerMethodField()
    stock_value = serializers.SerializerMethodField()
    reorder_status = serializers.SerializerMethodField()

    class Meta:
        model = SKU
        fields = [
            'id', 'code', 'name', 'description', 'category', 'category_name',
            'unit', 'cost', 'selling_price_per_unit', 'min_stock_level', 'max_stock_level', 'reorder_point',
            'lead_time_days', 'supplier', 'supplier_name', 'batch_tracked',
            'current_stock', 'stock_value', 'reorder_status',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_current_stock(self, obj):
        # Get total stock across all locations
        total_stock = StockLedger.objects.filter(sku=obj).aggregate(
            total=Sum('quantity_change')
        )['total'] or Decimal('0.00')
        return total_stock

    def get_stock_value(self, obj):
        current_stock = self.get_current_stock(obj)
        return current_stock * obj.cost

    def get_reorder_status(self, obj):
        current_stock = self.get_current_stock(obj)
        if current_stock <= obj.min_stock_level:
            return 'URGENT'
        elif current_stock <= obj.reorder_point:
            return 'REORDER'
        return 'OK'


class SKUStockDetailSerializer(serializers.ModelSerializer):
    """Detailed SKU serializer with stock by location"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    stock_by_location = serializers.SerializerMethodField()
    recent_movements = serializers.SerializerMethodField()

    class Meta:
        model = SKU
        fields = [
            'id', 'code', 'name', 'description', 'category_name', 'supplier_name',
            'unit', 'cost', 'selling_price_per_unit', 'stock_by_location', 'recent_movements',
            'min_stock_level', 'reorder_point', 'is_active'
        ]

    def get_stock_by_location(self, obj):
        locations = StockLocation.objects.filter(is_active=True)
        stock_data = []

        for location in locations:
            stock = StockLedger.objects.filter(
                sku=obj, location=location
            ).aggregate(total=Sum('quantity_change'))['total'] or Decimal('0.00')

            stock_data.append({
                'location_id': location.id,
                'location_name': location.name,
                'quantity': stock,
                'value': stock * obj.cost
            })

        return stock_data

    def get_recent_movements(self, obj):
        recent = StockLedger.objects.filter(sku=obj).order_by('-created_at')[:10]
        return [{
            'date': movement.created_at,
            'type': movement.transaction_type,
            'quantity_change': movement.quantity_change,
            'location': movement.location.name,
            'reason': movement.reason[:50] + '...' if len(movement.reason) > 50 else movement.reason
        } for movement in recent]


class BOMSerializer(serializers.ModelSerializer):
    service_variant_name = serializers.CharField(source='service_variant.__str__', read_only=True)
    sku_name = serializers.CharField(source='sku.name', read_only=True)
    sku_unit = serializers.CharField(source='sku.unit', read_only=True)
    total_quantity_with_wastage = serializers.CharField(read_only=True)
    cost_per_unit = serializers.DecimalField(source='sku.cost', max_digits=12, decimal_places=2, read_only=True)
    total_cost = serializers.SerializerMethodField()

    class Meta:
        model = BOM
        fields = [
            'id', 'service_variant', 'service_variant_name', 'sku', 'sku_name',
            'sku_unit', 'standard_quantity', 'wastage_percentage',
            'total_quantity_with_wastage', 'cost_per_unit', 'total_cost',
            'notes', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_cost(self, obj):
        total_qty = obj.get_total_quantity_with_wastage()
        return total_qty * obj.sku.cost


class StockLocationSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    total_skus = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()

    class Meta:
        model = StockLocation
        fields = [
            'id', 'name', 'code', 'branch', 'branch_name', 'description',
            'total_skus', 'total_value', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_skus(self, obj):
        return StockLedger.objects.filter(location=obj).values('sku').distinct().count()

    def get_total_value(self, obj):
        # Calculate total value of stock at this location
        from django.db.models import F
        total = StockLedger.objects.filter(location=obj).aggregate(
            total_value=Sum(F('quantity_change') * F('cost_at_transaction'))
        )['total_value'] or Decimal('0.00')
        return total


class StockLedgerSerializer(serializers.ModelSerializer):
    sku_name = serializers.CharField(source='sku.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    total_value = serializers.SerializerMethodField()

    class Meta:
        model = StockLedger
        fields = [
            'id', 'sku', 'sku_name', 'location', 'location_name',
            'quantity_change', 'transaction_type', 'reason',
            'reference_type', 'reference_id', 'batch_number', 'expiry_date',
            'cost_at_transaction', 'total_value', 'created_by', 'created_by_name',
            'approved_by', 'approved_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_total_value(self, obj):
        return abs(obj.quantity_change) * obj.cost_at_transaction

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    sku_name = serializers.CharField(source='sku.name', read_only=True)
    sku_unit = serializers.CharField(source='sku.unit', read_only=True)
    received_percentage = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderLine
        fields = [
            'id', 'sku', 'sku_name', 'sku_unit', 'quantity_ordered',
            'quantity_received', 'received_percentage', 'unit_price',
            'total_price', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_price', 'created_at', 'updated_at']

    def get_received_percentage(self, obj):
        if obj.quantity_ordered > 0:
            return (obj.quantity_received / obj.quantity_ordered * 100)
        return 0


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    lines = PurchaseOrderLineSerializer(many=True, read_only=True)
    lines_count = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'supplier', 'supplier_name', 'branch', 'branch_name',
            'status', 'order_date', 'expected_delivery_date', 'total_amount',
            'lines_count', 'lines', 'notes', 'created_by', 'created_by_name',
            'approved_by', 'approved_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_lines_count(self, obj):
        return obj.lines.count()

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating purchase orders"""
    lines = PurchaseOrderLineSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'supplier', 'branch', 'order_date', 'expected_delivery_date',
            'notes', 'lines'
        ]

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        request = self.context.get('request')

        # Generate PO number
        po_count = PurchaseOrder.objects.count() + 1
        po_number = f"PO-{po_count:06d}"
        validated_data['po_number'] = po_number

        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        purchase_order = PurchaseOrder.objects.create(**validated_data)

        # Create lines and calculate total
        total_amount = Decimal('0.00')
        for line_data in lines_data:
            line_data['purchase_order'] = purchase_order
            line = PurchaseOrderLine.objects.create(**line_data)
            total_amount += line.total_price

        purchase_order.total_amount = total_amount
        purchase_order.save()

        return purchase_order


class GoodsReceivedNoteSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    received_by_name = serializers.CharField(source='received_by.get_full_name', read_only=True)

    class Meta:
        model = GoodsReceivedNote
        fields = [
            'id', 'grn_number', 'purchase_order', 'po_number', 'location',
            'location_name', 'received_date', 'notes', 'received_by',
            'received_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        request = self.context.get('request')

        # Generate GRN number
        grn_count = GoodsReceivedNote.objects.count() + 1
        grn_number = f"GRN-{grn_count:06d}"
        validated_data['grn_number'] = grn_number

        if request and hasattr(request, 'user'):
            validated_data['received_by'] = request.user

        return super().create(validated_data)


class StockCountLineSerializer(serializers.ModelSerializer):
    sku_name = serializers.CharField(source='sku.name', read_only=True)
    sku_unit = serializers.CharField(source='sku.unit', read_only=True)
    variance_percentage = serializers.SerializerMethodField()

    class Meta:
        model = StockCountLine
        fields = [
            'id', 'sku', 'sku_name', 'sku_unit', 'system_quantity',
            'counted_quantity', 'variance', 'variance_percentage',
            'adjustment_reason', 'created_at'
        ]
        read_only_fields = ['id', 'variance', 'created_at']

    def get_variance_percentage(self, obj):
        if obj.system_quantity > 0:
            return (obj.variance / obj.system_quantity * 100)
        return 0 if obj.variance == 0 else 100


class StockCountSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    lines = StockCountLineSerializer(many=True, read_only=True)
    total_variance_value = serializers.SerializerMethodField()

    class Meta:
        model = StockCount
        fields = [
            'id', 'count_number', 'location', 'location_name', 'status',
            'count_date', 'notes', 'lines', 'total_variance_value',
            'created_by', 'created_by_name', 'approved_by', 'approved_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_total_variance_value(self, obj):
        total_value = Decimal('0.00')
        for line in obj.lines.all():
            cost = line.sku.cost
            total_value += abs(line.variance) * cost
        return total_value

    def create(self, validated_data):
        request = self.context.get('request')

        # Generate count number
        count_num = StockCount.objects.count() + 1
        count_number = f"CNT-{count_num:06d}"
        validated_data['count_number'] = count_number

        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        return super().create(validated_data)


class InventoryReorderReportSerializer(serializers.Serializer):
    """Serializer for reorder reports"""
    sku_id = serializers.UUIDField(read_only=True)
    sku_code = serializers.CharField(read_only=True)
    sku_name = serializers.CharField(read_only=True)
    current_stock = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    min_stock_level = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    reorder_point = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    reorder_quantity = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    days_until_stockout = serializers.IntegerField(read_only=True)
    supplier_name = serializers.CharField(read_only=True)
    lead_time_days = serializers.IntegerField(read_only=True)


class StockMovementReportSerializer(serializers.Serializer):
    """Serializer for stock movement reports"""
    sku_name = serializers.CharField(read_only=True)
    location_name = serializers.CharField(read_only=True)
    opening_balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_in = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_out = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    closing_balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)


class StockAdjustmentSerializer(serializers.Serializer):
    """Serializer for stock adjustments"""
    ADJUSTMENT_CHOICES = [
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
    ]

    adjustment_type = serializers.ChoiceField(choices=ADJUSTMENT_CHOICES)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    reason = serializers.CharField(max_length=255)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)
    location = serializers.UUIDField(required=False)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid

User = get_user_model()


class SKUCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sku_categories'
        ordering = ['name']
        verbose_name_plural = 'SKU Categories'

    def __str__(self):
        return f"{self.name} ({self.code})"


class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=50, unique=True)
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField()
    payment_terms = models.CharField(max_length=100, blank=True)
    tax_number = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'suppliers'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class SKU(models.Model):
    UNIT_CHOICES = [
        ('ML', 'Milliliters'),
        ('L', 'Liters'),
        ('G', 'Grams'),
        ('KG', 'Kilograms'),
        ('PCS', 'Pieces'),
        ('M', 'Meters'),
        ('M2', 'Square Meters'),
        ('ROLL', 'Roll'),
        ('BOX', 'Box'),
        ('PACK', 'Pack'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        SKUCategory,
        on_delete=models.SET_NULL,
        null=True,
        related_name='skus'
    )
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='PCS')
    cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    selling_price_per_unit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Optional selling price per unit for inventory items"
    )
    min_stock_level = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    max_stock_level = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    reorder_point = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    lead_time_days = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='skus'
    )
    batch_tracked = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'skus'
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class BOM(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_variant = models.ForeignKey(
        'services.ServiceVariant',
        on_delete=models.CASCADE,
        related_name='bom_items'
    )
    sku = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        related_name='bom_items'
    )
    standard_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    wastage_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MinValueValidator(Decimal('0.00'))]
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bom'
        unique_together = ['service_variant', 'sku']
        ordering = ['service_variant', 'sku__name']

    def __str__(self):
        return f"{self.service_variant} - {self.sku.name}"

    def get_total_quantity_with_wastage(self):
        return self.standard_quantity * (1 + self.wastage_percentage / 100)


class StockLocation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    branch = models.ForeignKey(
        'authentication.Branch',
        on_delete=models.CASCADE,
        related_name='stock_locations'
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stock_locations'
        ordering = ['branch__name', 'name']

    def __str__(self):
        return f"{self.branch.name} - {self.name}"


class StockLedger(models.Model):
    TRANSACTION_TYPES = [
        ('PURCHASE', 'Purchase'),
        ('SALE', 'Sale'),
        ('ADJUSTMENT', 'Adjustment'),
        ('TRANSFER_IN', 'Transfer In'),
        ('TRANSFER_OUT', 'Transfer Out'),
        ('CONSUMPTION', 'Consumption'),
        ('WASTAGE', 'Wastage'),
        ('RETURN', 'Return'),
        ('OPENING', 'Opening Stock'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sku = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        related_name='stock_ledgers'
    )
    location = models.ForeignKey(
        StockLocation,
        on_delete=models.CASCADE,
        related_name='stock_ledgers'
    )
    quantity_change = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Positive for inbound, negative for outbound"
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    reason = models.TextField()
    reference_type = models.CharField(max_length=50, blank=True)
    reference_id = models.CharField(max_length=100, blank=True)
    batch_number = models.CharField(max_length=100, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    cost_at_transaction = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='stock_ledgers'
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_stock_ledgers'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'stock_ledgers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sku', 'location', '-created_at']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['reference_type', 'reference_id']),
        ]

    def __str__(self):
        return f"{self.transaction_type} - {self.sku.name} - {self.quantity_change}"

    def get_current_stock_at_location(self):
        from django.db.models import Sum
        total = StockLedger.objects.filter(
            sku=self.sku,
            location=self.location,
            created_at__lte=self.created_at
        ).aggregate(total=Sum('quantity_change'))['total'] or Decimal('0.00')
        return total


class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('PARTIAL', 'Partially Received'),
        ('RECEIVED', 'Fully Received'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    po_number = models.CharField(max_length=50, unique=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name='purchase_orders'
    )
    branch = models.ForeignKey(
        'authentication.Branch',
        on_delete=models.CASCADE,
        related_name='purchase_orders'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    order_date = models.DateField()
    expected_delivery_date = models.DateField()
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_purchase_orders'
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_purchase_orders'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchase_orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"PO {self.po_number} - {self.supplier.name}"


class PurchaseOrderLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='lines'
    )
    sku = models.ForeignKey(
        SKU,
        on_delete=models.PROTECT,
        related_name='purchase_order_lines'
    )
    quantity_ordered = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    quantity_received = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchase_order_lines'
        ordering = ['purchase_order', 'sku__name']

    def __str__(self):
        return f"{self.purchase_order.po_number} - {self.sku.name}"

    def save(self, *args, **kwargs):
        self.total_price = self.quantity_ordered * self.unit_price
        super().save(*args, **kwargs)


class GoodsReceivedNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grn_number = models.CharField(max_length=50, unique=True)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.PROTECT,
        related_name='goods_received_notes'
    )
    location = models.ForeignKey(
        StockLocation,
        on_delete=models.CASCADE,
        related_name='goods_received_notes'
    )
    received_date = models.DateTimeField()
    notes = models.TextField(blank=True)
    received_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='goods_received_notes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'goods_received_notes'
        ordering = ['-received_date']

    def __str__(self):
        return f"GRN {self.grn_number} for {self.purchase_order.po_number}"


class StockCount(models.Model):
    STATUS_CHOICES = [
        ('PLANNED', 'Planned'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('APPROVED', 'Approved'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    count_number = models.CharField(max_length=50, unique=True)
    location = models.ForeignKey(
        StockLocation,
        on_delete=models.CASCADE,
        related_name='stock_counts'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')
    count_date = models.DateTimeField()
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_stock_counts'
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_stock_counts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stock_counts'
        ordering = ['-count_date']

    def __str__(self):
        return f"Count {self.count_number} at {self.location.name}"


class StockCountLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stock_count = models.ForeignKey(
        StockCount,
        on_delete=models.CASCADE,
        related_name='lines'
    )
    sku = models.ForeignKey(
        SKU,
        on_delete=models.PROTECT,
        related_name='stock_count_lines'
    )
    system_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    counted_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    variance = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    adjustment_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'stock_count_lines'
        ordering = ['stock_count', 'sku__name']

    def __str__(self):
        return f"{self.stock_count.count_number} - {self.sku.name}"

    def save(self, *args, **kwargs):
        self.variance = self.counted_quantity - self.system_quantity
        super().save(*args, **kwargs)
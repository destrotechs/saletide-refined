from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid

User = get_user_model()


class VehicleClass(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    modifier_type = models.CharField(
        max_length=20,
        choices=[
            ('PERCENTAGE', 'Percentage'),
            ('FIXED', 'Fixed Amount'),
        ],
        default='PERCENTAGE'
    )
    modifier_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vehicle_classes'
        ordering = ['name']
        verbose_name_plural = 'Vehicle Classes'

    def __str__(self):
        return f"{self.name} ({self.code})"


class Part(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'parts'
        ordering = ['name']

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} - {self.name}"
        return self.name

    def get_full_path(self):
        if self.parent:
            return f"{self.parent.get_full_path()} > {self.name}"
        return self.name




class Service(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    duration_estimate_minutes = models.IntegerField(
        default=60,
        validators=[MinValueValidator(15)]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'services'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class ServiceVariant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name='variants'
    )
    part = models.ForeignKey(
        Part,
        on_delete=models.CASCADE,
        related_name='service_variants'
    )
    vehicle_class = models.ForeignKey(
        VehicleClass,
        on_delete=models.CASCADE,
        related_name='service_variants'
    )
    suggested_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    floor_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    price_inputs = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_service_variants'
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='updated_service_variants'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'service_variants'
        unique_together = ['service', 'part', 'vehicle_class']
        ordering = ['service__name', 'part__name', 'vehicle_class__name']
        indexes = [
            models.Index(fields=['service', 'part', 'vehicle_class']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.service.name} - {self.part.name} - {self.vehicle_class.name}"

    def calculate_price_with_modifier(self):
        base_price = self.suggested_price

        # Apply vehicle class modifier
        if self.vehicle_class.modifier_type == 'PERCENTAGE':
            vehicle_modifier = base_price * (self.vehicle_class.modifier_value / 100)
        else:
            vehicle_modifier = self.vehicle_class.modifier_value

        return base_price + vehicle_modifier

    def calculate_floor_price_with_inventory(self, selected_inventory_items=None):
        """Calculate floor price including selected inventory items"""
        base_floor_price = self.floor_price

        if selected_inventory_items:
            # Add inventory-based floor price modifiers
            for item in selected_inventory_items:
                if hasattr(item, 'floor_price_modifier'):
                    base_floor_price += item.floor_price_modifier

        return base_floor_price


class ServiceVariantInventory(models.Model):
    """Optional inventory items that can be used with a service variant"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_variant = models.ForeignKey(
        ServiceVariant,
        on_delete=models.CASCADE,
        related_name='inventory_options'
    )
    sku = models.ForeignKey(
        'inventory.SKU',
        on_delete=models.CASCADE,
        related_name='service_variant_options'
    )
    is_required = models.BooleanField(
        default=False,
        help_text='Whether this inventory item is required for this service'
    )
    standard_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Standard quantity needed for this service'
    )
    floor_price_modifier = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Additional floor price when this inventory item is used'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'service_variant_inventory'
        unique_together = ['service_variant', 'sku']
        ordering = ['service_variant', 'sku__name']

    def __str__(self):
        return f"{self.service_variant} - {self.sku.name}"


class PriceBand(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_variant = models.ForeignKey(
        ServiceVariant,
        on_delete=models.CASCADE,
        related_name='price_bands'
    )
    name = models.CharField(max_length=100)
    min_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('-100.00')), MaxValueValidator(Decimal('100.00'))]
    )
    max_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('-100.00')), MaxValueValidator(Decimal('100.00'))]
    )
    requires_approval = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'price_bands'
        ordering = ['service_variant', 'min_percentage']

    def __str__(self):
        return f"{self.name} ({self.min_percentage}% - {self.max_percentage}%)"

    def is_price_within_band(self, price):
        base_price = self.service_variant.suggested_price
        min_price = base_price * (1 + self.min_percentage / 100)
        max_price = base_price * (1 + self.max_percentage / 100)
        return min_price <= price <= max_price
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid

User = get_user_model()


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    consent_for_communications = models.BooleanField(default=False)
    date_of_birth = models.DateField(null=True, blank=True)
    national_id = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customers'
        ordering = ['name']
        indexes = [
            models.Index(fields=['phone']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.name} ({self.phone})"


class Vehicle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='vehicles'
    )
    plate_number = models.CharField(max_length=50, unique=True)
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.IntegerField()
    color = models.CharField(max_length=50)
    vin = models.CharField(max_length=100, blank=True)
    vehicle_class = models.ForeignKey(
        'services.VehicleClass',
        on_delete=models.SET_NULL,
        null=True,
        related_name='vehicles'
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vehicles'
        ordering = ['plate_number']
        indexes = [
            models.Index(fields=['plate_number']),
            models.Index(fields=['customer']),
        ]

    def __str__(self):
        return f"{self.plate_number} - {self.make} {self.model} ({self.year})"


class Job(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('QC', 'Quality Check'),
        ('INVOICED', 'Invoiced'),
        ('PAID', 'Paid'),
        ('CLOSED', 'Closed'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name='jobs',
        null=True,
        blank=True,
        help_text='Optional for walk-in customers'
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        related_name='jobs',
        null=True,
        blank=True,
        help_text='Optional for unregistered vehicles'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    estimate_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    final_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_jobs'
    )
    assigned_technician = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_jobs',
        limit_choices_to={'role': 'TECHNICIAN'}
    )
    estimated_start_time = models.DateTimeField(null=True, blank=True)
    estimated_completion_time = models.DateTimeField(null=True, blank=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_completion_time = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'jobs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['job_number']),
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"Job {self.job_number} - {self.customer.name}"

    def get_duration_estimate_minutes(self):
        return sum(line.service_variant.service.duration_estimate_minutes
                  for line in self.lines.all())


class JobLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='lines'
    )
    service_variant = models.ForeignKey(
        'services.ServiceVariant',
        on_delete=models.PROTECT,
        related_name='job_lines'
    )
    assigned_employees = models.ManyToManyField(
        User,
        blank=True,
        related_name='assigned_job_lines',
        help_text='Employees assigned to perform this service'
    )
    quantity = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    notes = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'job_lines'
        ordering = ['job', 'created_at']

    def __str__(self):
        return f"{self.job.job_number} - {self.service_variant}"

    def save(self, *args, **kwargs):
        # Calculate discount amount
        subtotal = self.quantity * self.unit_price
        self.discount_amount = subtotal * (self.discount_percentage / 100)
        self.total_amount = subtotal - self.discount_amount
        super().save(*args, **kwargs)

    def is_price_below_floor(self):
        return self.unit_price < self.service_variant.floor_price


class JobLineInventory(models.Model):
    """Track inventory items consumed for each job line"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_line = models.ForeignKey(
        JobLine,
        on_delete=models.CASCADE,
        related_name='inventory_items'
    )
    sku = models.ForeignKey(
        'inventory.SKU',
        on_delete=models.PROTECT,
        related_name='job_line_usages'
    )
    quantity_used = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Actual quantity consumed from inventory'
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Unit cost from inventory at time of consumption'
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    stock_consumed = models.BooleanField(
        default=False,
        help_text='Whether inventory has been deducted from stock'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'job_line_inventory'
        ordering = ['job_line', 'sku__name']

    def __str__(self):
        return f"{self.job_line} - {self.sku.name} ({self.quantity_used})"

    def save(self, *args, **kwargs):
        self.total_cost = self.quantity_used * self.unit_cost
        super().save(*args, **kwargs)


class OverrideRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_line = models.ForeignKey(
        JobLine,
        on_delete=models.CASCADE,
        related_name='override_requests'
    )
    requested_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    floor_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='requested_overrides'
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_overrides'
    )
    review_notes = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'override_requests'
        ordering = ['-requested_at']

    def __str__(self):
        return f"Override Request for {self.job_line.job.job_number} - {self.status}"


class JobMedia(models.Model):
    MEDIA_TYPES = [
        ('BEFORE', 'Before Photo'),
        ('AFTER', 'After Photo'),
        ('PROCESS', 'Process Photo'),
        ('DAMAGE', 'Damage Photo'),
        ('DOCUMENT', 'Document'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='media'
    )
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES)
    file_url = models.URLField()
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text="File size in bytes")
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_media'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'job_media'
        ordering = ['job', 'media_type', 'created_at']

    def __str__(self):
        return f"{self.job.job_number} - {self.media_type} - {self.file_name}"


class Payment(models.Model):
    PAYMENT_METHODS = [
        ('CASH', 'Cash'),
        ('CARD', 'Card'),
        ('MOBILE_MONEY', 'Mobile Money'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CHEQUE', 'Cheque'),
        ('CREDIT', 'Credit'),
    ]

    PAYMENT_STATUS = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        Job,
        on_delete=models.PROTECT,
        related_name='payments'
    )
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    reference_number = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='COMPLETED')
    payment_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    received_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='received_payments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date']

    def __str__(self):
        return f"Payment {self.amount} for {self.job.job_number} - {self.payment_method}"


class JobConsumption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_line = models.ForeignKey(
        JobLine,
        on_delete=models.CASCADE,
        related_name='consumptions'
    )
    sku = models.ForeignKey(
        'inventory.SKU',
        on_delete=models.PROTECT,
        related_name='job_consumptions'
    )
    standard_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    actual_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    variance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    cost_per_unit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    reason_for_variance = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_consumptions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'job_consumptions'
        ordering = ['job_line', 'sku__name']

    def __str__(self):
        return f"{self.job_line.job.job_number} - {self.sku.name} - {self.actual_quantity}"

    def save(self, *args, **kwargs):
        self.variance = self.actual_quantity - self.standard_quantity
        self.total_cost = self.actual_quantity * self.cost_per_unit
        super().save(*args, **kwargs)


class Estimate(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    estimate_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name='estimates'
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        related_name='estimates'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    valid_until = models.DateField()
    notes = models.TextField(blank=True)
    terms_and_conditions = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_estimates'
    )
    job = models.OneToOneField(
        Job,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='estimate'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'estimates'
        ordering = ['-created_at']

    def __str__(self):
        return f"Estimate {self.estimate_number} - {self.customer.name}"


class EstimateLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    estimate = models.ForeignKey(
        Estimate,
        on_delete=models.CASCADE,
        related_name='lines'
    )
    service_variant = models.ForeignKey(
        'services.ServiceVariant',
        on_delete=models.PROTECT,
        related_name='estimate_lines'
    )
    quantity = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'estimate_lines'
        ordering = ['estimate', 'created_at']

    def __str__(self):
        return f"{self.estimate.estimate_number} - {self.service_variant}"

    def save(self, *args, **kwargs):
        self.total_amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class JobLineInventory(models.Model):
    """Tracks inventory items used in job line execution"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_line = models.ForeignKey(
        JobLine,
        on_delete=models.CASCADE,
        related_name='inventory_items'
    )
    sku = models.ForeignKey(
        'inventory.SKU',
        on_delete=models.PROTECT,
        related_name='job_line_usages'
    )
    quantity_used = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Actual quantity consumed from inventory'
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Unit cost from inventory at time of consumption'
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    stock_consumed = models.BooleanField(
        default=False,
        help_text='Whether inventory has been deducted from stock'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'job_line_inventory'
        ordering = ['job_line', 'sku__name']

    def __str__(self):
        return f"{self.job_line} - {self.sku.name} ({self.quantity_used})"

    def save(self, *args, **kwargs):
        self.total_cost = self.quantity_used * self.unit_cost
        super().save(*args, **kwargs)
class Invoice(models.Model):
    """Invoice generated from completed jobs"""
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True)
    job = models.OneToOneField(
        Job,
        on_delete=models.PROTECT,
        related_name='invoice'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    notes = models.TextField(blank=True)
    terms_and_conditions = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_invoices'
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['invoice_number']),
            models.Index(fields=['job']),
            models.Index(fields=['status', 'due_date']),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.job.job_number}"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Generate invoice number
            year = timezone.now().year
            count = Invoice.objects.filter(created_at__year=year).count() + 1
            self.invoice_number = f"INV-{year}-{count:04d}"

        # Calculate totals
        self.subtotal = self.job.final_total
        self.total_amount = self.subtotal + self.tax_amount - self.discount_amount

        # Set due date if not provided (30 days from issue date)
        if not self.due_date:
            from datetime import timedelta
            if hasattr(self, 'issue_date') and self.issue_date:
                self.due_date = self.issue_date + timedelta(days=30)
            else:
                self.due_date = timezone.now().date() + timedelta(days=30)

        super().save(*args, **kwargs)


class Receipt(models.Model):
    """Receipt generated after payment completion"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt_number = models.CharField(max_length=50, unique=True)
    job = models.ForeignKey(
        Job,
        on_delete=models.PROTECT,
        related_name='receipts'
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        related_name='receipts',
        null=True,
        blank=True
    )
    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name='receipts'
    )
    amount_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    payment_method = models.CharField(max_length=20, choices=Payment.PAYMENT_METHODS)
    payment_reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    issued_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='issued_receipts'
    )
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'receipts'
        ordering = ['-issued_at']
        indexes = [
            models.Index(fields=['receipt_number']),
            models.Index(fields=['job']),
            models.Index(fields=['payment']),
        ]

    def __str__(self):
        return f"Receipt {self.receipt_number} - {self.job.job_number}"

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            # Generate receipt number
            year = timezone.now().year
            count = Receipt.objects.filter(issued_at__year=year).count() + 1
            self.receipt_number = f"RCP-{year}-{count:04d}"

        # Auto-fill payment details
        if self.payment:
            self.amount_paid = self.payment.amount
            self.payment_method = self.payment.payment_method
            self.payment_reference = self.payment.reference_number

        super().save(*args, **kwargs)


class EmployeeCommissionRate(models.Model):
    """Store commission rates for employees per service variant"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='commission_rates',
        help_text='Employee who will receive commission'
    )
    service_variant = models.ForeignKey(
        'services.ServiceVariant',
        on_delete=models.CASCADE,
        related_name='commission_rates',
        null=True,
        blank=True,
        help_text='Service variant for this rate. Null means default rate for all services.'
    )
    commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text='Commission percentage (0-100)'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employee_commission_rates'
        ordering = ['employee', 'service_variant']
        unique_together = [['employee', 'service_variant']]
        indexes = [
            models.Index(fields=['employee', 'is_active']),
            models.Index(fields=['service_variant', 'is_active']),
        ]

    def __str__(self):
        service_name = self.service_variant.name if self.service_variant else 'Default'
        return f"{self.employee.get_full_name()} - {service_name} ({self.commission_percentage}%)"


class Commission(models.Model):
    """Track employee commissions for job lines"""
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('PAYABLE', 'Payable'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='commissions',
        help_text='Employee earning this commission'
    )
    job = models.ForeignKey(
        Job,
        on_delete=models.PROTECT,
        related_name='commissions',
        help_text='Job associated with this commission'
    )
    job_line = models.ForeignKey(
        JobLine,
        on_delete=models.PROTECT,
        related_name='commissions',
        help_text='Specific job line this commission is for'
    )
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text='Commission rate used for calculation'
    )
    service_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Service line amount used for commission calculation'
    )
    commission_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Calculated commission amount'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='AVAILABLE',
        help_text='Commission status in workflow'
    )
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When commission was paid to employee'
    )
    paid_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='paid_commissions',
        help_text='User who processed commission payment'
    )
    payment_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text='Reference for commission payment'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'commissions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['job', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.employee.get_full_name()} - {self.job.job_number} - {self.commission_amount} ({self.status})"

    def save(self, *args, **kwargs):
        # Auto-calculate commission amount
        self.commission_amount = (self.service_amount * self.commission_rate) / 100
        super().save(*args, **kwargs)


class Tip(models.Model):
    """Track tips given to employees from customers"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        Job,
        on_delete=models.PROTECT,
        related_name='tips',
        help_text='Job where tip was received'
    )
    employee = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='tips_received',
        help_text='Employee receiving the tip'
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Tip amount'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        help_text='Payment status of the tip'
    )
    payment_method = models.CharField(
        max_length=20,
        choices=Payment.PAYMENT_METHODS,
        blank=True,
        help_text='Method used to pay the tip to employee'
    )
    payment_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text='Payment reference number'
    )
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When tip was paid to employee'
    )
    paid_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='paid_tips',
        help_text='User who processed tip payment'
    )
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='recorded_tips',
        help_text='User who recorded the tip'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tips'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['job', 'employee']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"Tip for {self.employee.get_full_name()} - {self.amount} ({self.status})"


class AdvancePayment(models.Model):
    """Track advance payments against pending commissions"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('PAID', 'Paid'),
        ('RECOVERED', 'Recovered'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='advance_payments',
        help_text='Employee requesting advance'
    )
    requested_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Amount requested as advance'
    )
    approved_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Actual amount approved (may differ from requested)'
    )
    available_commission = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Available commission balance at time of request'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        help_text='Advance payment status'
    )
    payment_method = models.CharField(
        max_length=20,
        choices=Payment.PAYMENT_METHODS,
        blank=True,
        help_text='Payment method used'
    )
    payment_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text='Payment reference number'
    )
    reason = models.TextField(
        help_text='Reason for requesting advance'
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_advances',
        help_text='Manager who reviewed the request'
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    paid_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='paid_advances',
        help_text='User who processed payment'
    )
    review_notes = models.TextField(blank=True)
    payment_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'advance_payments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['status', 'requested_at']),
        ]

    def __str__(self):
        return f"Advance for {self.employee.get_full_name()} - {self.requested_amount} ({self.status})"

    def clean(self):
        from django.core.exceptions import ValidationError
        # Validate that requested amount doesn't exceed available commission
        if self.requested_amount > self.available_commission:
            raise ValidationError(
                f"Requested amount ({self.requested_amount}) cannot exceed available commission ({self.available_commission})"
            )
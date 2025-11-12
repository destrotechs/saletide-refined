from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid


class ExpenseCategory(models.Model):
    """Categories for organizing expenses"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expense_categories'
        ordering = ['name']
        verbose_name_plural = 'Expense Categories'

    def __str__(self):
        return self.name


class Expense(models.Model):
    """Expense tracking for business operations"""

    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('MPESA', 'M-Pesa'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CHEQUE', 'Cheque'),
        ('CARD', 'Card'),
        ('OTHER', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expense_number = models.CharField(max_length=50, unique=True, editable=False)

    # Basic Information
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name='expenses'
    )
    description = models.TextField()
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )

    # Date tracking
    expense_date = models.DateField()

    # Payment Information
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='CASH'
    )
    reference_number = models.CharField(max_length=100, blank=True)

    # Relationships
    recorded_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.PROTECT,
        related_name='recorded_expenses'
    )

    # Job relationship (optional - for job-related expenses)
    job = models.ForeignKey(
        'sales.Job',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses'
    )

    # Notes and attachments
    notes = models.TextField(blank=True)
    receipt_url = models.URLField(max_length=500, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-expense_date', '-created_at']
        indexes = [
            models.Index(fields=['expense_number']),
            models.Index(fields=['expense_date']),
            models.Index(fields=['recorded_by']),
        ]

    def __str__(self):
        return f"{self.expense_number} - {self.description[:50]}"

    def save(self, *args, **kwargs):
        if not self.expense_number:
            # Generate expense number
            from django.utils import timezone
            today = timezone.now()
            prefix = f"EXP-{today.strftime('%Y%m')}"

            # Get the last expense number for this month
            last_expense = Expense.objects.filter(
                expense_number__startswith=prefix
            ).order_by('-expense_number').first()

            if last_expense:
                last_number = int(last_expense.expense_number.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1

            self.expense_number = f"{prefix}-{new_number:04d}"

        super().save(*args, **kwargs)

from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

class AccountCategory(models.Model):
    ACCOUNT_TYPES = [
        ('ASSET', 'Asset'),
        ('LIABILITY', 'Liability'),
        ('EQUITY', 'Equity'),
        ('REVENUE', 'Revenue'),
        ('EXPENSE', 'Expense'),
    ]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']
        verbose_name_plural = 'Account Categories'

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def total_balance(self):
        return self.accounts.filter(is_active=True).aggregate(
            total=models.Sum('balance')
        )['total'] or Decimal('0.00')


class Account(models.Model):
    ACCOUNT_TYPES = [
        ('ASSET', 'Asset'),
        ('LIABILITY', 'Liability'),
        ('EQUITY', 'Equity'),
        ('REVENUE', 'Revenue'),
        ('EXPENSE', 'Expense'),
    ]

    ACCOUNT_SUBTYPES = [
        # Assets
        ('CURRENT_ASSET', 'Current Asset'),
        ('FIXED_ASSET', 'Fixed Asset'),
        ('INTANGIBLE_ASSET', 'Intangible Asset'),

        # Liabilities
        ('CURRENT_LIABILITY', 'Current Liability'),
        ('LONG_TERM_LIABILITY', 'Long-term Liability'),

        # Equity
        ('CAPITAL', 'Capital'),
        ('RETAINED_EARNINGS', 'Retained Earnings'),

        # Revenue
        ('OPERATING_REVENUE', 'Operating Revenue'),
        ('NON_OPERATING_REVENUE', 'Non-operating Revenue'),

        # Expenses
        ('COST_OF_SALES', 'Cost of Sales'),
        ('OPERATING_EXPENSE', 'Operating Expense'),
        ('ADMINISTRATIVE_EXPENSE', 'Administrative Expense'),
        ('NON_OPERATING_EXPENSE', 'Non-operating Expense'),
    ]

    category = models.ForeignKey(AccountCategory, on_delete=models.CASCADE, related_name='accounts')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    account_subtype = models.CharField(max_length=30, choices=ACCOUNT_SUBTYPES)
    parent_account = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='sub_accounts')
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    debit_balance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    credit_balance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

    def update_balance(self):
        """Update balance based on account type"""
        if self.account_type in ['ASSET', 'EXPENSE']:
            self.balance = self.debit_balance - self.credit_balance
        else:  # LIABILITY, EQUITY, REVENUE
            self.balance = self.credit_balance - self.debit_balance
        self.save()


class JournalEntry(models.Model):
    ENTRY_TYPES = [
        ('MANUAL', 'Manual Entry'),
        ('AUTO', 'Automatic Entry'),
        ('SALE', 'Sale Transaction'),
        ('PURCHASE', 'Purchase Transaction'),
        ('DEPRECIATION', 'Depreciation Entry'),
        ('DISPOSAL', 'Asset Disposal'),
        ('ADJUSTMENT', 'Adjustment Entry'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('POSTED', 'Posted'),
        ('REVERSED', 'Reversed'),
    ]

    entry_number = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    description = models.TextField()
    reference = models.CharField(max_length=100, blank=True)
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPES, default='MANUAL')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')

    # For tracking source of automatic entries
    source_model = models.CharField(max_length=100, blank=True)
    source_id = models.CharField(max_length=100, blank=True)

    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name_plural = 'Journal Entries'

    def __str__(self):
        return f"JE-{self.entry_number} - {self.date}"

    def save(self, *args, **kwargs):
        if not self.entry_number:
            # Generate entry number
            last_entry = JournalEntry.objects.filter(
                date__year=self.date.year
            ).order_by('-entry_number').first()

            if last_entry and last_entry.entry_number:
                try:
                    last_num = int(last_entry.entry_number.split('-')[-1])
                    self.entry_number = f"{self.date.year}-{last_num + 1:06d}"
                except (ValueError, IndexError):
                    self.entry_number = f"{self.date.year}-000001"
            else:
                self.entry_number = f"{self.date.year}-000001"

        super().save(*args, **kwargs)

    def post(self):
        """Post the journal entry and update account balances"""
        if self.status != 'DRAFT':
            raise ValueError("Only draft entries can be posted")

        # Validate that debits equal credits
        total_debits = sum(line.debit_amount for line in self.lines.all())
        total_credits = sum(line.credit_amount for line in self.lines.all())

        if total_debits != total_credits:
            raise ValueError("Debits must equal credits")

        # Update account balances
        for line in self.lines.all():
            account = line.account
            account.debit_balance += line.debit_amount
            account.credit_balance += line.credit_amount
            account.update_balance()

        # Mark as posted
        self.status = 'POSTED'
        self.save()

    def reverse(self):
        """Reverse the journal entry"""
        if self.status != 'POSTED':
            raise ValueError("Only posted entries can be reversed")

        # Reverse account balances
        for line in self.lines.all():
            account = line.account
            account.debit_balance -= line.debit_amount
            account.credit_balance -= line.credit_amount
            account.update_balance()

        # Mark as reversed
        self.status = 'REVERSED'
        self.save()


class JournalEntryLine(models.Model):
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(Account, on_delete=models.PROTECT)
    description = models.CharField(max_length=255, blank=True)
    debit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    credit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.journal_entry.entry_number} - {self.account.code}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update account balances
        account = self.account
        account.debit_balance += self.debit_amount
        account.credit_balance += self.credit_amount
        account.update_balance()


class FinancialPeriod(models.Model):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.name} ({self.start_date} - {self.end_date})"


class Budget(models.Model):
    name = models.CharField(max_length=100)
    period = models.ForeignKey(FinancialPeriod, on_delete=models.CASCADE)
    account = models.ForeignKey(Account, on_delete=models.CASCADE)
    budgeted_amount = models.DecimalField(max_digits=15, decimal_places=2)
    actual_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    variance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['period', 'account']

    def __str__(self):
        return f"{self.name} - {self.account.name}"

    def calculate_variance(self):
        """Calculate budget variance"""
        self.variance = self.actual_amount - self.budgeted_amount
        self.save()

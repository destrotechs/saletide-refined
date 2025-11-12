from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta
import uuid


class AssetCategory(models.Model):
    """Categories for different types of assets"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    useful_life_years = models.IntegerField(
        help_text="Default useful life in years for assets in this category"
    )
    depreciation_method = models.CharField(
        max_length=20,
        choices=[
            ('STRAIGHT_LINE', 'Straight Line'),
            ('DECLINING_BALANCE', 'Declining Balance'),
            ('DOUBLE_DECLINING', 'Double Declining Balance'),
            ('UNITS_OF_PRODUCTION', 'Units of Production'),
        ],
        default='STRAIGHT_LINE'
    )
    # Chart of accounts integration
    asset_account = models.CharField(max_length=50, help_text="Asset account code")
    depreciation_account = models.CharField(max_length=50, help_text="Accumulated depreciation account code")
    expense_account = models.CharField(max_length=50, help_text="Depreciation expense account code")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Asset Categories"
        ordering = ['name']

    def __str__(self):
        return f"{self.code} - {self.name}"


class Asset(models.Model):
    """Fixed assets with depreciation tracking"""
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('DISPOSED', 'Disposed'),
        ('SOLD', 'Sold'),
        ('LOST', 'Lost'),
        ('STOLEN', 'Stolen'),
    ]

    CONDITION_CHOICES = [
        ('EXCELLENT', 'Excellent'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('POOR', 'Poor'),
        ('NEEDS_REPAIR', 'Needs Repair'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset_number = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(AssetCategory, on_delete=models.PROTECT, related_name='assets')

    # Financial Information
    purchase_cost = models.DecimalField(max_digits=15, decimal_places=2)
    purchase_date = models.DateField()
    salvage_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    useful_life_years = models.IntegerField()
    depreciation_method = models.CharField(
        max_length=20,
        choices=AssetCategory.depreciation_method.field.choices,
        blank=True,
        help_text="Leave blank to use category default"
    )

    # Current Values (calculated fields)
    accumulated_depreciation = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    current_book_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    last_depreciation_date = models.DateField(null=True, blank=True)

    # Physical Information
    serial_number = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=200, blank=True)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='GOOD')

    # Ownership and Management
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    department = models.CharField(max_length=100, blank=True)

    # Disposal Information
    disposal_date = models.DateField(null=True, blank=True)
    disposal_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    disposal_method = models.CharField(
        max_length=20,
        choices=[
            ('SALE', 'Sale'),
            ('TRADE', 'Trade-in'),
            ('DONATION', 'Donation'),
            ('SCRAP', 'Scrap'),
            ('LOSS', 'Loss/Theft'),
        ],
        blank=True
    )

    # Maintenance and Insurance
    warranty_expiry = models.DateField(null=True, blank=True)
    insurance_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    next_maintenance_date = models.DateField(null=True, blank=True)

    # Additional Information
    notes = models.TextField(blank=True)
    tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags")

    # Audit fields
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='assets_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.asset_number} - {self.name}"

    @property
    def age_in_years(self):
        """Calculate asset age in years"""
        today = date.today()
        return (today - self.purchase_date).days / 365.25

    @property
    def depreciation_rate(self):
        """Calculate annual depreciation rate"""
        if self.useful_life_years <= 0:
            return Decimal('0')

        method = self.depreciation_method or self.category.depreciation_method

        if method == 'STRAIGHT_LINE':
            return Decimal('1') / Decimal(str(self.useful_life_years))
        elif method == 'DOUBLE_DECLINING':
            return (Decimal('2') / Decimal(str(self.useful_life_years)))
        elif method == 'DECLINING_BALANCE':
            return Decimal('1.5') / Decimal(str(self.useful_life_years))
        else:
            return Decimal('1') / Decimal(str(self.useful_life_years))

    @property
    def monthly_depreciation(self):
        """Calculate monthly depreciation amount"""
        return self.annual_depreciation / 12

    @property
    def annual_depreciation(self):
        """Calculate annual depreciation amount"""
        if self.status in ['DISPOSED', 'SOLD']:
            return Decimal('0')

        method = self.depreciation_method or self.category.depreciation_method
        depreciable_amount = self.purchase_cost - self.salvage_value

        if method == 'STRAIGHT_LINE':
            return depreciable_amount / Decimal(str(self.useful_life_years))
        elif method in ['DECLINING_BALANCE', 'DOUBLE_DECLINING']:
            # Calculate based on remaining book value
            remaining_value = self.current_book_value - self.salvage_value
            if remaining_value <= 0:
                return Decimal('0')
            return remaining_value * self.depreciation_rate
        else:
            return depreciable_amount / Decimal(str(self.useful_life_years))

    def calculate_current_values(self):
        """Calculate and update current book value and accumulated depreciation"""
        if self.status in ['DISPOSED', 'SOLD']:
            return

        today = date.today()
        if self.purchase_date > today:
            return

        # Calculate total months since purchase
        months_owned = ((today.year - self.purchase_date.year) * 12 +
                       (today.month - self.purchase_date.month))

        if months_owned <= 0:
            self.accumulated_depreciation = Decimal('0')
            self.current_book_value = self.purchase_cost
            return

        method = self.depreciation_method or self.category.depreciation_method
        depreciable_amount = self.purchase_cost - self.salvage_value

        if method == 'STRAIGHT_LINE':
            # Straight line: equal amounts each period
            total_depreciation = (depreciable_amount * Decimal(str(months_owned))) / (Decimal(str(self.useful_life_years)) * 12)

        elif method == 'DOUBLE_DECLINING':
            # Double declining balance
            annual_rate = self.depreciation_rate
            remaining_value = self.purchase_cost
            total_depreciation = Decimal('0')

            for year in range(int(months_owned // 12) + 1):
                if remaining_value <= self.salvage_value:
                    break

                year_depreciation = remaining_value * annual_rate
                # Don't depreciate below salvage value
                if remaining_value - year_depreciation < self.salvage_value:
                    year_depreciation = remaining_value - self.salvage_value

                if year == int(months_owned // 12):
                    # Partial year
                    partial_months = months_owned % 12
                    year_depreciation = year_depreciation * (Decimal(str(partial_months)) / 12)

                total_depreciation += year_depreciation
                remaining_value -= year_depreciation

        else:
            # Default to straight line
            total_depreciation = (depreciable_amount * Decimal(str(months_owned))) / (Decimal(str(self.useful_life_years)) * 12)

        # Ensure we don't depreciate below salvage value
        max_depreciation = self.purchase_cost - self.salvage_value
        total_depreciation = min(total_depreciation, max_depreciation)

        self.accumulated_depreciation = total_depreciation.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.current_book_value = (self.purchase_cost - self.accumulated_depreciation).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def save(self, *args, **kwargs):
        # Check if this is a new asset
        is_new_asset = self.pk is None

        # Auto-generate asset number if not provided
        if not self.asset_number:
            self.asset_number = self.generate_asset_number()

        # Use category defaults if not specified
        if not self.depreciation_method:
            self.depreciation_method = self.category.depreciation_method

        # Calculate current values
        self.calculate_current_values()

        super().save(*args, **kwargs)

        # Create purchase journal entry for new assets
        if is_new_asset and self.purchase_cost and self.purchase_cost > 0:
            try:
                self.create_purchase_journal_entry()
            except Exception as e:
                print(f"Warning: Could not create purchase journal entry for {self.asset_number}: {e}")
                # Don't fail the save operation for journal entry issues

    def generate_asset_number(self):
        """Generate unique asset number"""
        prefix = self.category.code if self.category else 'AST'
        year = timezone.now().year

        # Find the next number for this category and year
        existing_assets = Asset.objects.filter(
            asset_number__startswith=f"{prefix}-{year}-"
        ).count()

        next_number = existing_assets + 1
        return f"{prefix}-{year}-{next_number:04d}"

    def get_age_in_months(self):
        """Get asset age in months"""
        today = date.today()
        return ((today.year - self.purchase_date.year) * 12 +
                (today.month - self.purchase_date.month))

    def calculate_current_depreciation(self):
        """Calculate current month's depreciation amount"""
        if self.status in ['DISPOSED', 'SOLD']:
            return Decimal('0')

        # Check if depreciation was already calculated this month
        current_month = timezone.now().month
        current_year = timezone.now().year

        existing_entry = self.depreciation_entries.filter(
            period_month=current_month,
            period_year=current_year
        ).first()

        if existing_entry:
            return Decimal('0')  # Already calculated this month

        return self.monthly_depreciation

    def update_current_book_value(self):
        """Update current book value based on accumulated depreciation"""
        old_book_value = self.current_book_value
        self.calculate_current_values()
        self.save(update_fields=['current_book_value', 'accumulated_depreciation'])
        return old_book_value != self.current_book_value

    def generate_depreciation_schedule(self):
        """Generate complete depreciation schedule for the asset's lifetime"""
        schedule = []

        if self.status in ['DISPOSED', 'SOLD']:
            return schedule

        start_date = self.purchase_date
        method = self.depreciation_method or self.category.depreciation_method

        remaining_value = self.purchase_cost
        accumulated_dep = Decimal('0')

        for month in range(self.useful_life_years * 12):
            if remaining_value <= self.salvage_value:
                break

            period_date = start_date + timedelta(days=30 * month)

            if method == 'STRAIGHT_LINE':
                monthly_dep = self.monthly_depreciation
            elif method in ['DECLINING_BALANCE', 'DOUBLE_DECLINING']:
                annual_dep = remaining_value * self.depreciation_rate
                monthly_dep = annual_dep / 12
            else:
                monthly_dep = self.monthly_depreciation

            # Ensure we don't depreciate below salvage value
            if remaining_value - monthly_dep < self.salvage_value:
                monthly_dep = remaining_value - self.salvage_value

            if monthly_dep <= 0:
                break

            accumulated_dep += monthly_dep
            remaining_value -= monthly_dep

            schedule.append({
                'period': f"{period_date.year}-{period_date.month:02d}",
                'date': period_date.strftime('%Y-%m-%d'),
                'depreciation_amount': str(monthly_dep.quantize(Decimal('0.01'))),
                'accumulated_depreciation': str(accumulated_dep.quantize(Decimal('0.01'))),
                'book_value': str(remaining_value.quantize(Decimal('0.01')))
            })

        return schedule

    def create_disposal_entry(self, disposal_date, disposal_amount, disposal_method):
        """Create disposal entry and calculate gain/loss"""
        from accounting.models import JournalEntry, JournalEntryLine, Account
        from django.db import transaction

        # Update asset status
        self.status = 'DISPOSED'
        self.disposal_date = disposal_date
        self.disposal_amount = disposal_amount
        self.disposal_method = disposal_method

        # Calculate gain/loss on disposal
        book_value_at_disposal = self.current_book_value
        gain_loss = disposal_amount - book_value_at_disposal

        self.save()

        # Create journal entry for disposal
        try:
            with transaction.atomic():
                journal_entry = JournalEntry.objects.create(
                    entry_number=f"DISP-{self.asset_number}-{disposal_date.strftime('%Y%m%d')}",
                    date=disposal_date,
                    description=f"Disposal of {self.name}",
                    reference=f"Asset: {self.asset_number}",
                    entry_type='DISPOSAL',
                    source_model='assets.Asset',
                    source_id=str(self.id),
                    total_amount=disposal_amount,
                    status='POSTED'
                )

                # Get accounts
                cash_account = Account.objects.get(code='1000')  # Cash account
                asset_account = Account.objects.get(code=self.category.asset_account)
                accum_dep_account = Account.objects.get(code=self.category.depreciation_account)

                # Debit cash (disposal proceeds)
                if disposal_amount > 0:
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=cash_account,
                        description=f"Cash from disposal of {self.name}",
                        debit_amount=disposal_amount,
                        credit_amount=Decimal('0')
                    )

                # Debit accumulated depreciation
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=accum_dep_account,
                    description=f"Remove accumulated depreciation - {self.name}",
                    debit_amount=self.accumulated_depreciation,
                    credit_amount=Decimal('0')
                )

                # Credit asset (remove from books)
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=asset_account,
                    description=f"Remove asset - {self.name}",
                    debit_amount=Decimal('0'),
                    credit_amount=self.purchase_cost
                )

                # Handle gain/loss
                if gain_loss != 0:
                    gain_loss_account, _ = Account.objects.get_or_create(
                        code='8500',
                        defaults={
                            'name': 'Gain/Loss on Asset Disposal',
                            'account_type': 'REVENUE' if gain_loss > 0 else 'EXPENSE',
                            'is_active': True
                        }
                    )

                    if gain_loss > 0:  # Gain
                        JournalEntryLine.objects.create(
                            journal_entry=journal_entry,
                            account=gain_loss_account,
                            description=f"Gain on disposal of {self.name}",
                            debit_amount=Decimal('0'),
                            credit_amount=abs(gain_loss)
                        )
                    else:  # Loss
                        JournalEntryLine.objects.create(
                            journal_entry=journal_entry,
                            account=gain_loss_account,
                            description=f"Loss on disposal of {self.name}",
                            debit_amount=abs(gain_loss),
                            credit_amount=Decimal('0')
                        )

                return {
                    'journal_entry_id': journal_entry.id,
                    'book_value': book_value_at_disposal,
                    'disposal_amount': disposal_amount,
                    'gain_loss': gain_loss
                }

        except Exception as e:
            # Rollback asset changes if journal entry fails
            self.status = 'ACTIVE'
            self.disposal_date = None
            self.disposal_amount = None
            self.disposal_method = ''
            self.save()
            raise e

    def create_purchase_journal_entry(self):
        """Create journal entry for initial asset purchase"""
        from accounting.models import JournalEntry, JournalEntryLine, Account
        from django.db import transaction

        # Check if entry already exists
        existing_entry = JournalEntry.objects.filter(
            source_model='assets.Asset',
            source_id=str(self.id),
            entry_type='PURCHASE'
        ).first()

        if existing_entry:
            return existing_entry.id

        try:
            with transaction.atomic():
                journal_entry = JournalEntry.objects.create(
                    entry_number=f"PURCH-{self.asset_number}",
                    date=self.purchase_date,
                    description=f"Purchase of {self.name}",
                    reference=f"Asset: {self.asset_number}",
                    entry_type='PURCHASE',
                    source_model='assets.Asset',
                    source_id=str(self.id),
                    total_amount=self.purchase_cost,
                    status='POSTED'
                )

                # Get or create asset account based on category
                asset_account_code = getattr(self.category, 'asset_account', None)
                if not asset_account_code:
                    # Default asset account based on category name
                    if 'vehicle' in self.category.name.lower():
                        asset_account_code = '1600'  # Vehicles
                    elif 'equipment' in self.category.name.lower():
                        asset_account_code = '1500'  # Equipment
                    else:
                        asset_account_code = '1500'  # Default to Equipment

                from accounting.models import AccountCategory

                asset_category = AccountCategory.objects.get(code='1000')  # Assets category

                asset_account, _ = Account.objects.get_or_create(
                    code=asset_account_code,
                    defaults={
                        'name': f'{self.category.name}',
                        'account_type': 'ASSET',
                        'account_subtype': '',
                        'balance': Decimal('0'),
                        'debit_balance': Decimal('0'),
                        'credit_balance': Decimal('0'),
                        'category': asset_category,
                        'is_active': True
                    }
                )

                # Debit: Asset (increase)
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=asset_account,
                    description=f"Purchase of {self.name}",
                    debit_amount=self.purchase_cost,
                    credit_amount=Decimal('0')
                )

                # Credit: Cash (decrease) - assuming cash purchase
                # In production, this could be Accounts Payable for credit purchases
                cash_account, _ = Account.objects.get_or_create(
                    code='1000',
                    defaults={
                        'name': 'Cash',
                        'account_type': 'ASSET',
                        'account_subtype': '',
                        'balance': Decimal('0'),
                        'debit_balance': Decimal('0'),
                        'credit_balance': Decimal('0'),
                        'category': asset_category,
                        'is_active': True
                    }
                )

                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=cash_account,
                    description=f"Payment for {self.name}",
                    debit_amount=Decimal('0'),
                    credit_amount=self.purchase_cost
                )

                return journal_entry.id

        except Exception as e:
            print(f"Error creating purchase journal entry: {e}")
            return None

    def create_depreciation_journal_entry(self, depreciation_amount, period_date):
        """Create journal entry for monthly depreciation"""
        from accounting.models import JournalEntry, JournalEntryLine, Account
        from django.db import transaction

        # Check if entry already exists for this period
        entry_number = f"DEP-{self.asset_number}-{period_date.strftime('%Y%m')}"
        existing_entry = JournalEntry.objects.filter(entry_number=entry_number).first()

        if existing_entry:
            return existing_entry.id

        if depreciation_amount <= 0:
            return None

        try:
            with transaction.atomic():
                journal_entry = JournalEntry.objects.create(
                    entry_number=entry_number,
                    date=period_date,
                    description=f"Monthly depreciation - {self.name}",
                    reference=f"Asset: {self.asset_number}",
                    entry_type='DEPRECIATION',
                    source_model='assets.Asset',
                    source_id=str(self.id),
                    total_amount=depreciation_amount,
                    status='POSTED'
                )

                from accounting.models import AccountCategory

                # Get expense category
                expense_category = AccountCategory.objects.get(code='5000')  # Expenses category

                # Get depreciation expense account
                dep_expense_account, _ = Account.objects.get_or_create(
                    code='6200',
                    defaults={
                        'name': 'Depreciation Expense',
                        'account_type': 'EXPENSE',
                        'account_subtype': '',
                        'balance': Decimal('0'),
                        'debit_balance': Decimal('0'),
                        'credit_balance': Decimal('0'),
                        'category': expense_category,
                        'is_active': True
                    }
                )

                # Get accumulated depreciation account
                accum_dep_code = getattr(self.category, 'depreciation_account', None)
                if not accum_dep_code:
                    # Default based on asset type
                    if 'vehicle' in self.category.name.lower():
                        accum_dep_code = '1610'
                    elif 'equipment' in self.category.name.lower():
                        accum_dep_code = '1510'
                    else:
                        accum_dep_code = '1510'

                # Get assets category for contra-asset account
                asset_category = AccountCategory.objects.get(code='1000')  # Assets category

                accum_dep_account, _ = Account.objects.get_or_create(
                    code=accum_dep_code,
                    defaults={
                        'name': f'Accumulated Depreciation - {self.category.name}',
                        'account_type': 'ASSET',
                        'account_subtype': '',
                        'balance': Decimal('0'),
                        'debit_balance': Decimal('0'),
                        'credit_balance': Decimal('0'),
                        'category': asset_category,
                        'is_active': True
                    }
                )

                # Debit: Depreciation Expense (increase expense)
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=dep_expense_account,
                    description=f"Monthly depreciation - {self.name}",
                    debit_amount=depreciation_amount,
                    credit_amount=Decimal('0')
                )

                # Credit: Accumulated Depreciation (increase contra-asset)
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=accum_dep_account,
                    description=f"Accumulated depreciation - {self.name}",
                    debit_amount=Decimal('0'),
                    credit_amount=depreciation_amount
                )

                return journal_entry.id

        except Exception as e:
            print(f"Error creating depreciation journal entry: {e}")
            return None


class AssetDepreciation(models.Model):
    """Monthly depreciation entries for assets"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='depreciation_entries')
    depreciation_date = models.DateField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    method = models.CharField(max_length=20)
    calculation_details = models.JSONField(default=dict, blank=True)

    # Legacy fields for compatibility
    period_month = models.IntegerField(blank=True, null=True)
    period_year = models.IntegerField(blank=True, null=True)
    accumulated_depreciation = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    book_value = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)

    # Accounting integration
    journal_entry_created = models.BooleanField(default=False)
    journal_entry_id = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-depreciation_date']

    def save(self, *args, **kwargs):
        # Auto-populate period fields from depreciation_date
        if self.depreciation_date:
            self.period_month = self.depreciation_date.month
            self.period_year = self.depreciation_date.year

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.asset.asset_number} - {self.depreciation_date}"


class AssetMaintenance(models.Model):
    """Maintenance records for assets"""
    MAINTENANCE_TYPES = [
        ('PREVENTIVE', 'Preventive Maintenance'),
        ('CORRECTIVE', 'Corrective Maintenance'),
        ('EMERGENCY', 'Emergency Repair'),
        ('UPGRADE', 'Upgrade'),
        ('INSPECTION', 'Inspection'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_type = models.CharField(max_length=20, choices=MAINTENANCE_TYPES)
    description = models.TextField()
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    service_date = models.DateField()
    service_provider = models.CharField(max_length=200, blank=True)
    next_service_date = models.DateField(null=True, blank=True)

    # Parts and labor
    parts_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    labor_hours = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    notes = models.TextField(blank=True)

    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-service_date']

    def __str__(self):
        return f"{self.asset.asset_number} - {self.maintenance_type} - {self.service_date}"


class AssetTransfer(models.Model):
    """Asset location/ownership transfer records"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='transfers')
    transfer_date = models.DateField()

    from_location = models.CharField(max_length=200, blank=True)
    to_location = models.CharField(max_length=200)
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='asset_transfers_from')
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='asset_transfers_to')

    reason = models.CharField(max_length=500)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='transfers_created')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-transfer_date']

    def __str__(self):
        return f"{self.asset.asset_number} - {self.transfer_date}"
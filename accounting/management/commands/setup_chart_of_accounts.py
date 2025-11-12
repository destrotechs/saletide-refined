from django.core.management.base import BaseCommand
from django.db import transaction
from accounting.models import AccountCategory, Account
from decimal import Decimal


class Command(BaseCommand):
    help = 'Setup default chart of accounts for asset management'

    def handle(self, *args, **options):
        self.stdout.write('Setting up chart of accounts...')

        with transaction.atomic():
            # Create account categories
            asset_category, _ = AccountCategory.objects.get_or_create(
                code='1000',
                defaults={
                    'name': 'Assets',
                    'account_type': 'ASSET',
                    'description': 'All company assets'
                }
            )

            liability_category, _ = AccountCategory.objects.get_or_create(
                code='2000',
                defaults={
                    'name': 'Liabilities',
                    'account_type': 'LIABILITY',
                    'description': 'All company liabilities'
                }
            )

            equity_category, _ = AccountCategory.objects.get_or_create(
                code='3000',
                defaults={
                    'name': 'Equity',
                    'account_type': 'EQUITY',
                    'description': 'Owner equity accounts'
                }
            )

            revenue_category, _ = AccountCategory.objects.get_or_create(
                code='4000',
                defaults={
                    'name': 'Revenue',
                    'account_type': 'REVENUE',
                    'description': 'Revenue accounts'
                }
            )

            expense_category, _ = AccountCategory.objects.get_or_create(
                code='5000',
                defaults={
                    'name': 'Expenses',
                    'account_type': 'EXPENSE',
                    'description': 'Operating expense accounts'
                }
            )

            # Create asset accounts
            accounts_data = [
                # Current Assets
                {
                    'category': asset_category,
                    'code': '1000',
                    'name': 'Cash',
                    'account_type': 'ASSET',
                    'account_subtype': 'CURRENT_ASSET',
                    'description': 'Cash on hand and in bank accounts'
                },
                {
                    'category': asset_category,
                    'code': '1100',
                    'name': 'Accounts Receivable',
                    'account_type': 'ASSET',
                    'account_subtype': 'CURRENT_ASSET',
                    'description': 'Money owed by customers'
                },
                {
                    'category': asset_category,
                    'code': '1200',
                    'name': 'Inventory',
                    'account_type': 'ASSET',
                    'account_subtype': 'CURRENT_ASSET',
                    'description': 'Inventory and parts'
                },

                # Fixed Assets
                {
                    'category': asset_category,
                    'code': '1500',
                    'name': 'Equipment',
                    'account_type': 'ASSET',
                    'account_subtype': 'FIXED_ASSET',
                    'description': 'Shop equipment and tools'
                },
                {
                    'category': asset_category,
                    'code': '1510',
                    'name': 'Accumulated Depreciation - Equipment',
                    'account_type': 'ASSET',
                    'account_subtype': 'FIXED_ASSET',
                    'description': 'Accumulated depreciation on equipment'
                },
                {
                    'category': asset_category,
                    'code': '1600',
                    'name': 'Vehicles',
                    'account_type': 'ASSET',
                    'account_subtype': 'FIXED_ASSET',
                    'description': 'Company vehicles'
                },
                {
                    'category': asset_category,
                    'code': '1610',
                    'name': 'Accumulated Depreciation - Vehicles',
                    'account_type': 'ASSET',
                    'account_subtype': 'FIXED_ASSET',
                    'description': 'Accumulated depreciation on vehicles'
                },
                {
                    'category': asset_category,
                    'code': '1700',
                    'name': 'Building',
                    'account_type': 'ASSET',
                    'account_subtype': 'FIXED_ASSET',
                    'description': 'Buildings and structures'
                },
                {
                    'category': asset_category,
                    'code': '1710',
                    'name': 'Accumulated Depreciation - Building',
                    'account_type': 'ASSET',
                    'account_subtype': 'FIXED_ASSET',
                    'description': 'Accumulated depreciation on buildings'
                },
                {
                    'category': asset_category,
                    'code': '1800',
                    'name': 'Furniture & Fixtures',
                    'account_type': 'ASSET',
                    'account_subtype': 'FIXED_ASSET',
                    'description': 'Office furniture and fixtures'
                },
                {
                    'category': asset_category,
                    'code': '1810',
                    'name': 'Accumulated Depreciation - Furniture',
                    'account_type': 'ASSET',
                    'account_subtype': 'FIXED_ASSET',
                    'description': 'Accumulated depreciation on furniture'
                },

                # Liabilities
                {
                    'category': liability_category,
                    'code': '2000',
                    'name': 'Accounts Payable',
                    'account_type': 'LIABILITY',
                    'account_subtype': 'CURRENT_LIABILITY',
                    'description': 'Money owed to suppliers'
                },
                {
                    'category': liability_category,
                    'code': '2100',
                    'name': 'Accrued Expenses',
                    'account_type': 'LIABILITY',
                    'account_subtype': 'CURRENT_LIABILITY',
                    'description': 'Accrued but unpaid expenses'
                },

                # Equity
                {
                    'category': equity_category,
                    'code': '3000',
                    'name': 'Owner Equity',
                    'account_type': 'EQUITY',
                    'account_subtype': 'CAPITAL',
                    'description': 'Owner investment in business'
                },
                {
                    'category': equity_category,
                    'code': '3100',
                    'name': 'Retained Earnings',
                    'account_type': 'EQUITY',
                    'account_subtype': 'RETAINED_EARNINGS',
                    'description': 'Accumulated profits'
                },

                # Revenue
                {
                    'category': revenue_category,
                    'code': '4000',
                    'name': 'Service Revenue',
                    'account_type': 'REVENUE',
                    'account_subtype': 'OPERATING_REVENUE',
                    'description': 'Revenue from automotive services'
                },
                {
                    'category': revenue_category,
                    'code': '4100',
                    'name': 'Parts Sales',
                    'account_type': 'REVENUE',
                    'account_subtype': 'OPERATING_REVENUE',
                    'description': 'Revenue from parts sales'
                },

                # Expenses
                {
                    'category': expense_category,
                    'code': '5000',
                    'name': 'Cost of Goods Sold',
                    'account_type': 'EXPENSE',
                    'account_subtype': 'COST_OF_SALES',
                    'description': 'Direct costs of parts sold'
                },
                {
                    'category': expense_category,
                    'code': '6000',
                    'name': 'Depreciation Expense - Equipment',
                    'account_type': 'EXPENSE',
                    'account_subtype': 'OPERATING_EXPENSE',
                    'description': 'Depreciation expense for equipment'
                },
                {
                    'category': expense_category,
                    'code': '6010',
                    'name': 'Depreciation Expense - Vehicles',
                    'account_type': 'EXPENSE',
                    'account_subtype': 'OPERATING_EXPENSE',
                    'description': 'Depreciation expense for vehicles'
                },
                {
                    'category': expense_category,
                    'code': '6020',
                    'name': 'Depreciation Expense - Building',
                    'account_type': 'EXPENSE',
                    'account_subtype': 'OPERATING_EXPENSE',
                    'description': 'Depreciation expense for buildings'
                },
                {
                    'category': expense_category,
                    'code': '6030',
                    'name': 'Depreciation Expense - Furniture',
                    'account_type': 'EXPENSE',
                    'account_subtype': 'OPERATING_EXPENSE',
                    'description': 'Depreciation expense for furniture'
                },
                {
                    'category': expense_category,
                    'code': '8500',
                    'name': 'Gain/Loss on Asset Disposal',
                    'account_type': 'EXPENSE',
                    'account_subtype': 'NON_OPERATING_EXPENSE',
                    'description': 'Gain or loss from asset disposal'
                },
            ]

            created_count = 0
            for account_data in accounts_data:
                account, created = Account.objects.get_or_create(
                    code=account_data['code'],
                    defaults=account_data
                )
                if created:
                    created_count += 1
                    self.stdout.write(f"Created account: {account.code} - {account.name}")

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created {created_count} accounts. '
                    f'Total accounts: {Account.objects.count()}'
                )
            )
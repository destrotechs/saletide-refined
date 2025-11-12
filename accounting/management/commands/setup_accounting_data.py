from django.core.management.base import BaseCommand
from decimal import Decimal
from accounting.models import AccountCategory, Account


class Command(BaseCommand):
    help = 'Setup initial accounting data with categories and accounts'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Setting up accounting data...'))

        # Create Account Categories
        categories_data = [
            {
                'name': 'Assets',
                'code': '1000',
                'account_type': 'ASSET',
                'description': 'All company assets including cash, receivables, and fixed assets'
            },
            {
                'name': 'Liabilities',
                'code': '2000',
                'account_type': 'LIABILITY',
                'description': 'All company liabilities including payables and loans'
            },
            {
                'name': 'Equity',
                'code': '3000',
                'account_type': 'EQUITY',
                'description': 'Owner equity and retained earnings'
            },
            {
                'name': 'Revenue',
                'code': '4000',
                'account_type': 'REVENUE',
                'description': 'Income from services and parts sales'
            },
            {
                'name': 'Expenses',
                'code': '5000',
                'account_type': 'EXPENSE',
                'description': 'All business expenses and costs'
            }
        ]

        categories = {}
        for cat_data in categories_data:
            category, created = AccountCategory.objects.get_or_create(
                code=cat_data['code'],
                defaults=cat_data
            )
            categories[cat_data['account_type']] = category
            if created:
                self.stdout.write(f"Created category: {category.name}")
            else:
                self.stdout.write(f"Category exists: {category.name}")

        # Create Accounts
        accounts_data = [
            # Assets
            {
                'name': 'Cash',
                'code': '1001',
                'account_type': 'ASSET',
                'account_subtype': 'CURRENT_ASSET',
                'balance': Decimal('25000.00'),
                'debit_balance': Decimal('25000.00'),
                'credit_balance': Decimal('0.00'),
                'category': categories['ASSET']
            },
            {
                'name': 'Accounts Receivable',
                'code': '1002',
                'account_type': 'ASSET',
                'account_subtype': 'CURRENT_ASSET',
                'balance': Decimal('35000.00'),
                'debit_balance': Decimal('35000.00'),
                'credit_balance': Decimal('0.00'),
                'category': categories['ASSET']
            },
            {
                'name': 'Inventory',
                'code': '1003',
                'account_type': 'ASSET',
                'account_subtype': 'CURRENT_ASSET',
                'balance': Decimal('15000.00'),
                'debit_balance': Decimal('15000.00'),
                'credit_balance': Decimal('0.00'),
                'category': categories['ASSET']
            },
            {
                'name': 'Equipment',
                'code': '1004',
                'account_type': 'ASSET',
                'account_subtype': 'FIXED_ASSET',
                'balance': Decimal('50000.00'),
                'debit_balance': Decimal('50000.00'),
                'credit_balance': Decimal('0.00'),
                'category': categories['ASSET']
            },
            # Liabilities
            {
                'name': 'Accounts Payable',
                'code': '2001',
                'account_type': 'LIABILITY',
                'account_subtype': 'CURRENT_LIABILITY',
                'balance': Decimal('15000.00'),
                'debit_balance': Decimal('0.00'),
                'credit_balance': Decimal('15000.00'),
                'category': categories['LIABILITY']
            },
            {
                'name': 'Short-term Loan',
                'code': '2002',
                'account_type': 'LIABILITY',
                'account_subtype': 'CURRENT_LIABILITY',
                'balance': Decimal('10000.00'),
                'debit_balance': Decimal('0.00'),
                'credit_balance': Decimal('10000.00'),
                'category': categories['LIABILITY']
            },
            {
                'name': 'Equipment Loan',
                'code': '2003',
                'account_type': 'LIABILITY',
                'account_subtype': 'LONG_TERM_LIABILITY',
                'balance': Decimal('20000.00'),
                'debit_balance': Decimal('0.00'),
                'credit_balance': Decimal('20000.00'),
                'category': categories['LIABILITY']
            },
            # Equity
            {
                'name': "Owner's Equity",
                'code': '3001',
                'account_type': 'EQUITY',
                'account_subtype': 'CAPITAL',
                'balance': Decimal('60000.00'),
                'debit_balance': Decimal('0.00'),
                'credit_balance': Decimal('60000.00'),
                'category': categories['EQUITY']
            },
            {
                'name': 'Retained Earnings',
                'code': '3002',
                'account_type': 'EQUITY',
                'account_subtype': 'RETAINED_EARNINGS',
                'balance': Decimal('20000.00'),
                'debit_balance': Decimal('0.00'),
                'credit_balance': Decimal('20000.00'),
                'category': categories['EQUITY']
            },
            # Revenue
            {
                'name': 'Service Revenue',
                'code': '4001',
                'account_type': 'REVENUE',
                'account_subtype': 'OPERATING_REVENUE',
                'balance': Decimal('125000.00'),
                'debit_balance': Decimal('0.00'),
                'credit_balance': Decimal('125000.00'),
                'category': categories['REVENUE']
            },
            {
                'name': 'Parts Revenue',
                'code': '4002',
                'account_type': 'REVENUE',
                'account_subtype': 'OPERATING_REVENUE',
                'balance': Decimal('45000.00'),
                'debit_balance': Decimal('0.00'),
                'credit_balance': Decimal('45000.00'),
                'category': categories['REVENUE']
            },
            {
                'name': 'Labor Revenue',
                'code': '4003',
                'account_type': 'REVENUE',
                'account_subtype': 'OPERATING_REVENUE',
                'balance': Decimal('15000.00'),
                'debit_balance': Decimal('0.00'),
                'credit_balance': Decimal('15000.00'),
                'category': categories['REVENUE']
            },
            # Expenses
            {
                'name': 'Cost of Goods Sold',
                'code': '5001',
                'account_type': 'EXPENSE',
                'account_subtype': 'COST_OF_SALES',
                'balance': Decimal('85000.00'),
                'debit_balance': Decimal('85000.00'),
                'credit_balance': Decimal('0.00'),
                'category': categories['EXPENSE']
            },
            {
                'name': 'Rent Expense',
                'code': '5002',
                'account_type': 'EXPENSE',
                'account_subtype': 'OPERATING_EXPENSE',
                'balance': Decimal('24000.00'),
                'debit_balance': Decimal('24000.00'),
                'credit_balance': Decimal('0.00'),
                'category': categories['EXPENSE']
            },
            {
                'name': 'Utilities Expense',
                'code': '5003',
                'account_type': 'EXPENSE',
                'account_subtype': 'OPERATING_EXPENSE',
                'balance': Decimal('12000.00'),
                'debit_balance': Decimal('12000.00'),
                'credit_balance': Decimal('0.00'),
                'category': categories['EXPENSE']
            },
            {
                'name': 'Insurance Expense',
                'code': '5004',
                'account_type': 'EXPENSE',
                'account_subtype': 'OPERATING_EXPENSE',
                'balance': Decimal('8000.00'),
                'debit_balance': Decimal('8000.00'),
                'credit_balance': Decimal('0.00'),
                'category': categories['EXPENSE']
            },
            {
                'name': 'Marketing Expense',
                'code': '5005',
                'account_type': 'EXPENSE',
                'account_subtype': 'OPERATING_EXPENSE',
                'balance': Decimal('6000.00'),
                'debit_balance': Decimal('6000.00'),
                'credit_balance': Decimal('0.00'),
                'category': categories['EXPENSE']
            },
        ]

        for account_data in accounts_data:
            account, created = Account.objects.get_or_create(
                code=account_data['code'],
                defaults=account_data
            )
            if created:
                self.stdout.write(f"Created account: {account.name}")
            else:
                self.stdout.write(f"Account exists: {account.name}")

        self.stdout.write(self.style.SUCCESS('Successfully setup accounting data!'))
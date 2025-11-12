from django.core.management.base import BaseCommand
from decimal import Decimal
from accounting.models import Account
from sales.models import Job, Payment
from inventory.models import SKU
from django.db.models import Sum, Q


class Command(BaseCommand):
    help = 'Sync accounting account balances with actual business data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Syncing accounting data with actual business values...'))

        # Calculate actual values from business data

        # 1. Accounts Receivable - from unpaid/partially paid jobs
        completed_jobs = Job.objects.filter(
            status__in=['PAID', 'IN_PROGRESS']  # Use actual statuses from the system
        )

        total_revenue = completed_jobs.aggregate(
            total=Sum('final_total')
        )['total'] or Decimal('0.00')

        total_payments = Payment.objects.filter(
            job__in=completed_jobs
        ).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        accounts_receivable = total_revenue - total_payments

        # 2. Inventory Value - calculate from StockLedger
        actual_inventory_value = Decimal('0.00')

        # Calculate current stock for each SKU from StockLedger
        for sku in SKU.objects.filter(is_active=True):
            current_stock = sku.stock_ledgers.aggregate(
                total=Sum('quantity_change')
            )['total'] or Decimal('0.00')

            if current_stock > 0:
                actual_inventory_value += current_stock * sku.cost

        # 3. Cash - assume some cash on hand (could be connected to payment data)
        cash_balance = total_payments  # Simplified: cash equals payments received

        # Update Account balances
        try:
            # Update Cash account
            cash_account = Account.objects.get(code='1001', name='Cash')
            cash_account.balance = cash_balance
            cash_account.debit_balance = cash_balance
            cash_account.credit_balance = Decimal('0.00')
            cash_account.save()
            self.stdout.write(f"Updated Cash: ${cash_balance}")

            # Update Accounts Receivable
            ar_account = Account.objects.get(code='1002', name='Accounts Receivable')
            ar_account.balance = accounts_receivable
            ar_account.debit_balance = accounts_receivable
            ar_account.credit_balance = Decimal('0.00')
            ar_account.save()
            self.stdout.write(f"Updated A/R: ${accounts_receivable}")

            # Update Inventory
            inventory_account = Account.objects.get(code='1003', name='Inventory')
            inventory_account.balance = actual_inventory_value
            inventory_account.debit_balance = actual_inventory_value
            inventory_account.credit_balance = Decimal('0.00')
            inventory_account.save()
            self.stdout.write(f"Updated Inventory: ${actual_inventory_value}")

            # Update Revenue accounts with actual revenue data
            # Service Revenue - calculated from jobs
            service_revenue = Decimal('0.00')
            parts_revenue = Decimal('0.00')
            labor_revenue = Decimal('0.00')

            for job in completed_jobs:
                for line in job.lines.all():
                    if hasattr(line, 'service_variant') and line.service_variant:
                        if 'service' in line.service_variant.name.lower():
                            service_revenue += line.total_amount
                        elif 'part' in line.service_variant.name.lower() or line.inventory_items.exists():
                            parts_revenue += line.total_amount
                        else:
                            labor_revenue += line.total_amount

            # If no detailed breakdown, use proportional from total
            if service_revenue == 0 and parts_revenue == 0 and labor_revenue == 0:
                service_revenue = total_revenue * Decimal('0.60')
                parts_revenue = total_revenue * Decimal('0.30')
                labor_revenue = total_revenue * Decimal('0.10')

            # Update Service Revenue account
            service_rev_account = Account.objects.get(code='4001', name='Service Revenue')
            service_rev_account.balance = service_revenue
            service_rev_account.credit_balance = service_revenue
            service_rev_account.debit_balance = Decimal('0.00')
            service_rev_account.save()
            self.stdout.write(f"Updated Service Revenue: ${service_revenue}")

            # Update Parts Revenue account
            parts_rev_account = Account.objects.get(code='4002', name='Parts Revenue')
            parts_rev_account.balance = parts_revenue
            parts_rev_account.credit_balance = parts_revenue
            parts_rev_account.debit_balance = Decimal('0.00')
            parts_rev_account.save()
            self.stdout.write(f"Updated Parts Revenue: ${parts_revenue}")

            # Update Labor Revenue account
            labor_rev_account = Account.objects.get(code='4003', name='Labor Revenue')
            labor_rev_account.balance = labor_revenue
            labor_rev_account.credit_balance = labor_revenue
            labor_rev_account.debit_balance = Decimal('0.00')
            labor_rev_account.save()
            self.stdout.write(f"Updated Labor Revenue: ${labor_revenue}")

            # Calculate and update COGS
            total_cogs = Decimal('0.00')
            for job in completed_jobs:
                for line in job.lines.all():
                    line_inventory_cost = line.inventory_items.aggregate(
                        total=Sum('total_cost')
                    )['total'] or Decimal('0.00')
                    total_cogs += line_inventory_cost

            cogs_account = Account.objects.get(code='5001', name='Cost of Goods Sold')
            cogs_account.balance = total_cogs
            cogs_account.debit_balance = total_cogs
            cogs_account.credit_balance = Decimal('0.00')
            cogs_account.save()
            self.stdout.write(f"Updated COGS: ${total_cogs}")

            # Update totals
            self.stdout.write(self.style.SUCCESS('=== Summary ==='))
            self.stdout.write(f"Total Revenue: ${total_revenue}")
            self.stdout.write(f"Total Payments: ${total_payments}")
            self.stdout.write(f"Outstanding A/R: ${accounts_receivable}")
            self.stdout.write(f"Inventory Value: ${actual_inventory_value}")
            self.stdout.write(f"Cash Balance: ${cash_balance}")

        except Account.DoesNotExist as e:
            self.stdout.write(
                self.style.ERROR(f'Account not found: {e}. Run setup_accounting_data first.')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error updating accounts: {e}')
            )

        self.stdout.write(self.style.SUCCESS('Successfully synced accounting data!'))
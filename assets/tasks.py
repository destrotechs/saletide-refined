from celery import shared_task
from django.utils import timezone
from django.db import transaction
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta
from .models import Asset, AssetDepreciation
from accounting.models import JournalEntry, JournalEntryLine, Account
import logging

logger = logging.getLogger(__name__)


@shared_task
def calculate_monthly_depreciation():
    """
    Calculate monthly depreciation for all active assets
    """
    logger.info("Starting monthly depreciation calculation")

    active_assets = Asset.objects.filter(
        status='ACTIVE',
        purchase_date__isnull=False,
        useful_life_years__gt=0
    )

    depreciation_entries = []
    journal_entries = []

    for asset in active_assets:
        try:
            # Calculate depreciation for this asset
            depreciation_amount = asset.calculate_current_depreciation()

            if depreciation_amount > 0:
                # Create depreciation record
                depreciation_entry = AssetDepreciation.objects.create(
                    asset=asset,
                    depreciation_date=timezone.now().date(),
                    amount=depreciation_amount,
                    method=asset.depreciation_method,
                    calculation_details={
                        'purchase_cost': str(asset.purchase_cost),
                        'useful_life_years': asset.useful_life_years,
                        'age_in_months': asset.get_age_in_months(),
                        'method': asset.depreciation_method,
                        'accumulated_before': str(asset.accumulated_depreciation),
                        'current_depreciation': str(depreciation_amount)
                    }
                )
                depreciation_entries.append(depreciation_entry)

                # Update asset's accumulated depreciation and current book value
                asset.accumulated_depreciation += depreciation_amount
                asset.current_book_value = max(
                    asset.purchase_cost - asset.accumulated_depreciation,
                    asset.salvage_value or Decimal('0')
                )
                asset.last_depreciation_date = timezone.now().date()
                asset.save()

                # Create journal entry for accounting integration
                journal_entry = create_depreciation_journal_entry(asset, depreciation_amount)
                if journal_entry:
                    journal_entries.append(journal_entry)

        except Exception as e:
            logger.error(f"Error calculating depreciation for asset {asset.id}: {str(e)}")
            continue

    logger.info(f"Completed depreciation calculation: {len(depreciation_entries)} assets processed")
    return {
        'processed_assets': len(depreciation_entries),
        'total_depreciation': sum(entry.amount for entry in depreciation_entries),
        'journal_entries_created': len(journal_entries)
    }


@shared_task
def calculate_asset_depreciation(asset_id):
    """
    Calculate depreciation for a specific asset
    """
    try:
        asset = Asset.objects.get(id=asset_id)
        depreciation_amount = asset.calculate_current_depreciation()

        if depreciation_amount > 0:
            # Create depreciation record
            depreciation_entry = AssetDepreciation.objects.create(
                asset=asset,
                depreciation_date=timezone.now().date(),
                amount=depreciation_amount,
                method=asset.depreciation_method,
                calculation_details={
                    'manual_calculation': True,
                    'triggered_at': timezone.now().isoformat()
                }
            )

            # Update asset values
            asset.accumulated_depreciation += depreciation_amount
            asset.current_book_value = max(
                asset.purchase_cost - asset.accumulated_depreciation,
                asset.salvage_value or Decimal('0')
            )
            asset.last_depreciation_date = timezone.now().date()
            asset.save()

            # Create journal entry
            journal_entry = create_depreciation_journal_entry(asset, depreciation_amount)

            return {
                'success': True,
                'depreciation_amount': str(depreciation_amount),
                'new_book_value': str(asset.current_book_value),
                'journal_entry_id': journal_entry.id if journal_entry else None
            }
        else:
            return {'success': False, 'message': 'No depreciation calculated'}

    except Asset.DoesNotExist:
        return {'success': False, 'message': 'Asset not found'}
    except Exception as e:
        logger.error(f"Error calculating depreciation for asset {asset_id}: {str(e)}")
        return {'success': False, 'message': str(e)}


def create_depreciation_journal_entry(asset, depreciation_amount):
    """
    Create journal entry for depreciation
    """
    try:
        # Get or create accounts
        # Get the existing accounts from the asset category
        try:
            depreciation_expense_account = Account.objects.get(code=asset.category.expense_account)
        except Account.DoesNotExist:
            raise ValueError(f"Depreciation expense account {asset.category.expense_account} not found")

        try:
            accumulated_depreciation_account = Account.objects.get(code=asset.category.depreciation_account)
        except Account.DoesNotExist:
            raise ValueError(f"Accumulated depreciation account {asset.category.depreciation_account} not found")

        # Create journal entry
        with transaction.atomic():
            journal_entry = JournalEntry.objects.create(
                entry_number=f"DEP-{asset.asset_number}-{timezone.now().strftime('%Y%m%d')}",
                date=timezone.now().date(),
                description=f"Monthly depreciation for {asset.name}",
                reference=f"Asset: {asset.asset_number}",
                entry_type='DEPRECIATION',
                source_model='assets.Asset',
                source_id=asset.id,
                total_amount=depreciation_amount,
                status='POSTED'
            )

            # Debit depreciation expense
            JournalEntryLine.objects.create(
                journal_entry=journal_entry,
                account=depreciation_expense_account,
                description=f"Depreciation expense - {asset.name}",
                debit_amount=depreciation_amount,
                credit_amount=Decimal('0')
            )

            # Credit accumulated depreciation
            JournalEntryLine.objects.create(
                journal_entry=journal_entry,
                account=accumulated_depreciation_account,
                description=f"Accumulated depreciation - {asset.name}",
                debit_amount=Decimal('0'),
                credit_amount=depreciation_amount
            )

            return journal_entry

    except Exception as e:
        logger.error(f"Error creating depreciation journal entry for asset {asset.id}: {str(e)}")
        return None


@shared_task
def update_asset_values():
    """
    Update current book values for all assets based on accumulated depreciation
    """
    logger.info("Starting asset value updates")

    updated_count = 0
    for asset in Asset.objects.filter(status='ACTIVE'):
        try:
            old_value = asset.current_book_value
            asset.update_current_book_value()

            if old_value != asset.current_book_value:
                updated_count += 1

        except Exception as e:
            logger.error(f"Error updating values for asset {asset.id}: {str(e)}")
            continue

    logger.info(f"Updated values for {updated_count} assets")
    return {'updated_assets': updated_count}


@shared_task
def generate_depreciation_schedule(asset_id):
    """
    Generate a complete depreciation schedule for an asset
    """
    try:
        asset = Asset.objects.get(id=asset_id)
        schedule = asset.generate_depreciation_schedule()

        return {
            'success': True,
            'asset_id': asset_id,
            'schedule': schedule
        }

    except Asset.DoesNotExist:
        return {'success': False, 'message': 'Asset not found'}
    except Exception as e:
        logger.error(f"Error generating depreciation schedule for asset {asset_id}: {str(e)}")
        return {'success': False, 'message': str(e)}
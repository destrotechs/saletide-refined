from django.core.management.base import BaseCommand
from django.db import transaction
from assets.models import AssetCategory


class Command(BaseCommand):
    help = 'Setup default asset categories linked to accounting'

    def handle(self, *args, **options):
        self.stdout.write('Setting up asset categories...')

        with transaction.atomic():
            categories_data = [
                {
                    'code': 'EQP',
                    'name': 'Equipment',
                    'description': 'Shop equipment and tools',
                    'useful_life_years': 5,
                    'depreciation_method': 'STRAIGHT_LINE',
                    'asset_account': '1500',
                    'depreciation_account': '1510',
                    'expense_account': '6000'
                },
                {
                    'code': 'VEH',
                    'name': 'Vehicles',
                    'description': 'Company vehicles and automotive equipment',
                    'useful_life_years': 8,
                    'depreciation_method': 'DOUBLE_DECLINING',
                    'asset_account': '1600',
                    'depreciation_account': '1610',
                    'expense_account': '6010'
                },
                {
                    'code': 'BLD',
                    'name': 'Building',
                    'description': 'Buildings and structures',
                    'useful_life_years': 25,
                    'depreciation_method': 'STRAIGHT_LINE',
                    'asset_account': '1700',
                    'depreciation_account': '1710',
                    'expense_account': '6020'
                },
                {
                    'code': 'FUR',
                    'name': 'Furniture & Fixtures',
                    'description': 'Office furniture and fixtures',
                    'useful_life_years': 7,
                    'depreciation_method': 'STRAIGHT_LINE',
                    'asset_account': '1800',
                    'depreciation_account': '1810',
                    'expense_account': '6030'
                }
            ]

            created_count = 0
            for category_data in categories_data:
                category, created = AssetCategory.objects.get_or_create(
                    code=category_data['code'],
                    defaults=category_data
                )
                if created:
                    created_count += 1
                    self.stdout.write(f"Created category: {category.code} - {category.name}")
                else:
                    # Update existing category with accounting links
                    for field, value in category_data.items():
                        if field != 'code':
                            setattr(category, field, value)
                    category.save()
                    self.stdout.write(f"Updated category: {category.code} - {category.name}")

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully processed {len(categories_data)} asset categories. '
                    f'Created: {created_count}, Updated: {len(categories_data) - created_count}'
                )
            )
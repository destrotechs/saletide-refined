from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from services.models import VehicleClass, Part, Service, ServiceVariant, Material
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Populate the database with realistic automotive services data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before populating',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            ServiceVariant.objects.all().delete()
            Service.objects.all().delete()
            Part.objects.all().delete()
            Material.objects.all().delete()
            VehicleClass.objects.all().delete()

        # Get or create a superuser for created_by field
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.filter(role='ADMIN').first()
        if not admin_user:
            admin_user = User.objects.first()

        # Create Vehicle Classes
        self.stdout.write('Creating vehicle classes...')
        vehicle_classes = {
            'SMALL_SEDAN': VehicleClass.objects.get_or_create(
                code='SMALL_SEDAN',
                defaults={
                    'name': 'Small Sedan',
                    'modifier_type': 'PERCENTAGE',
                    'modifier_value': Decimal('0.00')  # Base pricing
                }
            )[0],
            'SUV': VehicleClass.objects.get_or_create(
                code='SUV',
                defaults={
                    'name': 'SUV',
                    'modifier_type': 'PERCENTAGE',
                    'modifier_value': Decimal('25.00')  # 25% higher
                }
            )[0],
            'LUXURY': VehicleClass.objects.get_or_create(
                code='LUXURY',
                defaults={
                    'name': 'Luxury',
                    'modifier_type': 'PERCENTAGE',
                    'modifier_value': Decimal('50.00')  # 50% higher
                }
            )[0],
            'TRUCK': VehicleClass.objects.get_or_create(
                code='TRUCK',
                defaults={
                    'name': 'Truck/Commercial',
                    'modifier_type': 'PERCENTAGE',
                    'modifier_value': Decimal('40.00')  # 40% higher
                }
            )[0],
        }

        # Create Parts hierarchy
        self.stdout.write('Creating parts hierarchy...')

        # Top-level parts
        engine = Part.objects.get_or_create(
            code='ENGINE',
            defaults={'name': 'Engine', 'description': 'Engine components and related services'}
        )[0]

        exterior = Part.objects.get_or_create(
            code='EXTERIOR',
            defaults={'name': 'Exterior', 'description': 'External vehicle components'}
        )[0]

        interior = Part.objects.get_or_create(
            code='INTERIOR',
            defaults={'name': 'Interior', 'description': 'Internal vehicle components'}
        )[0]

        wheels = Part.objects.get_or_create(
            code='WHEELS',
            defaults={'name': 'Wheels & Tires', 'description': 'Wheels, tires, and related components'}
        )[0]

        electrical = Part.objects.get_or_create(
            code='ELECTRICAL',
            defaults={'name': 'Electrical', 'description': 'Electrical systems and components'}
        )[0]

        fluids = Part.objects.get_or_create(
            code='FLUIDS',
            defaults={'name': 'Fluids', 'description': 'All vehicle fluids'}
        )[0]

        windows = Part.objects.get_or_create(
            code='WINDOWS',
            defaults={'name': 'Windows', 'description': 'All vehicle windows and glass'}
        )[0]

        # Sub-parts
        whole_vehicle = Part.objects.get_or_create(
            code='WHOLE_VEHICLE',
            defaults={'name': 'Whole Vehicle', 'description': 'Services that affect the entire vehicle'}
        )[0]

        # Create Materials for different brands and quality levels
        self.stdout.write('Creating materials/brands...')
        materials = {
            # Window Tinting Materials
            '3M_CERAMIC': Material.objects.get_or_create(
                code='3M_CERAMIC',
                defaults={
                    'name': 'Ceramic Series',
                    'brand': '3M',
                    'description': 'Premium ceramic window tint with superior heat rejection',
                    'price_modifier_type': 'PERCENTAGE',
                    'price_modifier_value': Decimal('25.00')  # 25% premium
                }
            )[0],
            'LLUMAR_CTX': Material.objects.get_or_create(
                code='LLUMAR_CTX',
                defaults={
                    'name': 'CTX Ceramic',
                    'brand': 'LLumar',
                    'description': 'High-performance ceramic tint with excellent clarity',
                    'price_modifier_type': 'PERCENTAGE',
                    'price_modifier_value': Decimal('20.00')  # 20% premium
                }
            )[0],
            'LLUMAR_ATR': Material.objects.get_or_create(
                code='LLUMAR_ATR',
                defaults={
                    'name': 'ATR Standard',
                    'brand': 'LLumar',
                    'description': 'Standard automotive window tint',
                    'price_modifier_type': 'PERCENTAGE',
                    'price_modifier_value': Decimal('0.00')  # Base pricing
                }
            )[0],
            'XPEL_PRIME': Material.objects.get_or_create(
                code='XPEL_PRIME',
                defaults={
                    'name': 'PRIME XS',
                    'brand': 'XPEL',
                    'description': 'Multi-layer ceramic window tint',
                    'price_modifier_type': 'PERCENTAGE',
                    'price_modifier_value': Decimal('30.00')  # 30% premium
                }
            )[0],
        }

        front_windows = Part.objects.get_or_create(
            code='FRONT_WINDOWS',
            parent=windows,
            defaults={'name': 'Front Side Windows', 'description': 'Front side windows'}
        )[0]

        rear_windows = Part.objects.get_or_create(
            code='REAR_WINDOWS',
            parent=windows,
            defaults={'name': 'Rear Side Windows', 'description': 'Rear side windows'}
        )[0]

        # Create Services
        self.stdout.write('Creating services...')
        services_data = [
            {
                'code': 'OIL_CHANGE',
                'name': 'Oil Change',
                'description': 'Engine oil and filter replacement service',
                'duration': 30,
                'parts_pricing': {
                    fluids: {'SMALL_SEDAN': 3000, 'SUV': 4500, 'LUXURY': 8000, 'TRUCK': 5000}
                }
            },
            {
                'code': 'BRAKE_SERVICE',
                'name': 'Brake Service',
                'description': 'Brake pad and rotor inspection and replacement',
                'duration': 90,
                'parts_pricing': {
                    whole_vehicle: {'SMALL_SEDAN': 12000, 'SUV': 18000, 'LUXURY': 25000, 'TRUCK': 20000}
                }
            },
            {
                'code': 'WINDOW_TINTING',
                'name': 'Window Tinting',
                'description': 'Professional window tinting service',
                'duration': 120,
                'parts_pricing': {
                    front_windows: {'SMALL_SEDAN': 4000, 'SUV': 5000, 'LUXURY': 8000, 'TRUCK': 5500},
                    rear_windows: {'SMALL_SEDAN': 3500, 'SUV': 4500, 'LUXURY': 7500, 'TRUCK': 5000},
                    whole_vehicle: {'SMALL_SEDAN': 15000, 'SUV': 20000, 'LUXURY': 35000, 'TRUCK': 22000}
                }
            },
            {
                'code': 'CERAMIC_COATING',
                'name': 'Ceramic Coating',
                'description': 'Paint protection ceramic coating application',
                'duration': 480,
                'parts_pricing': {
                    whole_vehicle: {'SMALL_SEDAN': 45000, 'SUV': 60000, 'LUXURY': 80000, 'TRUCK': 65000}
                }
            },
            {
                'code': 'TIRE_SERVICE',
                'name': 'Tire Service',
                'description': 'Tire rotation, balancing, and alignment',
                'duration': 60,
                'parts_pricing': {
                    wheels: {'SMALL_SEDAN': 2500, 'SUV': 3500, 'LUXURY': 5000, 'TRUCK': 4000}
                }
            },
            {
                'code': 'CAR_WASH',
                'name': 'Car Wash & Detailing',
                'description': 'Professional car washing and detailing service',
                'duration': 90,
                'parts_pricing': {
                    exterior: {'SMALL_SEDAN': 1500, 'SUV': 2000, 'LUXURY': 3500, 'TRUCK': 2500},
                    interior: {'SMALL_SEDAN': 2000, 'SUV': 2500, 'LUXURY': 4000, 'TRUCK': 3000},
                    whole_vehicle: {'SMALL_SEDAN': 3000, 'SUV': 4000, 'LUXURY': 6500, 'TRUCK': 5000}
                }
            },
            {
                'code': 'AC_SERVICE',
                'name': 'AC Service & Repair',
                'description': 'Air conditioning system service and repair',
                'duration': 120,
                'parts_pricing': {
                    electrical: {'SMALL_SEDAN': 6000, 'SUV': 8000, 'LUXURY': 12000, 'TRUCK': 9000}
                }
            },
            {
                'code': 'BATTERY_SERVICE',
                'name': 'Battery Replacement',
                'description': 'Battery testing and replacement service',
                'duration': 30,
                'parts_pricing': {
                    electrical: {'SMALL_SEDAN': 8000, 'SUV': 12000, 'LUXURY': 18000, 'TRUCK': 15000}
                }
            },
            {
                'code': 'ENGINE_DIAGNOSTIC',
                'name': 'Engine Diagnostic',
                'description': 'Comprehensive engine diagnostic and troubleshooting',
                'duration': 90,
                'parts_pricing': {
                    engine: {'SMALL_SEDAN': 5000, 'SUV': 6500, 'LUXURY': 10000, 'TRUCK': 7500}
                }
            },
            {
                'code': 'TRANSMISSION_SERVICE',
                'name': 'Transmission Service',
                'description': 'Transmission fluid change and inspection',
                'duration': 120,
                'parts_pricing': {
                    fluids: {'SMALL_SEDAN': 8000, 'SUV': 12000, 'LUXURY': 18000, 'TRUCK': 14000}
                }
            }
        ]

        for service_data in services_data:
            service = Service.objects.get_or_create(
                code=service_data['code'],
                defaults={
                    'name': service_data['name'],
                    'description': service_data['description'],
                    'duration_estimate_minutes': service_data['duration']
                }
            )[0]

            # Create service variants for each part and vehicle class combination
            for part, pricing in service_data['parts_pricing'].items():
                for vehicle_class_code, base_price in pricing.items():
                    vehicle_class = vehicle_classes[vehicle_class_code]
                    suggested_price = Decimal(str(base_price))
                    floor_price = suggested_price * Decimal('0.8')  # 20% below suggested

                    # Special handling for Window Tinting - create variants with different materials
                    if service_data['code'] == 'WINDOW_TINTING':
                        # Create variants for each tinting material
                        for material_key, material in materials.items():
                            ServiceVariant.objects.get_or_create(
                                service=service,
                                part=part,
                                vehicle_class=vehicle_class,
                                material=material,
                                defaults={
                                    'suggested_price': suggested_price,
                                    'floor_price': floor_price,
                                    'created_by': admin_user,
                                    'updated_by': admin_user
                                }
                            )
                    else:
                        # For other services, create without material (existing behavior)
                        ServiceVariant.objects.get_or_create(
                            service=service,
                            part=part,
                            vehicle_class=vehicle_class,
                            material=None,
                            defaults={
                                'suggested_price': suggested_price,
                                'floor_price': floor_price,
                                'created_by': admin_user,
                                'updated_by': admin_user
                            }
                        )

        # Print summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Successfully populated services data:'))
        self.stdout.write(f'  Vehicle Classes: {VehicleClass.objects.count()}')
        self.stdout.write(f'  Parts: {Part.objects.count()}')
        self.stdout.write(f'  Materials: {Material.objects.count()}')
        self.stdout.write(f'  Services: {Service.objects.count()}')
        self.stdout.write(f'  Service Variants: {ServiceVariant.objects.count()}')
        self.stdout.write('')
        self.stdout.write('You can now access services at: /api/v1/services/service-variants/')
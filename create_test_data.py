#!/usr/bin/env python
import os
import django
from decimal import Decimal
from datetime import date, datetime, timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'timax_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from authentication.models import Branch, UserRole
from services.models import VehicleClass, Part, Service, ServiceVariant, PriceBand
from inventory.models import (
    SKUCategory, Supplier, SKU, StockLocation, StockLedger,
    BOM, PurchaseOrder, PurchaseOrderLine
)
from sales.models import Customer, Vehicle, Job, JobLine, Payment, Estimate, EstimateLine

User = get_user_model()


def create_branches():
    print("Creating branches...")
    branches = [
        {"name": "Main Branch", "code": "MAIN", "address": "123 Main St, Nairobi", "phone": "+254-700-123456"},
        {"name": "Westlands Branch", "code": "WEST", "address": "456 Westlands Ave, Nairobi", "phone": "+254-700-234567"},
        {"name": "Industrial Area", "code": "INDU", "address": "789 Industrial Area Rd, Nairobi", "phone": "+254-700-345678"},
    ]

    for branch_data in branches:
        branch, created = Branch.objects.get_or_create(
            code=branch_data["code"],
            defaults=branch_data
        )
        if created:
            print(f"  Created branch: {branch.name}")


def create_users():
    print("Creating users...")
    main_branch = Branch.objects.get(code="MAIN")
    west_branch = Branch.objects.get(code="WEST")

    users = [
        {"email": "manager@timax.com", "role": UserRole.MANAGER, "first_name": "John", "last_name": "Manager", "branch": main_branch},
        {"email": "sales1@timax.com", "role": UserRole.SALES_AGENT, "first_name": "Jane", "last_name": "Sales", "branch": main_branch},
        {"email": "sales2@timax.com", "role": UserRole.SALES_AGENT, "first_name": "Mike", "last_name": "Agent", "branch": west_branch},
        {"email": "tech1@timax.com", "role": UserRole.TECHNICIAN, "first_name": "Paul", "last_name": "Technician", "branch": main_branch},
        {"email": "tech2@timax.com", "role": UserRole.TECHNICIAN, "first_name": "Mary", "last_name": "Tech", "branch": west_branch},
        {"email": "inventory@timax.com", "role": UserRole.INVENTORY_CLERK, "first_name": "David", "last_name": "Inventory", "branch": main_branch},
        {"email": "accountant@timax.com", "role": UserRole.ACCOUNTANT, "first_name": "Sarah", "last_name": "Numbers", "branch": main_branch},
    ]

    for user_data in users:
        user, created = User.objects.get_or_create(
            email=user_data["email"],
            defaults={
                **user_data,
                "phone": "+254-700-000000"
            }
        )
        if created:
            user.set_password('password123')
            user.save()
            print(f"  Created user: {user.email} ({user.get_role_display()})")


def create_vehicle_classes():
    print("Creating vehicle classes...")
    classes = [
        {"name": "Small Sedan", "code": "SMALL", "modifier_type": "PERCENTAGE", "modifier_value": Decimal('0.00')},
        {"name": "SUV", "code": "SUV", "modifier_type": "PERCENTAGE", "modifier_value": Decimal('25.00')},
        {"name": "Van", "code": "VAN", "modifier_type": "PERCENTAGE", "modifier_value": Decimal('30.00')},
        {"name": "Truck", "code": "TRUCK", "modifier_type": "PERCENTAGE", "modifier_value": Decimal('40.00')},
        {"name": "Luxury", "code": "LUXURY", "modifier_type": "PERCENTAGE", "modifier_value": Decimal('50.00')},
        {"name": "Bus", "code": "BUS", "modifier_type": "PERCENTAGE", "modifier_value": Decimal('60.00')},
    ]

    for class_data in classes:
        vehicle_class, created = VehicleClass.objects.get_or_create(
            code=class_data["code"],
            defaults=class_data
        )
        if created:
            print(f"  Created vehicle class: {vehicle_class.name}")


def create_parts():
    print("Creating parts...")
    parts_data = [
        # Top-level parts
        {"name": "Whole Vehicle", "code": "WHOLE", "parent": None},
        {"name": "Windows", "code": "WINDOWS", "parent": None},
        {"name": "Body", "code": "BODY", "parent": None},
        {"name": "Lights", "code": "LIGHTS", "parent": None},

        # Window sub-parts
        {"name": "Windshield", "code": "WINDSHIELD", "parent": "WINDOWS"},
        {"name": "Rear Window", "code": "REAR_WINDOW", "parent": "WINDOWS"},
        {"name": "Front Side Windows", "code": "FRONT_SIDE", "parent": "WINDOWS"},
        {"name": "Rear Side Windows", "code": "REAR_SIDE", "parent": "WINDOWS"},
        {"name": "Sunroof", "code": "SUNROOF", "parent": "WINDOWS"},

        # Body sub-parts
        {"name": "Hood", "code": "HOOD", "parent": "BODY"},
        {"name": "Trunk", "code": "TRUNK", "parent": "BODY"},
        {"name": "Doors", "code": "DOORS", "parent": "BODY"},
        {"name": "Roof", "code": "ROOF", "parent": "BODY"},
        {"name": "Bumpers", "code": "BUMPERS", "parent": "BODY"},
        {"name": "Mirrors", "code": "MIRRORS", "parent": "BODY"},

        # Light sub-parts
        {"name": "Headlights", "code": "HEADLIGHTS", "parent": "LIGHTS"},
        {"name": "Taillights", "code": "TAILLIGHTS", "parent": "LIGHTS"},
    ]

    created_parts = {}

    # Create top-level parts first
    for part_data in parts_data:
        if part_data["parent"] is None:
            part, created = Part.objects.get_or_create(
                code=part_data["code"],
                defaults={
                    "name": part_data["name"],
                    "description": f"{part_data['name']} part"
                }
            )
            created_parts[part_data["code"]] = part
            if created:
                print(f"  Created part: {part.name}")

    # Create sub-parts
    for part_data in parts_data:
        if part_data["parent"] is not None:
            parent_part = created_parts.get(part_data["parent"]) or Part.objects.get(code=part_data["parent"])
            part, created = Part.objects.get_or_create(
                code=part_data["code"],
                defaults={
                    "name": part_data["name"],
                    "parent": parent_part,
                    "description": f"{part_data['name']} part"
                }
            )
            created_parts[part_data["code"]] = part
            if created:
                print(f"  Created sub-part: {part.name}")


def create_services():
    print("Creating services...")
    services_data = [
        {"name": "Window Tinting", "code": "TINT", "description": "Professional window tinting service", "duration": 120},
        {"name": "Ceramic Coating", "code": "CERAMIC", "description": "Premium ceramic coating protection", "duration": 480},
        {"name": "Paint Protection Film", "code": "PPF", "description": "Clear paint protection film application", "duration": 360},
        {"name": "Body Buffing", "code": "BUFF", "description": "Professional paint buffing and polishing", "duration": 180},
        {"name": "Waxing", "code": "WAX", "description": "Premium car wax application", "duration": 90},
        {"name": "Watermark Removal", "code": "WATERMARK", "description": "Remove water spots and mineral deposits", "duration": 120},
        {"name": "Headlight Restoration", "code": "HEADLIGHT", "description": "Restore cloudy and yellowed headlights", "duration": 60},
    ]

    for service_data in services_data:
        service, created = Service.objects.get_or_create(
            code=service_data["code"],
            defaults={
                "name": service_data["name"],
                "description": service_data["description"],
                "duration_estimate_minutes": service_data["duration"]
            }
        )
        if created:
            print(f"  Created service: {service.name}")


def create_service_variants():
    print("Creating service variants...")
    admin_user = User.objects.get(email='admin@timax.com')

    # Get services and parts
    tint_service = Service.objects.get(code="TINT")
    ceramic_service = Service.objects.get(code="CERAMIC")
    buff_service = Service.objects.get(code="BUFF")

    windshield_part = Part.objects.get(code="WINDSHIELD")
    whole_vehicle_part = Part.objects.get(code="WHOLE")
    front_side_part = Part.objects.get(code="FRONT_SIDE")

    small_class = VehicleClass.objects.get(code="SMALL")
    suv_class = VehicleClass.objects.get(code="SUV")
    luxury_class = VehicleClass.objects.get(code="LUXURY")

    variants_data = [
        # Window tinting variants
        {"service": tint_service, "part": windshield_part, "vehicle_class": small_class, "suggested": 5000, "floor": 3500},
        {"service": tint_service, "part": windshield_part, "vehicle_class": suv_class, "suggested": 6500, "floor": 4500},
        {"service": tint_service, "part": windshield_part, "vehicle_class": luxury_class, "suggested": 8000, "floor": 6000},

        {"service": tint_service, "part": front_side_part, "vehicle_class": small_class, "suggested": 8000, "floor": 6000},
        {"service": tint_service, "part": front_side_part, "vehicle_class": suv_class, "suggested": 10000, "floor": 7500},
        {"service": tint_service, "part": front_side_part, "vehicle_class": luxury_class, "suggested": 12000, "floor": 9000},

        # Ceramic coating variants
        {"service": ceramic_service, "part": whole_vehicle_part, "vehicle_class": small_class, "suggested": 45000, "floor": 35000},
        {"service": ceramic_service, "part": whole_vehicle_part, "vehicle_class": suv_class, "suggested": 60000, "floor": 45000},
        {"service": ceramic_service, "part": whole_vehicle_part, "vehicle_class": luxury_class, "suggested": 80000, "floor": 60000},

        # Buffing variants
        {"service": buff_service, "part": whole_vehicle_part, "vehicle_class": small_class, "suggested": 15000, "floor": 10000},
        {"service": buff_service, "part": whole_vehicle_part, "vehicle_class": suv_class, "suggested": 20000, "floor": 15000},
        {"service": buff_service, "part": whole_vehicle_part, "vehicle_class": luxury_class, "suggested": 25000, "floor": 18000},
    ]

    for variant_data in variants_data:
        variant, created = ServiceVariant.objects.get_or_create(
            service=variant_data["service"],
            part=variant_data["part"],
            vehicle_class=variant_data["vehicle_class"],
            defaults={
                "suggested_price": Decimal(str(variant_data["suggested"])),
                "floor_price": Decimal(str(variant_data["floor"])),
                "created_by": admin_user,
                "updated_by": admin_user
            }
        )
        if created:
            print(f"  Created variant: {variant}")


def create_sku_categories_and_suppliers():
    print("Creating SKU categories and suppliers...")

    # Categories
    categories = [
        {"name": "Window Films", "code": "FILMS"},
        {"name": "Ceramic Coatings", "code": "CERAMIC"},
        {"name": "Polishing Compounds", "code": "POLISH"},
        {"name": "Wax Products", "code": "WAX"},
        {"name": "Tools & Equipment", "code": "TOOLS"},
        {"name": "Cleaning Supplies", "code": "CLEAN"},
    ]

    for cat_data in categories:
        category, created = SKUCategory.objects.get_or_create(
            code=cat_data["code"],
            defaults=cat_data
        )
        if created:
            print(f"  Created category: {category.name}")

    # Suppliers
    suppliers = [
        {"name": "3M Kenya Ltd", "code": "3M", "phone": "+254-700-111111", "email": "kenya@3m.com", "address": "Nairobi, Kenya"},
        {"name": "XPEL Technologies", "code": "XPEL", "phone": "+254-700-222222", "email": "sales@xpel.com", "address": "Nairobi, Kenya"},
        {"name": "Chemical Guys Kenya", "code": "CHEM", "phone": "+254-700-333333", "email": "info@chemicalguys.co.ke", "address": "Mombasa, Kenya"},
        {"name": "Meguiar's East Africa", "code": "MEG", "phone": "+254-700-444444", "email": "eastafrica@meguiars.com", "address": "Nairobi, Kenya"},
    ]

    for supplier_data in suppliers:
        supplier, created = Supplier.objects.get_or_create(
            code=supplier_data["code"],
            defaults=supplier_data
        )
        if created:
            print(f"  Created supplier: {supplier.name}")


def create_skus():
    print("Creating SKUs...")

    # Get categories and suppliers
    films_cat = SKUCategory.objects.get(code="FILMS")
    ceramic_cat = SKUCategory.objects.get(code="CERAMIC")
    polish_cat = SKUCategory.objects.get(code="POLISH")
    tools_cat = SKUCategory.objects.get(code="TOOLS")

    threem_supplier = Supplier.objects.get(code="3M")
    xpel_supplier = Supplier.objects.get(code="XPEL")
    chem_supplier = Supplier.objects.get(code="CHEM")

    skus_data = [
        # Window Films
        {"code": "3M-CRYST70", "name": "3M Crystalline 70% VLT Film", "category": films_cat, "supplier": threem_supplier, "unit": "M2", "cost": 2500, "min_level": 50},
        {"code": "3M-CRYST50", "name": "3M Crystalline 50% VLT Film", "category": films_cat, "supplier": threem_supplier, "unit": "M2", "cost": 2500, "min_level": 50},
        {"code": "3M-CRYST35", "name": "3M Crystalline 35% VLT Film", "category": films_cat, "supplier": threem_supplier, "unit": "M2", "cost": 2500, "min_level": 50},
        {"code": "XPEL-PRIME70", "name": "XPEL PRIME XR 70% Film", "category": films_cat, "supplier": xpel_supplier, "unit": "M2", "cost": 2000, "min_level": 30},
        {"code": "XPEL-PRIME35", "name": "XPEL PRIME XR 35% Film", "category": films_cat, "supplier": xpel_supplier, "unit": "M2", "cost": 2000, "min_level": 30},

        # Ceramic Coatings
        {"code": "CERA-9H", "name": "Professional 9H Ceramic Coating", "category": ceramic_cat, "supplier": chem_supplier, "unit": "ML", "cost": 150, "min_level": 100},
        {"code": "CERA-PREP", "name": "Ceramic Coating Prep Solution", "category": ceramic_cat, "supplier": chem_supplier, "unit": "L", "cost": 3000, "min_level": 10},

        # Polishing Compounds
        {"code": "COMPOUND-CUT", "name": "Heavy Cut Polishing Compound", "category": polish_cat, "supplier": chem_supplier, "unit": "ML", "cost": 25, "min_level": 200},
        {"code": "COMPOUND-FINE", "name": "Fine Polishing Compound", "category": polish_cat, "supplier": chem_supplier, "unit": "ML", "cost": 25, "min_level": 200},

        # Tools
        {"code": "SQUEEGEE-PROF", "name": "Professional Squeegee Set", "category": tools_cat, "supplier": threem_supplier, "unit": "PCS", "cost": 1500, "min_level": 5},
        {"code": "HEAT-GUN", "name": "Heat Gun for Film Installation", "category": tools_cat, "supplier": threem_supplier, "unit": "PCS", "cost": 8000, "min_level": 2},
    ]

    for sku_data in skus_data:
        sku, created = SKU.objects.get_or_create(
            code=sku_data["code"],
            defaults={
                "name": sku_data["name"],
                "category": sku_data["category"],
                "supplier": sku_data["supplier"],
                "unit": sku_data["unit"],
                "cost": Decimal(str(sku_data["cost"])),
                "min_stock_level": Decimal(str(sku_data["min_level"])),
                "reorder_point": Decimal(str(sku_data["min_level"] * 1.5)),
            }
        )
        if created:
            print(f"  Created SKU: {sku.name}")


def create_stock_locations():
    print("Creating stock locations...")

    main_branch = Branch.objects.get(code="MAIN")
    west_branch = Branch.objects.get(code="WEST")

    locations = [
        {"name": "Main Warehouse", "code": "MAIN-WH", "branch": main_branch},
        {"name": "Main Workshop", "code": "MAIN-WS", "branch": main_branch},
        {"name": "Westlands Store", "code": "WEST-ST", "branch": west_branch},
        {"name": "Westlands Workshop", "code": "WEST-WS", "branch": west_branch},
    ]

    for loc_data in locations:
        location, created = StockLocation.objects.get_or_create(
            code=loc_data["code"],
            defaults=loc_data
        )
        if created:
            print(f"  Created location: {location.name}")


def create_bom_items():
    print("Creating BOM items...")

    # Get some service variants and SKUs
    tint_windshield_small = ServiceVariant.objects.filter(
        service__code="TINT", part__code="WINDSHIELD", vehicle_class__code="SMALL"
    ).first()

    ceramic_whole_small = ServiceVariant.objects.filter(
        service__code="CERAMIC", part__code="WHOLE", vehicle_class__code="SMALL"
    ).first()

    film_sku = SKU.objects.get(code="3M-CRYST70")
    ceramic_sku = SKU.objects.get(code="CERA-9H")
    prep_sku = SKU.objects.get(code="CERA-PREP")

    if tint_windshield_small and ceramic_whole_small:
        bom_items = [
            {"service_variant": tint_windshield_small, "sku": film_sku, "standard_qty": 2.5, "wastage": 10},
            {"service_variant": ceramic_whole_small, "sku": ceramic_sku, "standard_qty": 50, "wastage": 5},
            {"service_variant": ceramic_whole_small, "sku": prep_sku, "standard_qty": 0.5, "wastage": 0},
        ]

        for bom_data in bom_items:
            bom, created = BOM.objects.get_or_create(
                service_variant=bom_data["service_variant"],
                sku=bom_data["sku"],
                defaults={
                    "standard_quantity": Decimal(str(bom_data["standard_qty"])),
                    "wastage_percentage": Decimal(str(bom_data["wastage"])),
                }
            )
            if created:
                print(f"  Created BOM: {bom}")


def create_customers_and_vehicles():
    print("Creating customers and vehicles...")

    small_class = VehicleClass.objects.get(code="SMALL")
    suv_class = VehicleClass.objects.get(code="SUV")
    luxury_class = VehicleClass.objects.get(code="LUXURY")

    customers_data = [
        {
            "name": "John Doe",
            "phone": "+254-700-111111",
            "email": "john@example.com",
            "vehicles": [
                {"plate": "KCA 123A", "make": "Toyota", "model": "Corolla", "year": 2020, "color": "White", "class": small_class},
            ]
        },
        {
            "name": "Jane Smith",
            "phone": "+254-700-222222",
            "email": "jane@example.com",
            "vehicles": [
                {"plate": "KCB 456B", "make": "Toyota", "model": "Prado", "year": 2021, "color": "Silver", "class": suv_class},
                {"plate": "KCC 789C", "make": "Honda", "model": "CRV", "year": 2019, "color": "Black", "class": suv_class},
            ]
        },
        {
            "name": "Robert Johnson",
            "phone": "+254-700-333333",
            "email": "robert@example.com",
            "vehicles": [
                {"plate": "KCD 999D", "make": "BMW", "model": "X5", "year": 2022, "color": "Blue", "class": luxury_class},
            ]
        },
    ]

    for customer_data in customers_data:
        customer, created = Customer.objects.get_or_create(
            phone=customer_data["phone"],
            defaults={
                "name": customer_data["name"],
                "email": customer_data["email"],
                "consent_for_communications": True
            }
        )

        if created:
            print(f"  Created customer: {customer.name}")

            # Create vehicles for this customer
            for vehicle_data in customer_data["vehicles"]:
                vehicle, v_created = Vehicle.objects.get_or_create(
                    plate_number=vehicle_data["plate"],
                    defaults={
                        "customer": customer,
                        "make": vehicle_data["make"],
                        "model": vehicle_data["model"],
                        "year": vehicle_data["year"],
                        "color": vehicle_data["color"],
                        "vehicle_class": vehicle_data["class"]
                    }
                )
                if v_created:
                    print(f"    Created vehicle: {vehicle}")


def create_sample_jobs():
    print("Creating sample jobs...")

    # Get users
    sales_user = User.objects.get(email="sales1@timax.com")
    tech_user = User.objects.get(email="tech1@timax.com")

    # Get customers and vehicles
    john = Customer.objects.get(name="John Doe")
    john_vehicle = john.vehicles.first()

    jane = Customer.objects.get(name="Jane Smith")
    jane_vehicle = jane.vehicles.first()

    # Get service variants
    tint_variant = ServiceVariant.objects.filter(service__code="TINT").first()
    ceramic_variant = ServiceVariant.objects.filter(service__code="CERAMIC").first()

    if tint_variant and ceramic_variant and john_vehicle and jane_vehicle:
        jobs_data = [
            {
                "job_number": "JOB-2024-001",
                "customer": john,
                "vehicle": john_vehicle,
                "status": "COMPLETED",
                "created_by": sales_user,
                "assigned_technician": tech_user,
                "lines": [
                    {"service_variant": tint_variant, "quantity": 1, "unit_price": 5000},
                ]
            },
            {
                "job_number": "JOB-2024-002",
                "customer": jane,
                "vehicle": jane_vehicle,
                "status": "IN_PROGRESS",
                "created_by": sales_user,
                "assigned_technician": tech_user,
                "lines": [
                    {"service_variant": ceramic_variant, "quantity": 1, "unit_price": 60000},
                ]
            },
        ]

        for job_data in jobs_data:
            job, created = Job.objects.get_or_create(
                job_number=job_data["job_number"],
                defaults={
                    "customer": job_data["customer"],
                    "vehicle": job_data["vehicle"],
                    "status": job_data["status"],
                    "created_by": job_data["created_by"],
                    "assigned_technician": job_data["assigned_technician"],
                    "estimate_total": sum(line["unit_price"] for line in job_data["lines"]),
                    "final_total": sum(line["unit_price"] for line in job_data["lines"]),
                }
            )

            if created:
                print(f"  Created job: {job.job_number}")

                # Create job lines
                for line_data in job_data["lines"]:
                    job_line = JobLine.objects.create(
                        job=job,
                        service_variant=line_data["service_variant"],
                        quantity=Decimal(str(line_data["quantity"])),
                        unit_price=Decimal(str(line_data["unit_price"])),
                        is_completed=(job_data["status"] == "COMPLETED")
                    )
                    print(f"    Created job line: {job_line}")

                # Create payment for completed job
                if job_data["status"] == "COMPLETED":
                    payment = Payment.objects.create(
                        job=job,
                        payment_method="CASH",
                        amount=job.final_total,
                        received_by=sales_user,
                        status="COMPLETED"
                    )
                    print(f"    Created payment: {payment}")


def main():
    print("Creating test data for TIMAX system...")
    print("="*50)

    try:
        create_branches()
        create_users()
        create_vehicle_classes()
        create_parts()
        create_services()
        create_service_variants()
        create_sku_categories_and_suppliers()
        create_skus()
        create_stock_locations()
        create_bom_items()
        create_customers_and_vehicles()
        create_sample_jobs()

        print("="*50)
        print("✅ Test data creation completed successfully!")
        print("\n📋 Summary:")
        print(f"  • Branches: {Branch.objects.count()}")
        print(f"  • Users: {User.objects.count()}")
        print(f"  • Vehicle Classes: {VehicleClass.objects.count()}")
        print(f"  • Parts: {Part.objects.count()}")
        print(f"  • Services: {Service.objects.count()}")
        print(f"  • Service Variants: {ServiceVariant.objects.count()}")
        print(f"  • SKUs: {SKU.objects.count()}")
        print(f"  • Customers: {Customer.objects.count()}")
        print(f"  • Vehicles: {Vehicle.objects.count()}")
        print(f"  • Jobs: {Job.objects.count()}")

        print("\n🔐 Login Credentials:")
        print("  Admin: admin@timax.com / admin123")
        print("  Manager: manager@timax.com / password123")
        print("  Sales Agent: sales1@timax.com / password123")
        print("  Technician: tech1@timax.com / password123")

    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        raise


if __name__ == "__main__":
    main()
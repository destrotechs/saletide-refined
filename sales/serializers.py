from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Sum
from decimal import Decimal
from datetime import datetime, date
from .models import (
    Customer, Vehicle, Job, JobLine, JobLineInventory, OverrideRequest, JobMedia,
    Payment, JobConsumption, Estimate, EstimateLine, Invoice, Receipt,
    EmployeeCommissionRate, Commission, Tip, AdvancePayment
)
from services.models import ServiceVariant
from inventory.models import SKU

User = get_user_model()


class JobLineInventorySerializer(serializers.ModelSerializer):
    """Serializer for JobLineInventory nested within JobLine"""

    # Use UUIDField to avoid DRF conversion issues
    sku = serializers.UUIDField()

    # Accept frontend fields that aren't model fields
    inventory_option_id = serializers.CharField(write_only=True, required=False)
    sku_name = serializers.CharField(write_only=True, required=False)
    sku_code = serializers.CharField(write_only=True, required=False)
    selected_quantity = serializers.DecimalField(max_digits=10, decimal_places=2, write_only=True, required=False)

    class Meta:
        model = JobLineInventory
        fields = [
            'id', 'sku', 'quantity_used', 'unit_cost', 'total_cost',
            'inventory_option_id', 'sku_name', 'sku_code', 'selected_quantity'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        # Remove frontend-only fields that aren't part of the model
        inventory_option_id = validated_data.pop('inventory_option_id', None)
        sku_name = validated_data.pop('sku_name', None)
        sku_code = validated_data.pop('sku_code', None)
        selected_quantity = validated_data.pop('selected_quantity', None)

        # Convert UUID to SKU object
        sku_uuid = validated_data.pop('sku')
        try:
            sku = SKU.objects.get(id=sku_uuid)
            validated_data['sku'] = sku
        except SKU.DoesNotExist:
            raise serializers.ValidationError({'sku': 'Invalid SKU ID'})

        # If selected_quantity is provided, use it for quantity_used
        if selected_quantity is not None:
            validated_data['quantity_used'] = selected_quantity

        return super().create(validated_data)


class CustomerSerializer(serializers.ModelSerializer):
    vehicles_count = serializers.SerializerMethodField()
    total_jobs = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    last_job_date = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'email', 'address', 'consent_for_communications',
            'date_of_birth', 'national_id', 'notes', 'vehicles_count',
            'total_jobs', 'total_spent', 'last_job_date',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_vehicles_count(self, obj):
        return obj.vehicles.count()

    def get_total_jobs(self, obj):
        return obj.jobs.count()

    def get_total_spent(self, obj):
        total = obj.jobs.filter(status='PAID').aggregate(
            total=Sum('final_total')
        )['total'] or Decimal('0.00')
        return total

    def get_last_job_date(self, obj):
        last_job = obj.jobs.order_by('-created_at').first()
        return last_job.created_at if last_job else None


class VehicleSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_address = serializers.CharField(source='customer.address', read_only=True)
    vehicle_class_name = serializers.CharField(source='vehicle_class.name', read_only=True)
    total_jobs = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    last_service_date = serializers.SerializerMethodField()
    recent_jobs = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone', 'customer_email',
            'customer_address', 'plate_number', 'make', 'model', 'year', 'color',
            'vin', 'vehicle_class', 'vehicle_class_name', 'notes', 'total_jobs',
            'total_spent', 'last_service_date', 'recent_jobs', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_jobs(self, obj):
        return obj.jobs.count()

    def get_total_spent(self, obj):
        total = obj.jobs.filter(status='PAID').aggregate(
            total=Sum('final_total')
        )['total'] or Decimal('0.00')
        return total

    def get_last_service_date(self, obj):
        last_job = obj.jobs.order_by('-created_at').first()
        return last_job.created_at if last_job else None

    def get_recent_jobs(self, obj):
        recent_jobs = obj.jobs.order_by('-created_at')[:5]
        jobs_data = []
        for job in recent_jobs:
            jobs_data.append({
                'id': job.id,
                'job_number': job.job_number,
                'notes': job.notes or '',
                'status': job.status,
                'total_cost': job.final_total or Decimal('0.00'),
                'created_at': job.created_at,
            })
        return jobs_data


class JobLineSerializer(serializers.ModelSerializer):
    # Use UUIDField to avoid DRF conversion issues
    service_variant = serializers.UUIDField()
    service_variant_name = serializers.CharField(source='service_variant.__str__', read_only=True)
    service_name = serializers.CharField(source='service_variant.service.name', read_only=True)
    part_name = serializers.CharField(source='service_variant.part.get_full_path', read_only=True)
    is_below_floor = serializers.SerializerMethodField()
    duration_minutes = serializers.IntegerField(
        source='service_variant.service.duration_estimate_minutes', read_only=True
    )
    inventory_items = JobLineInventorySerializer(many=True, required=False)
    # Use custom field to handle both reading (User objects -> UUIDs) and writing (UUIDs -> User objects)
    assigned_employees = serializers.SerializerMethodField()
    assigned_employee_names = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = JobLine
        fields = [
            'id', 'service_variant', 'service_variant_name', 'service_name',
            'part_name', 'quantity', 'unit_price', 'discount_percentage',
            'discount_amount', 'total_amount', 'duration_minutes',
            'notes', 'is_completed', 'completed_at', 'is_below_floor',
            'inventory_items', 'assigned_employees', 'assigned_employee_names',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'discount_amount', 'total_amount', 'created_at', 'updated_at'
        ]

    def get_is_below_floor(self, obj):
        return obj.is_price_below_floor()

    def get_assigned_employees(self, obj):
        """Convert ManyRelatedManager to list of UUID strings"""
        if hasattr(obj, 'pk') and obj.pk:
            # When reading existing object, return UUIDs
            return [str(emp.id) for emp in obj.assigned_employees.all()]
        return []

    def get_assigned_employee_names(self, obj):
        return [emp.get_full_name() for emp in obj.assigned_employees.all()]

    def validate_unit_price(self, value):
        # Check if the price is below floor price
        # Skip floor price validation for now - it will be handled in the view
        return value

    def to_internal_value(self, data):
        """Handle incoming assigned_employees UUIDs from the request"""
        # Make a copy so we don't modify the original data
        data_copy = data.copy()

        # Extract assigned_employees before calling super() so it doesn't try to validate with SerializerMethodField
        assigned_employees = data_copy.pop('assigned_employees', [])

        # Call parent's to_internal_value
        internal_data = super().to_internal_value(data_copy)

        # Add assigned_employees back to the validated data
        internal_data['assigned_employees'] = assigned_employees

        return internal_data

    def validate(self, data):
        # Validate assigned_employees UUIDs
        if 'assigned_employees' in data:
            assigned_employees = data['assigned_employees']
            if assigned_employees:
                # Validate that all are valid UUID strings
                for emp_id in assigned_employees:
                    try:
                        import uuid
                        uuid.UUID(str(emp_id))
                    except (ValueError, AttributeError):
                        raise serializers.ValidationError({'assigned_employees': f'Invalid UUID: {emp_id}'})

        # Skip floor price validation for now - it will be handled in the view
        return data

    def save(self, **kwargs):
        # Extract job from kwargs if provided
        job = kwargs.pop('job', None)
        if job:
            # If job is provided, add it to the data that will be passed to create
            self._job = job
        return super().save(**kwargs)

    def create(self, validated_data):
        inventory_items_data = validated_data.pop('inventory_items', [])
        assigned_employee_uuids = validated_data.pop('assigned_employees', [])

        # Convert service_variant UUID to ServiceVariant object
        service_variant_uuid = validated_data.pop('service_variant')
        try:
            service_variant = ServiceVariant.objects.get(id=service_variant_uuid)
            validated_data['service_variant'] = service_variant
        except ServiceVariant.DoesNotExist:
            raise serializers.ValidationError({'service_variant': 'Invalid ServiceVariant ID'})

        # Add job if it was passed via save()
        if hasattr(self, '_job'):
            validated_data['job'] = self._job

        job_line = super().create(validated_data)

        # Convert assigned_employees UUIDs to User objects and set them
        if assigned_employee_uuids:
            employees = User.objects.filter(id__in=assigned_employee_uuids, is_active=True)
            if employees.count() != len(assigned_employee_uuids):
                raise serializers.ValidationError({'assigned_employees': 'One or more employee IDs are invalid'})
            job_line.assigned_employees.set(employees)

        # Create inventory items if provided
        for item_data in inventory_items_data:
            inventory_serializer = JobLineInventorySerializer(data=item_data)
            inventory_serializer.is_valid(raise_exception=True)
            inventory_serializer.save(job_line=job_line)

        return job_line


class JobConsumptionSerializer(serializers.ModelSerializer):
    sku_name = serializers.CharField(source='sku.name', read_only=True)
    sku_unit = serializers.CharField(source='sku.unit', read_only=True)
    variance_percentage = serializers.SerializerMethodField()
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)

    class Meta:
        model = JobConsumption
        fields = [
            'id', 'sku', 'sku_name', 'sku_unit', 'standard_quantity',
            'actual_quantity', 'variance', 'variance_percentage',
            'cost_per_unit', 'total_cost', 'reason_for_variance',
            'approved_by', 'approved_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'variance', 'total_cost', 'created_at', 'updated_at']

    def get_variance_percentage(self, obj):
        if obj.standard_quantity > 0:
            return (obj.variance / obj.standard_quantity * 100)
        return 0 if obj.variance == 0 else 100


class JobSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    vehicle_display = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    technician_name = serializers.CharField(source='assigned_technician.get_full_name', read_only=True)
    lines = JobLineSerializer(many=True, required=False)
    consumptions = JobConsumptionSerializer(source='lines__consumptions', many=True, read_only=True)
    payments_total = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    estimated_duration = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id', 'job_number', 'customer', 'customer_name', 'customer_phone',
            'vehicle', 'vehicle_display', 'status', 'estimate_total', 'final_total',
            'discount_amount', 'tax_amount', 'payments_total', 'balance_due',
            'lines', 'consumptions', 'created_by', 'created_by_name',
            'assigned_technician', 'technician_name', 'estimated_start_time',
            'estimated_completion_time', 'actual_start_time', 'actual_completion_time',
            'estimated_duration', 'notes', 'internal_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'job_number', 'created_by', 'payments_total', 'balance_due',
            'created_at', 'updated_at'
        ]

    def get_payments_total(self, obj):
        return obj.payments.filter(status='COMPLETED').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

    def get_balance_due(self, obj):
        payments_total = self.get_payments_total(obj)
        return obj.final_total - payments_total

    def get_estimated_duration(self, obj):
        return obj.get_duration_estimate_minutes()

    def get_vehicle_display(self, obj):
        return str(obj.vehicle) if obj.vehicle else None

    def validate(self, data):
        # Convert empty strings to None for customer and vehicle (walk-in support)
        if data.get('customer') == '':
            data['customer'] = None
        if data.get('vehicle') == '':
            data['vehicle'] = None
        return data

    def create(self, validated_data):
        request = self.context.get('request')

        # Generate job number
        job_count = Job.objects.count() + 1
        job_number = f"JOB-{date.today().year}-{job_count:03d}"
        validated_data['job_number'] = job_number

        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        return super().create(validated_data)

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)

        # Update job instance with basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # If lines data is provided, update the job lines
        if lines_data is not None:
            # Delete existing commissions for this job before deleting job lines
            Commission.objects.filter(job=instance).delete()

            # Clear existing job lines (this will also clear inventory items due to CASCADE)
            instance.lines.all().delete()

            # Create new job lines using JobLineSerializer and calculate totals
            estimate_total = Decimal('0.00')
            for line_data in lines_data:
                line_serializer = JobLineSerializer(data=line_data, context=self.context)
                line_serializer.is_valid(raise_exception=True)
                line = line_serializer.save(job=instance)
                estimate_total += line.total_amount

                # Create commissions for assigned employees on the new job line
                self._create_commissions_for_job_line(line, instance)

            # Update totals
            instance.estimate_total = estimate_total
            instance.final_total = estimate_total

        instance.save()
        return instance

    def _create_commissions_for_job_line(self, job_line, job):
        """Create commission records for each employee assigned to the job line"""
        # Get all assigned employees for this job line
        assigned_employees = job_line.assigned_employees.all()

        for employee in assigned_employees:
            # Try to find service-specific commission rate first
            commission_rate_obj = EmployeeCommissionRate.objects.filter(
                employee=employee,
                service_variant=job_line.service_variant,
                is_active=True
            ).first()

            # Fall back to default rate if no service-specific rate found
            if not commission_rate_obj:
                commission_rate_obj = EmployeeCommissionRate.objects.filter(
                    employee=employee,
                    service_variant__isnull=True,
                    is_active=True
                ).first()

            # Only create commission if a rate is configured
            if commission_rate_obj:
                Commission.objects.create(
                    employee=employee,
                    job=job,
                    job_line=job_line,
                    commission_rate=commission_rate_obj.commission_percentage,
                    service_amount=job_line.total_amount,
                    status='AVAILABLE'
                )


class JobCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating jobs with lines"""
    lines = JobLineSerializer(many=True)

    class Meta:
        model = Job
        fields = [
            'customer', 'vehicle', 'assigned_technician', 'estimated_start_time',
            'estimated_completion_time', 'notes', 'internal_notes', 'lines'
        ]

    def to_internal_value(self, data):
        return super().to_internal_value(data)

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        request = self.context.get('request')

        # Generate job number
        job_count = Job.objects.count() + 1
        job_number = f"JOB-{date.today().year}-{job_count:03d}"
        validated_data['job_number'] = job_number

        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        job = Job.objects.create(**validated_data)

        # Create job lines using JobLineSerializer and calculate totals
        estimate_total = Decimal('0.00')
        for line_data in lines_data:
            line_serializer = JobLineSerializer(data=line_data, context=self.context)
            line_serializer.is_valid(raise_exception=True)
            line = line_serializer.save(job=job)
            estimate_total += line.total_amount

            # Create commissions for assigned employees
            self._create_commissions_for_job_line(line, job)

        job.estimate_total = estimate_total
        job.final_total = estimate_total
        job.save()

        return job

    def _create_commissions_for_job_line(self, job_line, job):
        """Create commission records for each employee assigned to the job line"""
        # Get all assigned employees for this job line
        assigned_employees = job_line.assigned_employees.all()

        for employee in assigned_employees:
            # Try to find service-specific commission rate first
            commission_rate_obj = EmployeeCommissionRate.objects.filter(
                employee=employee,
                service_variant=job_line.service_variant,
                is_active=True
            ).first()

            # Fall back to default rate if no service-specific rate found
            if not commission_rate_obj:
                commission_rate_obj = EmployeeCommissionRate.objects.filter(
                    employee=employee,
                    service_variant__isnull=True,
                    is_active=True
                ).first()

            # Only create commission if a rate is configured
            if commission_rate_obj:
                Commission.objects.create(
                    employee=employee,
                    job=job,
                    job_line=job_line,
                    commission_rate=commission_rate_obj.commission_percentage,
                    service_amount=job_line.total_amount,
                    status='AVAILABLE'
                )


class OverrideRequestSerializer(serializers.ModelSerializer):
    job_number = serializers.CharField(source='job_line.job.job_number', read_only=True)
    service_name = serializers.CharField(source='job_line.service_variant.__str__', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    savings_amount = serializers.SerializerMethodField()
    savings_percentage = serializers.SerializerMethodField()

    class Meta:
        model = OverrideRequest
        fields = [
            'id', 'job_line', 'job_number', 'service_name', 'requested_price',
            'floor_price', 'savings_amount', 'savings_percentage', 'reason',
            'status', 'requested_by', 'requested_by_name', 'reviewed_by',
            'reviewed_by_name', 'review_notes', 'requested_at', 'reviewed_at'
        ]
        read_only_fields = [
            'id', 'requested_by', 'reviewed_by', 'requested_at', 'reviewed_at'
        ]

    def get_savings_amount(self, obj):
        return obj.floor_price - obj.requested_price

    def get_savings_percentage(self, obj):
        if obj.floor_price > 0:
            return ((obj.floor_price - obj.requested_price) / obj.floor_price * 100)
        return 0

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['requested_by'] = request.user
        return super().create(validated_data)


class JobMediaSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    file_size_mb = serializers.SerializerMethodField()

    class Meta:
        model = JobMedia
        fields = [
            'id', 'media_type', 'file_url', 'file_name', 'file_size',
            'file_size_mb', 'description', 'uploaded_by', 'uploaded_by_name',
            'created_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at']

    def get_file_size_mb(self, obj):
        return round(obj.file_size / (1024 * 1024), 2)

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)


class PaymentSerializer(serializers.ModelSerializer):
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    customer_name = serializers.CharField(source='job.customer.name', read_only=True)
    received_by_name = serializers.CharField(source='received_by.get_full_name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'job', 'job_number', 'customer_name', 'payment_method',
            'amount', 'reference_number', 'status', 'payment_date', 'notes',
            'received_by', 'received_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'received_by', 'created_at']

    def validate_job(self, value):
        """Prevent multiple payments for the same job"""
        # Check if job already has a completed payment
        existing_payment = Payment.objects.filter(
            job=value,
            status='COMPLETED'
        ).first()

        if existing_payment:
            raise serializers.ValidationError(
                f"Job #{value.job_number} has already been paid. "
                f"Payment #{existing_payment.id} was recorded on {existing_payment.payment_date}."
            )

        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['received_by'] = request.user
        return super().create(validated_data)


class EstimateLineSerializer(serializers.ModelSerializer):
    service_variant_name = serializers.CharField(source='service_variant.__str__', read_only=True)
    service_name = serializers.CharField(source='service_variant.service.name', read_only=True)
    part_name = serializers.CharField(source='service_variant.part.get_full_path', read_only=True)
    duration_minutes = serializers.IntegerField(
        source='service_variant.service.duration_estimate_minutes', read_only=True
    )

    class Meta:
        model = EstimateLine
        fields = [
            'id', 'service_variant', 'service_variant_name', 'service_name',
            'part_name', 'quantity', 'unit_price', 'total_amount',
            'duration_minutes', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'total_amount', 'created_at']


class EstimateSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    vehicle_display = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    lines = EstimateLineSerializer(many=True, read_only=True)
    is_expired = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()

    class Meta:
        model = Estimate
        fields = [
            'id', 'estimate_number', 'customer', 'customer_name', 'vehicle',
            'vehicle_display', 'status', 'total_amount', 'valid_until',
            'is_expired', 'days_until_expiry', 'notes', 'terms_and_conditions',
            'lines', 'created_by', 'created_by_name', 'job', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'estimate_number', 'created_by', 'job', 'created_at', 'updated_at'
        ]

    def get_is_expired(self, obj):
        return obj.valid_until < date.today()

    def get_days_until_expiry(self, obj):
        delta = obj.valid_until - date.today()
        return delta.days

    def get_vehicle_display(self, obj):
        return str(obj.vehicle) if obj.vehicle else None

    def create(self, validated_data):
        request = self.context.get('request')

        # Generate estimate number
        est_count = Estimate.objects.count() + 1
        estimate_number = f"EST-{date.today().year}-{est_count:03d}"
        validated_data['estimate_number'] = estimate_number

        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        return super().create(validated_data)


class EstimateCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating estimates with lines"""
    lines = EstimateLineSerializer(many=True)

    class Meta:
        model = Estimate
        fields = [
            'customer', 'vehicle', 'valid_until', 'notes',
            'terms_and_conditions', 'lines'
        ]

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        request = self.context.get('request')

        # Generate estimate number
        est_count = Estimate.objects.count() + 1
        estimate_number = f"EST-{date.today().year}-{est_count:03d}"
        validated_data['estimate_number'] = estimate_number

        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        estimate = Estimate.objects.create(**validated_data)

        # Create estimate lines and calculate total
        total_amount = Decimal('0.00')
        for line_data in lines_data:
            line_data['estimate'] = estimate
            line = EstimateLine.objects.create(**line_data)
            total_amount += line.total_amount

        estimate.total_amount = total_amount
        estimate.save()

        return estimate


class JobSummarySerializer(serializers.Serializer):
    """Summary serializer for dashboard"""
    total_jobs = serializers.IntegerField(read_only=True)
    jobs_in_progress = serializers.IntegerField(read_only=True)
    jobs_completed_today = serializers.IntegerField(read_only=True)
    total_revenue_today = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_revenue_month = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    pending_payments = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    override_requests_pending = serializers.IntegerField(read_only=True)


class CustomerJobHistorySerializer(serializers.ModelSerializer):
    """Simplified job serializer for customer history"""
    vehicle_display = serializers.SerializerMethodField()
    services_summary = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id', 'job_number', 'vehicle_display', 'status', 'final_total',
            'services_summary', 'created_at'
        ]

    def get_services_summary(self, obj):
        services = []
        for line in obj.lines.all()[:3]:  # Show first 3 services
            services.append(f"{line.service_variant.service.name}")
        if obj.lines.count() > 3:
            services.append(f"+ {obj.lines.count() - 3} more")
        return ", ".join(services)

    def get_vehicle_display(self, obj):
        return str(obj.vehicle) if obj.vehicle else None


class ROIReportSerializer(serializers.Serializer):
    """Serializer for ROI and profitability reports"""
    job_number = serializers.CharField(read_only=True)
    customer_name = serializers.CharField(read_only=True)
    service_name = serializers.CharField(read_only=True)
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    material_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    labor_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    overhead_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    gross_profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    margin_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    completed_date = serializers.DateTimeField(read_only=True)

class InvoiceSerializer(serializers.ModelSerializer):
    """Invoice serializer"""
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    customer_name = serializers.CharField(source='job.customer.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'job', 'job_number', 'customer_name',
            'status', 'issue_date', 'due_date', 'subtotal', 'tax_amount',
            'discount_amount', 'total_amount', 'notes', 'terms_and_conditions',
            'created_by', 'created_by_name', 'sent_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'issue_date', 'created_at', 'updated_at']


class ReceiptSerializer(serializers.ModelSerializer):
    """Receipt serializer"""
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    customer_name = serializers.CharField(source='job.customer.name', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    issued_by_name = serializers.CharField(source='issued_by.get_full_name', read_only=True)

    class Meta:
        model = Receipt
        fields = [
            'id', 'receipt_number', 'job', 'job_number', 'customer_name',
            'invoice', 'invoice_number', 'payment', 'amount_paid',
            'payment_method', 'payment_reference', 'notes', 'issued_by',
            'issued_by_name', 'issued_at'
        ]
        read_only_fields = ['id', 'receipt_number', 'issued_at']


class EmployeeCommissionRateSerializer(serializers.ModelSerializer):
    """Serializer for employee commission rates"""
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    employee_email = serializers.EmailField(source='employee.email', read_only=True)
    service_variant_name = serializers.CharField(source='service_variant.__str__', read_only=True)
    service_name = serializers.CharField(source='service_variant.service.name', read_only=True)
    part_name = serializers.CharField(source='service_variant.part.get_full_path', read_only=True)

    class Meta:
        model = EmployeeCommissionRate
        fields = [
            'id', 'employee', 'employee_name', 'employee_email',
            'service_variant', 'service_variant_name', 'service_name', 'part_name',
            'commission_percentage', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        # Check for duplicate commission rate
        employee = data.get('employee')
        service_variant = data.get('service_variant')

        # If updating, exclude current instance from uniqueness check
        if self.instance:
            existing = EmployeeCommissionRate.objects.filter(
                employee=employee,
                service_variant=service_variant
            ).exclude(id=self.instance.id)
        else:
            existing = EmployeeCommissionRate.objects.filter(
                employee=employee,
                service_variant=service_variant
            )

        if existing.exists():
            service_name = service_variant.__str__() if service_variant else 'Default'
            raise serializers.ValidationError(
                f'Commission rate for {employee.get_full_name()} on {service_name} already exists'
            )

        return data


class CommissionSerializer(serializers.ModelSerializer):
    """Serializer for employee commissions"""
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    employee_email = serializers.EmailField(source='employee.email', read_only=True)
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    customer_name = serializers.CharField(source='job.customer.name', read_only=True)
    service_variant_name = serializers.CharField(source='job_line.service_variant.__str__', read_only=True)
    service_name = serializers.CharField(source='job_line.service_variant.service.name', read_only=True)
    paid_by_name = serializers.CharField(source='paid_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Commission
        fields = [
            'id', 'employee', 'employee_name', 'employee_email',
            'job', 'job_number', 'customer_name', 'job_line',
            'service_variant_name', 'service_name', 'commission_rate',
            'service_amount', 'commission_amount', 'status', 'status_display',
            'paid_at', 'paid_by', 'paid_by_name', 'payment_reference',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'commission_amount', 'created_at', 'updated_at'
        ]

    def validate_status(self, value):
        """Validate status transitions"""
        if self.instance:
            old_status = self.instance.status

            # Define valid status transitions
            valid_transitions = {
                'AVAILABLE': ['PAYABLE', 'CANCELLED'],
                'PAYABLE': ['PAID', 'CANCELLED'],
                'PAID': [],  # Cannot transition from PAID
                'CANCELLED': [],  # Cannot transition from CANCELLED
            }

            if old_status in valid_transitions:
                if value != old_status and value not in valid_transitions[old_status]:
                    raise serializers.ValidationError(
                        f'Cannot transition from {old_status} to {value}'
                    )

        return value

    def update(self, instance, validated_data):
        """Handle status updates with auto-timestamps"""
        new_status = validated_data.get('status', instance.status)

        # Auto-set paid_at and paid_by when status changes to PAID
        if new_status == 'PAID' and instance.status != 'PAID':
            request = self.context.get('request')
            if request and hasattr(request, 'user'):
                validated_data['paid_by'] = request.user
            from django.utils import timezone
            validated_data['paid_at'] = timezone.now()

        return super().update(instance, validated_data)


class CommissionSummarySerializer(serializers.Serializer):
    """Serializer for commission summary statistics"""
    employee = serializers.UUIDField(read_only=True)
    employee_name = serializers.CharField(read_only=True)
    total_available = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_payable = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    count_available = serializers.IntegerField(read_only=True)
    count_payable = serializers.IntegerField(read_only=True)
    count_paid = serializers.IntegerField(read_only=True)
    unrecovered_advances = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)


class TipListSerializer(serializers.ModelSerializer):
    """Serializer for listing tips"""
    employee_name = serializers.SerializerMethodField()
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    customer_name = serializers.CharField(source='job.customer.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True, allow_null=True)

    class Meta:
        model = Tip
        fields = [
            'id', 'job', 'job_number', 'customer_name',
            'employee', 'employee_name', 'amount',
            'status', 'status_display',
            'payment_method', 'payment_method_display',
            'payment_reference', 'paid_at',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class TipDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for tip with all information"""
    employee_name = serializers.SerializerMethodField()
    employee_email = serializers.EmailField(source='employee.email', read_only=True)
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    customer_name = serializers.CharField(source='job.customer.name', read_only=True)
    recorded_by_name = serializers.SerializerMethodField()
    paid_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True, allow_null=True)

    class Meta:
        model = Tip
        fields = [
            'id', 'job', 'job_number', 'customer_name',
            'employee', 'employee_name', 'employee_email',
            'amount', 'status', 'status_display',
            'payment_method', 'payment_method_display',
            'payment_reference', 'paid_at', 'paid_by', 'paid_by_name',
            'recorded_by', 'recorded_by_name', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'recorded_by', 'paid_by', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return f"{obj.recorded_by.first_name} {obj.recorded_by.last_name}"
        return None

    def get_paid_by_name(self, obj):
        if obj.paid_by:
            return f"{obj.paid_by.first_name} {obj.paid_by.last_name}"
        return None


class TipCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating tips"""

    class Meta:
        model = Tip
        fields = ['job', 'employee', 'amount', 'notes']

    def validate(self, attrs):
        # Ensure employee worked on this job
        job = attrs.get('job')
        employee = attrs.get('employee')

        if not job.lines.filter(assigned_employees=employee).exists():
            raise serializers.ValidationError(
                "Employee must have worked on this job to receive a tip"
            )

        return attrs


class TipPaySerializer(serializers.Serializer):
    """Serializer for marking tip as paid"""
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHODS)
    payment_reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    payment_notes = serializers.CharField(required=False, allow_blank=True)


class AdvancePaymentListSerializer(serializers.ModelSerializer):
    """Serializer for listing advance payments"""
    employee_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True, allow_null=True)

    class Meta:
        model = AdvancePayment
        fields = [
            'id', 'employee', 'employee_name',
            'requested_amount', 'approved_amount', 'available_commission',
            'status', 'status_display', 'payment_method', 'payment_method_display',
            'payment_reference', 'reason',
            'requested_at', 'reviewed_at', 'paid_at'
        ]
        read_only_fields = ['id', 'requested_at']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class AdvancePaymentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for advance payment with all information"""
    employee_name = serializers.SerializerMethodField()
    employee_email = serializers.EmailField(source='employee.email', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()
    paid_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True, allow_null=True)

    class Meta:
        model = AdvancePayment
        fields = [
            'id', 'employee', 'employee_name', 'employee_email',
            'requested_amount', 'approved_amount', 'available_commission',
            'status', 'status_display',
            'payment_method', 'payment_method_display',
            'payment_reference', 'reason',
            'requested_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_name',
            'paid_at', 'paid_by', 'paid_by_name',
            'review_notes', 'payment_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'reviewed_by', 'paid_by',
            'requested_at', 'reviewed_at', 'paid_at',
            'created_at', 'updated_at'
        ]

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}"
        return None

    def get_paid_by_name(self, obj):
        if obj.paid_by:
            return f"{obj.paid_by.first_name} {obj.paid_by.last_name}"
        return None


class AdvancePaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating advance payments - marked as PAID directly"""
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHODS)
    payment_reference = serializers.CharField(max_length=100, required=False, allow_blank=True)

    class Meta:
        model = AdvancePayment
        fields = ['employee', 'requested_amount', 'reason', 'payment_method', 'payment_reference']
        extra_kwargs = {
            'employee': {'required': False}
        }

    def validate_requested_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Requested amount must be greater than zero")
        return value

    def create(self, validated_data):
        # Get employee from validated_data or context (request user)
        # If employee is provided and user is manager/admin, use that employee
        # Otherwise, use the current user
        request_user = self.context['request'].user
        employee = validated_data.pop('employee', None)

        # Check if user can record advances for others (ADMIN or MANAGER)
        can_record_for_others = request_user.role in ['ADMIN', 'MANAGER']

        if employee and can_record_for_others:
            # Manager/Admin recording advance for another employee
            pass
        elif employee and not can_record_for_others:
            # Regular user trying to record for someone else - not allowed
            raise serializers.ValidationError({
                'employee': 'You do not have permission to record advances for other employees'
            })
        else:
            # Employee not provided, use current user
            employee = request_user

        # Check if employee already has an advance recorded today
        from django.utils import timezone
        today = timezone.now().date()
        existing_advance_today = AdvancePayment.objects.filter(
            employee=employee,
            requested_at__date=today
        ).exists()

        if existing_advance_today:
            raise serializers.ValidationError(
                'An advance payment has already been recorded for this employee today. '
                'Only one advance can be recorded per employee per day.'
            )

        # Calculate available commission
        from django.db.models import Sum, Q
        pending_commission = Commission.objects.filter(
            employee=employee,
            status__in=['AVAILABLE', 'PAYABLE']
        ).aggregate(total=Sum('commission_amount'))['total'] or Decimal('0.00')

        # Subtract unrecovered advances (APPROVED or PAID status)
        unrecovered_advances = AdvancePayment.objects.filter(
            employee=employee,
            status__in=['APPROVED', 'PAID']
        ).aggregate(total=Sum('approved_amount'))['total'] or Decimal('0.00')

        available_commission = max(pending_commission - unrecovered_advances, Decimal('0.00'))

        # Validate against available commission
        if validated_data['requested_amount'] > available_commission:
            raise serializers.ValidationError(
                f"Requested amount ({validated_data['requested_amount']}) exceeds available commission after deducting unrecovered advances. "
                f"Total commission: {pending_commission}, Unrecovered advances: {unrecovered_advances}, Available: {available_commission}"
            )

        # Extract payment information
        payment_method = validated_data.pop('payment_method')
        payment_reference = validated_data.pop('payment_reference', '')

        # Set advance as PAID directly
        from django.utils import timezone
        validated_data['employee'] = employee
        validated_data['available_commission'] = available_commission
        validated_data['approved_amount'] = validated_data['requested_amount']
        validated_data['status'] = 'PAID'
        validated_data['payment_method'] = payment_method
        validated_data['payment_reference'] = payment_reference
        validated_data['reviewed_at'] = timezone.now()
        validated_data['reviewed_by'] = self.context['request'].user
        validated_data['paid_at'] = timezone.now()
        validated_data['paid_by'] = self.context['request'].user

        return super().create(validated_data)


class AdvancePaymentReviewSerializer(serializers.Serializer):
    """Serializer for reviewing advance payment requests"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    approved_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        min_value=Decimal('0.01')
    )
    review_notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['action'] == 'approve' and not attrs.get('approved_amount'):
            raise serializers.ValidationError({
                'approved_amount': 'Approved amount is required when approving'
            })
        return attrs


class AdvancePaymentPaySerializer(serializers.Serializer):
    """Serializer for marking advance payment as paid"""
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHODS)
    payment_reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    payment_notes = serializers.CharField(required=False, allow_blank=True)


class AdvancePaymentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating advance payment requests"""

    class Meta:
        model = AdvancePayment
        fields = ['requested_amount', 'reason']

    def validate_requested_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Requested amount must be greater than zero")
        return value

    def validate(self, attrs):
        # Can only edit pending requests
        if self.instance and self.instance.status != 'PENDING':
            raise serializers.ValidationError("Only pending advance requests can be edited")
        return attrs

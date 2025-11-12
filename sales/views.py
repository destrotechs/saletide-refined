from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Q, Count, Sum, F, Avg
from decimal import Decimal
from datetime import datetime, timedelta

from .models import (
    Customer, Vehicle, Job, JobLine, OverrideRequest, Payment,
    JobMedia, JobConsumption, Estimate, EstimateLine, Invoice, Receipt,
    JobLineInventory, EmployeeCommissionRate, Commission, Tip, AdvancePayment
)
from inventory.models import StockLedger, StockLocation
from .serializers import (
    CustomerSerializer, VehicleSerializer, JobSerializer, JobLineSerializer,
    OverrideRequestSerializer, PaymentSerializer, JobMediaSerializer,
    JobConsumptionSerializer, EstimateSerializer, EstimateLineSerializer,
    JobCreateSerializer, EstimateCreateSerializer, InvoiceSerializer, ReceiptSerializer,
    EmployeeCommissionRateSerializer, CommissionSerializer, CommissionSummarySerializer,
    TipListSerializer, TipDetailSerializer, TipCreateSerializer, TipPaySerializer,
    AdvancePaymentListSerializer, AdvancePaymentDetailSerializer,
    AdvancePaymentCreateSerializer, AdvancePaymentReviewSerializer, AdvancePaymentPaySerializer,
    AdvancePaymentUpdateSerializer
)
from authentication.permissions import IsAdmin, IsManager


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'phone', 'email', 'national_id']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            if not self.request.query_params.get('show_all'):
                queryset = queryset.filter(is_active=True)
        return queryset

    @extend_schema(
        summary="Get customer statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        stats = {
            'total_customers': Customer.objects.count(),
            'active_customers': Customer.objects.filter(is_active=True).count(),
            'customers_with_vehicles': Customer.objects.filter(
                vehicles__isnull=False
            ).distinct().count(),
            'customers_with_jobs': Customer.objects.filter(
                jobs__isnull=False
            ).distinct().count(),
        }
        return Response(stats)

    @extend_schema(
        summary="Search customers by phone or name",
        responses={200: CustomerSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Query parameter q is required'},
                          status=status.HTTP_400_BAD_REQUEST)

        customers = Customer.objects.filter(
            Q(name__icontains=query) |
            Q(phone__icontains=query) |
            Q(email__icontains=query)
        ).filter(is_active=True)[:10]

        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.select_related('customer', 'vehicle_class').all()
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['customer', 'vehicle_class']
    search_fields = ['plate_number', 'make', 'model', 'vin']
    ordering_fields = ['plate_number', 'created_at']
    ordering = ['plate_number']

    @extend_schema(
        summary="Get vehicle service history",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['get'])
    def service_history(self, request, pk=None):
        vehicle = self.get_object()
        jobs = Job.objects.filter(vehicle=vehicle).prefetch_related(
            'lines__service_variant__service'
        ).order_by('-created_at')

        history = []
        for job in jobs:
            history.append({
                'job_id': job.id,
                'job_number': job.job_number,
                'date': job.created_at.date(),
                'status': job.status,
                'total_amount': float(job.final_total),
                'services': [line.service_variant.service.name
                           for line in job.lines.all() if line.service_variant]
            })

        return Response({
            'vehicle': {
                'id': vehicle.id,
                'plate_number': vehicle.plate_number,
                'make_model': f"{vehicle.make} {vehicle.model}",
            },
            'service_history': history,
            'total_jobs': len(history),
            'total_spent': sum(job['total_amount'] for job in history)
        })


class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.select_related(
        'customer', 'vehicle', 'created_by', 'assigned_technician'
    ).prefetch_related('lines').all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['customer', 'vehicle', 'status', 'assigned_technician']
    search_fields = ['job_number', 'customer__name', 'vehicle__plate_number']
    ordering_fields = ['created_at', 'final_total']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by employee assigned to job lines
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(
                Q(assigned_technician_id=employee_id) |
                Q(lines__assigned_employees__id=employee_id)
            ).distinct()

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return JobCreateSerializer
        return JobSerializer

    @extend_schema(
        summary="Complete a job",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        job = self.get_object()

        if job.status != 'IN_PROGRESS':
            return Response(
                {'error': 'Only in-progress jobs can be completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Process inventory consumption for all job lines
        inventory_consumed = []
        try:
            # Get the default/main stock location - assuming first location exists
            try:
                stock_location = StockLocation.objects.first()
                if not stock_location:
                    return Response(
                        {'error': 'No stock location found. Please configure a stock location first.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception:
                return Response(
                    {'error': 'Error accessing stock location'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Process each job line's inventory items
            for job_line in job.lines.all():
                for inventory_item in job_line.inventory_items.all():
                    # Check current stock
                    current_stock = StockLedger.objects.filter(
                        sku=inventory_item.sku,
                        location=stock_location
                    ).aggregate(
                        total=Sum('quantity_change')
                    )['total'] or Decimal('0')

                    if current_stock < inventory_item.quantity_used:
                        return Response(
                            {
                                'error': f'Insufficient stock for {inventory_item.sku.name}. '
                                        f'Available: {current_stock} {inventory_item.sku.unit}, '
                                        f'Required: {inventory_item.quantity_used} {inventory_item.sku.unit}'
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # Create stock consumption entry
                    stock_entry = StockLedger.objects.create(
                        sku=inventory_item.sku,
                        location=stock_location,
                        quantity_change=-inventory_item.quantity_used,  # Negative for consumption
                        transaction_type='CONSUMPTION',
                        reason=f'Job completion - {job.job_number}',
                        reference_type='JOB',
                        reference_id=str(job.id),
                        cost_at_transaction=inventory_item.sku.cost,
                        created_by=request.user
                    )

                    inventory_consumed.append({
                        'sku_name': inventory_item.sku.name,
                        'quantity_consumed': inventory_item.quantity_used,
                        'unit': inventory_item.sku.unit
                    })

            # Update job status after successful inventory processing
            job.status = 'COMPLETED'
            job.completed_at = datetime.now()
            job.save()

            return Response({
                'message': 'Job completed successfully',
                'job_number': job.job_number,
                'status': job.status,
                'inventory_consumed': inventory_consumed
            })

        except Exception as e:
            return Response(
                {'error': f'Error processing inventory: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        summary="Get job statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        thirty_days_ago = datetime.now() - timedelta(days=30)

        stats = {
            'total_jobs': Job.objects.count(),
            'jobs_last_30_days': Job.objects.filter(
                created_at__gte=thirty_days_ago
            ).count(),
            'pending_jobs': Job.objects.filter(status='PENDING').count(),
            'in_progress_jobs': Job.objects.filter(status='IN_PROGRESS').count(),
            'completed_jobs': Job.objects.filter(status='COMPLETED').count(),
            'total_revenue': Job.objects.aggregate(
                total=Sum('total_amount')
            )['total'] or 0,
            'average_job_value': Job.objects.aggregate(
                avg=Avg('total_amount')
            )['avg'] or 0
        }

        return Response(stats)


class JobLineViewSet(viewsets.ModelViewSet):
    queryset = JobLine.objects.select_related('job', 'service_variant').all()
    serializer_class = JobLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['job', 'service_variant']
    search_fields = ['service_variant__service__name']
    ordering_fields = ['created_at']
    ordering = ['created_at']


class OverrideRequestViewSet(viewsets.ModelViewSet):
    queryset = OverrideRequest.objects.select_related(
        'job_line', 'requested_by', 'approved_by'
    ).all()
    serializer_class = OverrideRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'requested_by', 'approved_by']
    search_fields = ['job_line__job__job_number', 'reason']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    @extend_schema(
        summary="Approve price override request",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        override_request = self.get_object()

        if override_request.status != 'PENDING':
            return Response(
                {'error': 'Only pending requests can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Approve the request
        override_request.status = 'APPROVED'
        override_request.approved_by = request.user
        override_request.approved_at = datetime.now()
        override_request.save()

        # Update the job line price
        job_line = override_request.job_line
        job_line.unit_price = override_request.new_price
        job_line.total_price = job_line.quantity * override_request.new_price
        job_line.save()

        # Recalculate job total
        job = job_line.job
        job.total_amount = job.lines.aggregate(
            total=Sum('total_price')
        )['total'] or Decimal('0.00')
        job.save()

        return Response({
            'message': 'Override request approved successfully',
            'request_id': override_request.id,
            'new_price': override_request.new_price
        })

    @extend_schema(
        summary="Reject price override request",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        override_request = self.get_object()

        if override_request.status != 'PENDING':
            return Response(
                {'error': 'Only pending requests can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )

        override_request.status = 'REJECTED'
        override_request.approved_by = request.user
        override_request.approved_at = datetime.now()
        override_request.save()

        return Response({
            'message': 'Override request rejected',
            'request_id': override_request.id
        })


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('job', 'processed_by').all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['job', 'payment_method', 'status']
    search_fields = ['job__job_number', 'reference_number']
    ordering_fields = ['payment_date', 'amount']
    ordering = ['-payment_date']

    @extend_schema(
        summary="Get payment statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        thirty_days_ago = datetime.now() - timedelta(days=30)

        stats = {
            'total_payments': Payment.objects.count(),
            'payments_last_30_days': Payment.objects.filter(
                payment_date__gte=thirty_days_ago
            ).count(),
            'total_collected': Payment.objects.filter(
                status='COMPLETED'
            ).aggregate(total=Sum('amount'))['total'] or 0,
            'pending_payments': Payment.objects.filter(
                status='PENDING'
            ).aggregate(total=Sum('amount'))['total'] or 0,
            'cash_payments': Payment.objects.filter(
                payment_method='CASH',
                status='COMPLETED'
            ).aggregate(total=Sum('amount'))['total'] or 0,
            'card_payments': Payment.objects.filter(
                payment_method__in=['CARD', 'MOBILE_MONEY'],
                status='COMPLETED'
            ).aggregate(total=Sum('amount'))['total'] or 0,
        }

        return Response(stats)


class JobMediaViewSet(viewsets.ModelViewSet):
    queryset = JobMedia.objects.select_related('job', 'uploaded_by').all()
    serializer_class = JobMediaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['job', 'media_type', 'uploaded_by']
    search_fields = ['job__job_number', 'description']
    ordering_fields = ['uploaded_at']
    ordering = ['-uploaded_at']


class JobConsumptionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JobConsumption.objects.select_related('job', 'sku', 'location').all()
    serializer_class = JobConsumptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['job', 'sku', 'location']
    search_fields = ['job__job_number', 'sku__name']
    ordering_fields = ['consumed_at']
    ordering = ['-consumed_at']


class EstimateViewSet(viewsets.ModelViewSet):
    queryset = Estimate.objects.select_related(
        'customer', 'vehicle', 'created_by'
    ).prefetch_related('lines').all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['customer', 'vehicle', 'status']
    search_fields = ['estimate_number', 'customer__name', 'vehicle__plate_number']
    ordering_fields = ['created_at', 'valid_until', 'total_amount']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return EstimateCreateSerializer
        return EstimateSerializer

    @extend_schema(
        summary="Convert estimate to job",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'])
    def convert_to_job(self, request, pk=None):
        estimate = self.get_object()

        if estimate.status != 'PENDING':
            return Response(
                {'error': 'Only pending estimates can be converted to jobs'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create job from estimate
        job_data = {
            'customer': estimate.customer,
            'vehicle': estimate.vehicle,
            'branch': estimate.branch,
            'created_by': request.user,
            'notes': estimate.notes,
        }

        from .models import Job
        job = Job.objects.create(**job_data)

        # Create job lines from estimate lines
        for est_line in estimate.lines.all():
            JobLine.objects.create(
                job=job,
                service_variant=est_line.service_variant,
                quantity=est_line.quantity,
                unit_price=est_line.unit_price,
                total_price=est_line.total_price,
                notes=est_line.notes
            )

        # Update job total
        job.total_amount = job.lines.aggregate(
            total=Sum('total_price')
        )['total'] or Decimal('0.00')
        job.save()

        # Update estimate status
        estimate.status = 'CONVERTED'
        estimate.save()

        return Response({
            'message': 'Estimate converted to job successfully',
            'job_id': job.id,
            'job_number': job.job_number
        })

    @extend_schema(
        summary="Get estimate statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        stats = {
            'total_estimates': Estimate.objects.count(),
            'pending_estimates': Estimate.objects.filter(status='PENDING').count(),
            'accepted_estimates': Estimate.objects.filter(status='ACCEPTED').count(),
            'converted_estimates': Estimate.objects.filter(status='CONVERTED').count(),
            'rejected_estimates': Estimate.objects.filter(status='REJECTED').count(),
            'total_estimated_value': Estimate.objects.aggregate(
                total=Sum('total_amount')
            )['total'] or 0,
            'conversion_rate': 0
        }

        if stats['total_estimates'] > 0:
            stats['conversion_rate'] = (
                stats['converted_estimates'] / stats['total_estimates'] * 100
            )

        return Response(stats)


class EstimateLineViewSet(viewsets.ModelViewSet):
    queryset = EstimateLine.objects.select_related('estimate', 'service_variant').all()
    serializer_class = EstimateLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estimate', 'service_variant']
    search_fields = ['service_variant__service__name']
    ordering_fields = ['created_at']
    ordering = ['created_at']

class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoices
    """
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'job', 'job__customer', 'created_by']
    search_fields = ['invoice_number', 'job__job_number', 'job__customer__name']
    ordering_fields = ['created_at', 'issue_date', 'due_date', 'total_amount']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        """Set the created_by field to the current user"""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def generate_from_job(self, request, pk=None):
        """Generate invoice from a job"""
        try:
            job = Job.objects.get(pk=pk)
            
            # Check if job can be invoiced
            if job.status not in ['QC','IN_PROGRESS','CLOSED','COMPLETED']:
                return Response(
                    {'error': 'Job must be in QC/IN PROGRESS/CLOSED/COMPLETED status to generate invoice'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if invoice already exists
            if hasattr(job, 'invoice'):
                return Response(
                    {'error': 'Invoice already exists for this job'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create invoice
            invoice = Invoice.objects.create(
                job=job,
                created_by=request.user
            )
            
            # Update job status to INVOICED
            job.status = 'INVOICED'
            job.save()
            
            serializer = self.get_serializer(invoice)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def send_invoice(self, request, pk=None):
        """Mark invoice as sent"""
        invoice = self.get_object()
        invoice.status = 'SENT'
        invoice.sent_at = datetime.now()
        invoice.save()
        
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)


class ReceiptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing receipts
    """
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['job', 'payment', 'payment_method', 'issued_by']
    search_fields = ['receipt_number', 'job__job_number', 'job__customer__name']
    ordering_fields = ['issued_at', 'amount_paid']
    ordering = ['-issued_at']

    def perform_create(self, serializer):
        """Set the issued_by field to the current user"""
        serializer.save(issued_by=self.request.user)

    @action(detail=False, methods=['post'])
    def generate_from_payment(self, request):
        """Generate receipt from a payment, optionally recording tips for employees"""
        payment_id = request.data.get('payment_id')
        tips_data = request.data.get('tips', [])  # Array of {employee_id, amount, notes}

        if not payment_id:
            return Response(
                {'error': 'payment_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment = Payment.objects.get(pk=payment_id)

            # Check if receipt already exists for this payment
            if hasattr(payment, 'receipts') and payment.receipts.exists():
                return Response(
                    {'error': 'Receipt already exists for this payment'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get invoice if exists
            invoice = None
            if hasattr(payment.job, 'invoice'):
                invoice = payment.job.invoice

            # Create receipt
            receipt = Receipt.objects.create(
                job=payment.job,
                invoice=invoice,
                payment=payment,
                issued_by=request.user
            )

            # Process tips if provided
            tips_created = []
            if tips_data:
                for tip_data in tips_data:
                    employee_id = tip_data.get('employee_id')
                    tip_amount = tip_data.get('amount')
                    tip_notes = tip_data.get('notes', '')

                    if employee_id and tip_amount and Decimal(tip_amount) > 0:
                        # Validate that employee worked on this job
                        from authentication.models import User
                        try:
                            employee = User.objects.get(id=employee_id)

                            # Check if employee worked on this job
                            job_has_employee = payment.job.lines.filter(
                                assigned_employees=employee
                            ).exists()

                            if job_has_employee:
                                tip = Tip.objects.create(
                                    job=payment.job,
                                    employee=employee,
                                    amount=Decimal(tip_amount),
                                    status='PENDING',
                                    recorded_by=request.user,
                                    notes=tip_notes
                                )
                                tips_created.append({
                                    'id': str(tip.id),
                                    'employee': employee.get_full_name(),
                                    'amount': str(tip.amount)
                                })
                        except User.DoesNotExist:
                            pass  # Skip invalid employee IDs

            # Update job status to PAID if fully paid
            job = payment.job
            total_payments = job.payments.filter(status='COMPLETED').aggregate(
                total=Sum('amount')
            )['total'] or 0

            if total_payments >= job.final_total:
                job.status = 'PAID'
                job.save()

                # Update invoice status if exists
                if invoice:
                    invoice.status = 'PAID'
                    invoice.save()

                # Update commission status from AVAILABLE to PAYABLE
                Commission.objects.filter(
                    job=job,
                    status='AVAILABLE'
                ).update(status='PAYABLE')

            serializer = self.get_serializer(receipt)
            response_data = serializer.data
            if tips_created:
                response_data['tips_recorded'] = tips_created

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class EmployeeCommissionRateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing employee commission rates
    """
    queryset = EmployeeCommissionRate.objects.select_related(
        'employee', 'service_variant'
    ).all()
    serializer_class = EmployeeCommissionRateSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'service_variant', 'is_active']
    search_fields = ['employee__email', 'employee__first_name', 'employee__last_name']
    ordering_fields = ['created_at', 'commission_percentage']
    ordering = ['-created_at']

    @extend_schema(
        summary="Get commission rates for a specific employee",
        responses={200: EmployeeCommissionRateSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        """Get all commission rates for a specific employee"""
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response(
                {'error': 'employee_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        rates = self.queryset.filter(employee_id=employee_id, is_active=True)
        serializer = self.get_serializer(rates, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Get commission rate for employee and service",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def get_rate(self, request):
        """Get commission rate for a specific employee and service"""
        employee_id = request.query_params.get('employee_id')
        service_variant_id = request.query_params.get('service_variant_id')

        if not employee_id:
            return Response(
                {'error': 'employee_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try to find service-specific rate first
        if service_variant_id:
            rate = EmployeeCommissionRate.objects.filter(
                employee_id=employee_id,
                service_variant_id=service_variant_id,
                is_active=True
            ).first()

            if rate:
                return Response({
                    'commission_percentage': rate.commission_percentage,
                    'rate_type': 'service_specific',
                    'rate_id': rate.id
                })

        # Fall back to default rate (null service_variant)
        default_rate = EmployeeCommissionRate.objects.filter(
            employee_id=employee_id,
            service_variant__isnull=True,
            is_active=True
        ).first()

        if default_rate:
            return Response({
                'commission_percentage': default_rate.commission_percentage,
                'rate_type': 'default',
                'rate_id': default_rate.id
            })

        return Response({
            'commission_percentage': 0,
            'rate_type': 'none',
            'rate_id': None
        })


class CommissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing employee commissions
    """
    queryset = Commission.objects.select_related(
        'employee', 'job', 'job_line', 'paid_by'
    ).all()
    serializer_class = CommissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'job', 'status']
    search_fields = ['employee__email', 'employee__first_name', 'employee__last_name', 'job__job_number']
    ordering_fields = ['created_at', 'commission_amount', 'paid_at']
    ordering = ['-created_at']

    def get_permissions(self):
        """Only managers can create/update/delete commissions"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsManager()]
        return [permissions.IsAuthenticated()]

    @extend_schema(
        summary="Get commissions by employee",
        responses={200: CommissionSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        """Get all commissions for a specific employee"""
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response(
                {'error': 'employee_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        status_filter = request.query_params.get('status')
        commissions = self.queryset.filter(employee_id=employee_id)

        if status_filter:
            commissions = commissions.filter(status=status_filter)

        serializer = self.get_serializer(commissions, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Get commission summary by employee",
        responses={200: CommissionSummarySerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get commission summary statistics for all employees"""
        from django.contrib.auth import get_user_model
        from django.db.models import Q, Sum, Count, Case, When, DecimalField

        User = get_user_model()

        # Get date filters from query params
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Start with base queryset
        queryset = Commission.objects.all()

        # Apply date filters if provided
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        # Get all employees with commissions
        summary = queryset.values(
            'employee', 'employee__first_name', 'employee__last_name', 'employee__email'
        ).annotate(
            employee_name=F('employee__first_name'),
            total_available=Sum(
                Case(
                    When(status='AVAILABLE', then='commission_amount'),
                    default=0,
                    output_field=DecimalField()
                )
            ),
            total_payable=Sum(
                Case(
                    When(status='PAYABLE', then='commission_amount'),
                    default=0,
                    output_field=DecimalField()
                )
            ),
            total_paid=Sum(
                Case(
                    When(status='PAID', then='commission_amount'),
                    default=0,
                    output_field=DecimalField()
                )
            ),
            count_available=Count(Case(When(status='AVAILABLE', then=1))),
            count_payable=Count(Case(When(status='PAYABLE', then=1))),
            count_paid=Count(Case(When(status='PAID', then=1)))
        )

        # Format the data
        summary_data = []
        for item in summary:
            # Calculate unrecovered advances (APPROVED or PAID advances)
            unrecovered_advances = AdvancePayment.objects.filter(
                employee_id=item['employee'],
                status__in=['APPROVED', 'PAID']
            ).aggregate(total=Sum('approved_amount'))['total'] or Decimal('0.00')

            # Payable amount minus unrecovered advances
            raw_payable = item['total_payable'] or Decimal('0.00')
            adjusted_payable = max(raw_payable - unrecovered_advances, Decimal('0.00'))

            summary_data.append({
                'employee': item['employee'],
                'employee_name': f"{item['employee__first_name']} {item['employee__last_name']}",
                'total_available': item['total_available'] or Decimal('0.00'),
                'total_payable': adjusted_payable,
                'total_paid': item['total_paid'] or Decimal('0.00'),
                'count_available': item['count_available'],
                'count_payable': item['count_payable'],
                'count_paid': item['count_paid'],
                'unrecovered_advances': unrecovered_advances
            })

        serializer = CommissionSummarySerializer(summary_data, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Mark commissions as payable (bulk update)",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def mark_payable(self, request):
        """Bulk update commissions from AVAILABLE to PAYABLE"""
        commission_ids = request.data.get('commission_ids', [])

        if not commission_ids:
            return Response(
                {'error': 'commission_ids list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update commissions
        updated = Commission.objects.filter(
            id__in=commission_ids,
            status='AVAILABLE'
        ).update(status='PAYABLE')

        return Response({
            'message': f'Successfully marked {updated} commissions as payable',
            'updated_count': updated
        })

    @extend_schema(
        summary="Mark commissions as paid (bulk update)",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def mark_paid(self, request):
        """Bulk update commissions from PAYABLE to PAID"""
        import logging
        logger = logging.getLogger(__name__)

        commission_ids = request.data.get('commission_ids', [])
        payment_reference = request.data.get('payment_reference', '')

        if not commission_ids:
            return Response(
                {'error': 'commission_ids list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone

        # Get unique employee IDs from the commissions being paid
        employee_ids = list(Commission.objects.filter(
            id__in=commission_ids,
            status='PAYABLE'
        ).values_list('employee_id', flat=True).distinct())

        logger.info(f"Marking commissions paid for employee IDs: {employee_ids}")

        # Update commissions
        updated = Commission.objects.filter(
            id__in=commission_ids,
            status='PAYABLE'
        ).update(
            status='PAID',
            paid_at=timezone.now(),
            paid_by=request.user,
            payment_reference=payment_reference
        )

        logger.info(f"Updated {updated} commissions to PAID status")

        # Check which advances exist before updating
        advances_before = AdvancePayment.objects.filter(
            employee_id__in=employee_ids,
            status__in=['APPROVED', 'PAID']
        )

        logger.info(f"Found {advances_before.count()} advances with status APPROVED or PAID for these employees")
        for adv in advances_before:
            logger.info(f"  - Advance ID: {adv.id}, Employee: {adv.employee_id}, Status: {adv.status}, Amount: {adv.approved_amount}")

        # Mark all APPROVED or PAID advances as RECOVERED for these employees
        advances_updated = AdvancePayment.objects.filter(
            employee_id__in=employee_ids,
            status__in=['APPROVED', 'PAID']
        ).update(
            status='RECOVERED',
            updated_at=timezone.now()
        )

        logger.info(f"Updated {advances_updated} advances to RECOVERED status")

        return Response({
            'message': f'Successfully marked {updated} commissions as paid and {advances_updated} advances as recovered',
            'updated_count': updated,
            'advances_recovered': advances_updated,
            'employee_ids': employee_ids
        })


class TipViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing employee tips
    """
    queryset = Tip.objects.select_related(
        'job', 'employee', 'recorded_by', 'paid_by'
    ).all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'job', 'status']
    search_fields = ['employee__email', 'employee__first_name', 'employee__last_name', 'job__job_number']
    ordering_fields = ['created_at', 'amount', 'paid_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return TipCreateSerializer
        elif self.action == 'retrieve':
            return TipDetailSerializer
        return TipListSerializer

    def get_permissions(self):
        """Managers can manage all tips, employees can view their own"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'mark_paid']:
            return [permissions.IsAuthenticated(), IsManager()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """
        Filter tips based on user role:
        - Employees see their own tips
        - Managers see all tips
        """
        queryset = super().get_queryset()
        user = self.request.user

        # Managers and admins can see all tips
        if user.role in ['ADMIN', 'MANAGER']:
            return queryset

        # Employees can only see their own tips
        return queryset.filter(employee=user)

    def perform_create(self, serializer):
        """Record who created the tip"""
        serializer.save(recorded_by=self.request.user)

    @extend_schema(
        summary="Mark tip as paid",
        request=TipPaySerializer,
        responses={200: TipDetailSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def mark_paid(self, request, pk=None):
        """Mark a tip as paid to the employee"""
        tip = self.get_object()

        if tip.status == 'PAID':
            return Response(
                {'error': 'Tip is already marked as paid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if tip.status == 'CANCELLED':
            return Response(
                {'error': 'Cannot pay a cancelled tip'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate request data
        serializer = TipPaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Update tip
        from django.utils import timezone
        tip.status = 'PAID'
        tip.payment_method = serializer.validated_data['payment_method']
        tip.payment_reference = serializer.validated_data.get('payment_reference', '')
        tip.paid_at = timezone.now()
        tip.paid_by = request.user
        if serializer.validated_data.get('payment_notes'):
            tip.notes += f"\nPayment: {serializer.validated_data['payment_notes']}"
        tip.save()

        detail_serializer = TipDetailSerializer(tip)
        return Response(detail_serializer.data)

    @extend_schema(
        summary="Cancel a tip",
        responses={200: TipDetailSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def cancel(self, request, pk=None):
        """Cancel a tip"""
        tip = self.get_object()

        if tip.status == 'PAID':
            return Response(
                {'error': 'Cannot cancel a paid tip'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tip.status = 'CANCELLED'
        tip.save()

        serializer = TipDetailSerializer(tip)
        return Response(serializer.data)

    @extend_schema(
        summary="Get tips by employee",
        responses={200: TipListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        """Get all tips for a specific employee"""
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response(
                {'error': 'employee_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        status_filter = request.query_params.get('status')
        tips = self.get_queryset().filter(employee_id=employee_id)

        if status_filter:
            tips = tips.filter(status=status_filter)

        serializer = TipListSerializer(tips, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Get tip statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get tip statistics"""
        from django.db.models import Case, When, DecimalField

        queryset = self.get_queryset()

        # Get date filters from query params
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Apply date filters if provided
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        # Calculate amounts for different statuses
        total_tips_amount = queryset.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        pending_amount = queryset.filter(status='PENDING').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        paid_amount = queryset.filter(status='PAID').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        cancelled_amount = queryset.filter(status='CANCELLED').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        stats = {
            # Amounts (matching frontend expectations)
            'total_tips': str(total_tips_amount),
            'total_pending': str(pending_amount),
            'total_paid': str(paid_amount),
            'total_cancelled': str(cancelled_amount),
            # Counts
            'count_pending': queryset.filter(status='PENDING').count(),
            'count_paid': queryset.filter(status='PAID').count(),
            'count_cancelled': queryset.filter(status='CANCELLED').count(),
        }

        # By employee summary
        employee_summary = queryset.values(
            'employee', 'employee__first_name', 'employee__last_name'
        ).annotate(
            count_tips=Count('id'),
            total_tips=Sum('amount'),
            pending_amount=Sum(
                Case(
                    When(status='PENDING', then='amount'),
                    default=0,
                    output_field=DecimalField()
                )
            ),
            paid_amount=Sum(
                Case(
                    When(status='PAID', then='amount'),
                    default=0,
                    output_field=DecimalField()
                )
            )
        ).order_by('-total_tips')

        # Format employee summary to match frontend expectations
        formatted_employee_summary = []
        for item in employee_summary:
            formatted_employee_summary.append({
                'employee_id': str(item['employee']),
                'employee_name': f"{item['employee__first_name']} {item['employee__last_name']}",
                'total_tips': str(item['total_tips'] or Decimal('0.00')),
                'count_tips': item['count_tips']
            })

        stats['by_employee'] = formatted_employee_summary

        return Response(stats)


class AdvancePaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing employee advance payments against commissions
    """
    queryset = AdvancePayment.objects.select_related(
        'employee', 'reviewed_by', 'paid_by'
    ).all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'status']
    search_fields = ['employee__email', 'employee__first_name', 'employee__last_name']
    ordering_fields = ['requested_at', 'requested_amount', 'reviewed_at', 'paid_at']
    ordering = ['-requested_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return AdvancePaymentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AdvancePaymentUpdateSerializer
        elif self.action == 'retrieve':
            return AdvancePaymentDetailSerializer
        return AdvancePaymentListSerializer

    def get_permissions(self):
        """Employees can request/edit advances, managers can review/pay"""
        if self.action in ['create', 'update', 'partial_update']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['review', 'mark_paid', 'cancel']:
            return [permissions.IsAuthenticated(), IsManager()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """
        Filter advances based on user role:
        - Employees see their own advances
        - Managers see all advances
        """
        queryset = super().get_queryset()
        user = self.request.user

        # Managers and admins can see all advances
        if user.role in ['ADMIN', 'MANAGER']:
            return queryset

        # Employees can only see their own advances
        return queryset.filter(employee=user)

    @extend_schema(
        summary="Review advance payment request",
        request=AdvancePaymentReviewSerializer,
        responses={200: AdvancePaymentDetailSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def review(self, request, pk=None):
        """Approve or reject an advance payment request"""
        advance = self.get_object()

        if advance.status != 'PENDING':
            return Response(
                {'error': 'Only pending requests can be reviewed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate request data
        serializer = AdvancePaymentReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']
        from django.utils import timezone

        if action == 'approve':
            approved_amount = serializer.validated_data.get('approved_amount')

            # Validate approved amount doesn't exceed available commission
            if approved_amount > advance.available_commission:
                return Response(
                    {'error': f'Approved amount ({approved_amount}) cannot exceed available commission ({advance.available_commission})'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            advance.status = 'APPROVED'
            advance.approved_amount = approved_amount
            advance.reviewed_at = timezone.now()
            advance.reviewed_by = request.user
            advance.review_notes = serializer.validated_data.get('review_notes', '')
        else:  # reject
            advance.status = 'REJECTED'
            advance.reviewed_at = timezone.now()
            advance.reviewed_by = request.user
            advance.review_notes = serializer.validated_data.get('review_notes', '')

        advance.save()

        detail_serializer = AdvancePaymentDetailSerializer(advance)
        return Response(detail_serializer.data)

    @extend_schema(
        summary="Mark advance as paid",
        request=AdvancePaymentPaySerializer,
        responses={200: AdvancePaymentDetailSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def mark_paid(self, request, pk=None):
        """Mark an approved advance as paid"""
        advance = self.get_object()

        if advance.status != 'APPROVED':
            return Response(
                {'error': 'Only approved advances can be marked as paid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate request data
        serializer = AdvancePaymentPaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Update advance
        from django.utils import timezone
        advance.status = 'PAID'
        advance.payment_method = serializer.validated_data['payment_method']
        advance.payment_reference = serializer.validated_data.get('payment_reference', '')
        advance.payment_notes = serializer.validated_data.get('payment_notes', '')
        advance.paid_at = timezone.now()
        advance.paid_by = request.user
        advance.save()

        detail_serializer = AdvancePaymentDetailSerializer(advance)
        return Response(detail_serializer.data)

    @extend_schema(
        summary="Cancel an advance payment",
        responses={200: AdvancePaymentDetailSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def cancel(self, request, pk=None):
        """Cancel an advance payment"""
        advance = self.get_object()

        if advance.status == 'PAID':
            return Response(
                {'error': 'Cannot cancel a paid advance'},
                status=status.HTTP_400_BAD_REQUEST
            )

        advance.status = 'CANCELLED'
        advance.save()

        serializer = AdvancePaymentDetailSerializer(advance)
        return Response(serializer.data)

    @extend_schema(
        summary="Give advance directly (managers only)",
        request=AdvancePaymentCreateSerializer,
        responses={201: AdvancePaymentDetailSerializer}
    )
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def give_advance(self, request):
        """Managers can give advance payments directly without approval"""
        from django.utils import timezone

        serializer = AdvancePaymentCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        # Get employee - serializer returns User object if provided, otherwise None
        employee_obj = serializer.validated_data.get('employee') or request.user
        employee_id = employee_obj.id if hasattr(employee_obj, 'id') else employee_obj

        # Calculate available payable commissions for the employee
        available_commissions = Commission.objects.filter(
            employee_id=employee_id,
            status='PAYABLE'
        ).aggregate(total=Sum('commission_amount'))['total'] or Decimal('0.00')

        requested_amount = serializer.validated_data['requested_amount']

        # Validate requested amount doesn't exceed available commission
        if requested_amount > available_commissions:
            return Response(
                {
                    'error': f'Requested amount ({requested_amount}) exceeds available payable commissions ({available_commissions})'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create advance with status PAID directly (bypassing approval)
        advance = AdvancePayment.objects.create(
            employee_id=employee_id,
            requested_amount=requested_amount,
            approved_amount=requested_amount,  # Same as requested since it's approved directly
            available_commission=available_commissions,
            status='PAID',  # Directly marked as PAID
            reason=serializer.validated_data['reason'],
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
            paid_by=request.user,
            paid_at=timezone.now(),
            payment_method=serializer.validated_data['payment_method'],
            payment_reference=serializer.validated_data.get('payment_reference', ''),
            payment_notes=f"Advance given directly by {request.user.get_full_name()}"
        )

        detail_serializer = AdvancePaymentDetailSerializer(advance)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Get advances by employee",
        responses={200: AdvancePaymentListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        """Get all advances for a specific employee"""
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response(
                {'error': 'employee_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        status_filter = request.query_params.get('status')
        advances = self.get_queryset().filter(employee_id=employee_id)

        if status_filter:
            advances = advances.filter(status=status_filter)

        serializer = AdvancePaymentListSerializer(advances, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Get advance payment statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get advance payment statistics"""
        from django.db.models import Case, When, DecimalField

        queryset = self.get_queryset()

        # Get date filters from query params
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Apply date filters if provided
        if start_date:
            queryset = queryset.filter(requested_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(requested_at__date__lte=end_date)

        stats = {
            'total_requests': queryset.count(),
            'pending_requests': queryset.filter(status='PENDING').count(),
            'approved_requests': queryset.filter(status='APPROVED').count(),
            'paid_requests': queryset.filter(status='PAID').count(),
            'rejected_requests': queryset.filter(status='REJECTED').count(),
            'total_requested': queryset.aggregate(
                total=Sum('requested_amount')
            )['total'] or Decimal('0.00'),
            'total_approved': queryset.filter(status__in=['APPROVED', 'PAID']).aggregate(
                total=Sum('approved_amount')
            )['total'] or Decimal('0.00'),
            'total_paid': queryset.filter(status='PAID').aggregate(
                total=Sum('approved_amount')
            )['total'] or Decimal('0.00'),
        }

        # By employee summary
        employee_summary = queryset.values(
            'employee', 'employee__first_name', 'employee__last_name'
        ).annotate(
            total_requests=Count('id'),
            total_requested=Sum('requested_amount'),
            total_approved=Sum(
                Case(
                    When(status__in=['APPROVED', 'PAID'], then='approved_amount'),
                    default=0,
                    output_field=DecimalField()
                )
            ),
            total_paid=Sum(
                Case(
                    When(status='PAID', then='approved_amount'),
                    default=0,
                    output_field=DecimalField()
                )
            )
        ).order_by('-total_requested')

        stats['by_employee'] = list(employee_summary)

        return Response(stats)

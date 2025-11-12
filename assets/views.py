from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Count, F, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import csv
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import Asset, AssetCategory, AssetDepreciation, AssetMaintenance, AssetTransfer
from .serializers import (
    AssetSerializer, AssetCategorySerializer, AssetDepreciationSerializer,
    AssetMaintenanceSerializer, AssetTransferSerializer, AssetCreateSerializer,
    AssetUpdateSerializer, AssetSummarySerializer
)


class AssetCategoryViewSet(viewsets.ModelViewSet):
    """Asset category management"""
    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = AssetCategory.objects.all()

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(description__icontains=search)
            )

        return queryset.order_by('name')

    @extend_schema(
        summary="Get category statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get statistics for a specific category"""
        category = self.get_object()

        assets = Asset.objects.filter(category=category)
        active_assets = assets.filter(status='ACTIVE')

        total_value = active_assets.aggregate(
            total_cost=Coalesce(Sum('purchase_cost'), Decimal('0')),
            total_book_value=Coalesce(Sum('current_book_value'), Decimal('0')),
            total_depreciation=Coalesce(Sum('accumulated_depreciation'), Decimal('0'))
        )

        stats = {
            'total_assets': assets.count(),
            'active_assets': active_assets.count(),
            'total_purchase_cost': total_value['total_cost'],
            'total_book_value': total_value['total_book_value'],
            'total_accumulated_depreciation': total_value['total_depreciation'],
            'average_age': 0,
            'depreciation_percentage': 0
        }

        if active_assets.exists():
            # Calculate average age
            total_days = sum((date.today() - asset.purchase_date).days for asset in active_assets)
            stats['average_age'] = total_days / active_assets.count() / 365.25

            # Calculate depreciation percentage
            if total_value['total_cost'] > 0:
                stats['depreciation_percentage'] = float(
                    (total_value['total_depreciation'] / total_value['total_cost']) * 100
                )

        return Response(stats)


class AssetViewSet(viewsets.ModelViewSet):
    """Asset management with depreciation tracking"""
    queryset = Asset.objects.select_related('category', 'assigned_to', 'created_by')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return AssetCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AssetUpdateSerializer
        return AssetSerializer

    def get_queryset(self):
        queryset = Asset.objects.select_related('category', 'assigned_to', 'created_by')

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        # Filter by assigned user
        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(asset_number__icontains=search) |
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(serial_number__icontains=search) |
                Q(manufacturer__icontains=search) |
                Q(model__icontains=search)
            )

        # Filter by depreciation status
        depreciation_status = self.request.query_params.get('depreciation_status')
        if depreciation_status == 'fully_depreciated':
            queryset = queryset.filter(current_book_value__lte=F('salvage_value'))
        elif depreciation_status == 'needs_attention':
            # Assets that haven't been depreciated in over a month
            cutoff_date = date.today() - timedelta(days=35)
            queryset = queryset.filter(
                Q(last_depreciation_date__lt=cutoff_date) |
                Q(last_depreciation_date__isnull=True)
            )

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @extend_schema(
        summary="Get asset dashboard summary",
        responses={200: AssetSummarySerializer}
    )
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get dashboard summary for assets"""
        assets = Asset.objects.filter(status='ACTIVE')

        total_stats = assets.aggregate(
            total_assets=Count('id'),
            total_cost=Coalesce(Sum('purchase_cost'), Decimal('0')),
            total_book_value=Coalesce(Sum('current_book_value'), Decimal('0')),
            total_depreciation=Coalesce(Sum('accumulated_depreciation'), Decimal('0'))
        )

        # Assets by category
        categories = AssetCategory.objects.annotate(
            asset_count=Count('assets', filter=Q(assets__status='ACTIVE')),
            total_value=Coalesce(Sum('assets__current_book_value', filter=Q(assets__status='ACTIVE')), Decimal('0'))
        ).filter(asset_count__gt=0)

        # Recent assets (last 30 days)
        recent_assets = assets.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()

        # Assets needing maintenance
        maintenance_due = assets.filter(
            next_maintenance_date__lte=date.today() + timedelta(days=30)
        ).count()

        # Fully depreciated assets
        fully_depreciated = assets.filter(
            current_book_value__lte=F('salvage_value')
        ).count()

        # Monthly depreciation
        current_month = date.today().replace(day=1)
        monthly_depreciation = sum(asset.monthly_depreciation for asset in assets)

        summary_data = {
            'total_assets': total_stats['total_assets'],
            'total_purchase_cost': total_stats['total_cost'],
            'total_book_value': total_stats['total_book_value'],
            'total_accumulated_depreciation': total_stats['total_depreciation'],
            'monthly_depreciation': monthly_depreciation,
            'depreciation_percentage': float(
                (total_stats['total_depreciation'] / total_stats['total_cost'] * 100)
                if total_stats['total_cost'] > 0 else 0
            ),
            'recent_assets_count': recent_assets,
            'maintenance_due_count': maintenance_due,
            'fully_depreciated_count': fully_depreciated,
            'categories': [
                {
                    'id': cat.id,
                    'name': cat.name,
                    'asset_count': cat.asset_count,
                    'total_value': cat.total_value
                }
                for cat in categories
            ]
        }

        return Response(summary_data)

    @extend_schema(
        summary="Generate depreciation report",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def depreciation_report(self, request):
        """Generate depreciation report for specified period"""
        year = int(request.query_params.get('year', date.today().year))
        month = request.query_params.get('month')

        assets = Asset.objects.filter(status='ACTIVE')

        if month:
            month = int(month)
            depreciation_entries = AssetDepreciation.objects.filter(
                period_year=year,
                period_month=month
            ).select_related('asset')
        else:
            depreciation_entries = AssetDepreciation.objects.filter(
                period_year=year
            ).select_related('asset')

        report_data = {
            'period': f"{year}-{month:02d}" if month else str(year),
            'total_depreciation': sum(entry.depreciation_amount for entry in depreciation_entries),
            'assets_count': len(set(entry.asset_id for entry in depreciation_entries)),
            'entries': [
                {
                    'asset_number': entry.asset.asset_number,
                    'asset_name': entry.asset.name,
                    'depreciation_amount': entry.depreciation_amount,
                    'accumulated_depreciation': entry.accumulated_depreciation,
                    'book_value': entry.book_value
                }
                for entry in depreciation_entries
            ]
        }

        return Response(report_data)

    @extend_schema(
        summary="Transfer asset",
        responses={200: AssetTransferSerializer}
    )
    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        """Transfer asset to new location/user"""
        asset = self.get_object()

        transfer_data = {
            'asset': asset.id,
            'transfer_date': request.data.get('transfer_date', date.today()),
            'from_location': asset.location,
            'to_location': request.data.get('to_location'),
            'from_user': asset.assigned_to.id if asset.assigned_to else None,
            'to_user': request.data.get('to_user'),
            'reason': request.data.get('reason'),
            'notes': request.data.get('notes', ''),
            'created_by': request.user.id
        }

        serializer = AssetTransferSerializer(data=transfer_data)
        if serializer.is_valid():
            transfer = serializer.save()

            # Update asset location and assignment
            asset.location = transfer.to_location
            if transfer.to_user:
                asset.assigned_to = transfer.to_user
            asset.save()

            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Export assets to CSV",
        responses={200: {"type": "file"}}
    )
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export assets to CSV file"""
        assets = self.get_queryset()

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="assets_{date.today()}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Asset Number', 'Name', 'Category', 'Purchase Cost', 'Purchase Date',
            'Current Book Value', 'Accumulated Depreciation', 'Status', 'Location',
            'Assigned To', 'Serial Number', 'Manufacturer', 'Model'
        ])

        for asset in assets:
            writer.writerow([
                asset.asset_number,
                asset.name,
                asset.category.name,
                asset.purchase_cost,
                asset.purchase_date,
                asset.current_book_value,
                asset.accumulated_depreciation,
                asset.status,
                asset.location,
                asset.assigned_to.get_full_name() if asset.assigned_to else '',
                asset.serial_number,
                asset.manufacturer,
                asset.model
            ])

        return response

    @extend_schema(
        summary="Calculate asset depreciation",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'])
    def calculate_depreciation(self, request, pk=None):
        """Calculate current depreciation for asset with optional Celery fallback"""
        asset = self.get_object()
        old_book_value = asset.current_book_value

        try:
            # Try Celery task first if available
            from .tasks import calculate_asset_depreciation
            from celery import current_app

            # Check if Celery is available
            if hasattr(current_app, 'control') and current_app.control.inspect().stats():
                # Use Celery task
                result = calculate_asset_depreciation.delay(str(asset.id))
                return Response({
                    'message': 'Depreciation calculation initiated',
                    'task_id': result.id,
                    'asset_id': str(asset.id)
                })
            else:
                raise Exception("Celery not available")

        except Exception:
            # Fallback to synchronous calculation
            try:
                asset.calculate_current_values()
                asset.save()

                return Response({
                    'message': 'Depreciation calculated successfully',
                    'asset_number': asset.asset_number,
                    'previous_book_value': str(old_book_value),
                    'current_book_value': str(asset.current_book_value),
                    'accumulated_depreciation': str(asset.accumulated_depreciation),
                    'monthly_depreciation': str(asset.monthly_depreciation),
                    'asset_id': str(asset.id)
                })
            except Exception as sync_error:
                return Response({
                    'error': f'Depreciation calculation failed: {str(sync_error)}'
                }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Get depreciation schedule",
        responses={200: {"type": "array", "items": {"type": "object"}}}
    )
    @action(detail=True, methods=['get'])
    def depreciation_schedule(self, request, pk=None):
        """Get complete depreciation schedule for asset"""
        asset = self.get_object()
        schedule = asset.generate_depreciation_schedule()

        return Response({
            'asset_id': str(asset.id),
            'asset_number': asset.asset_number,
            'asset_name': asset.name,
            'purchase_cost': str(asset.purchase_cost),
            'useful_life_years': asset.useful_life_years,
            'depreciation_method': asset.depreciation_method,
            'schedule': schedule
        })

    @extend_schema(
        summary="Update asset values",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'])
    def update_values(self, request, pk=None):
        """Update current book value based on accumulated depreciation"""
        asset = self.get_object()
        value_changed = asset.update_current_book_value()

        return Response({
            'asset_id': str(asset.id),
            'value_changed': value_changed,
            'current_book_value': str(asset.current_book_value),
            'accumulated_depreciation': str(asset.accumulated_depreciation)
        })

    @extend_schema(
        summary="Create asset disposal",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'])
    def dispose(self, request, pk=None):
        """Dispose of asset and create accounting entries"""
        asset = self.get_object()

        disposal_date = request.data.get('disposal_date', date.today())
        disposal_amount = Decimal(str(request.data.get('disposal_amount', 0)))
        disposal_method = request.data.get('disposal_method', 'SALE')

        try:
            result = asset.create_disposal_entry(disposal_date, disposal_amount, disposal_method)
            return Response({
                'message': 'Asset disposed successfully',
                'disposal_result': result
            })
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Bulk update asset values",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['post'])
    def bulk_update_values(self, request):
        """Update values for all assets with optional Celery fallback"""
        try:
            # Try Celery first if available
            from .tasks import update_asset_values
            from celery import current_app

            # Check if Celery is available
            if hasattr(current_app, 'control') and current_app.control.inspect().stats():
                result = update_asset_values.delay()
                return Response({
                    'message': 'Bulk asset value update initiated',
                    'task_id': result.id
                })
            else:
                raise Exception("Celery not available")

        except Exception:
            # Fallback to synchronous bulk update
            try:
                updated_count = 0
                error_count = 0
                active_assets = Asset.objects.filter(status='ACTIVE')

                for asset in active_assets:
                    try:
                        value_changed = asset.update_current_book_value()
                        if value_changed:
                            updated_count += 1
                    except Exception:
                        error_count += 1

                return Response({
                    'message': 'Bulk asset value update completed',
                    'total_assets': active_assets.count(),
                    'updated_assets': updated_count,
                    'errors': error_count
                })
            except Exception as sync_error:
                return Response({
                    'error': f'Bulk update failed: {str(sync_error)}'
                }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Run monthly depreciation",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['post'])
    def monthly_depreciation(self, request):
        """Run monthly depreciation calculation for all assets with optional Celery fallback"""
        try:
            # Try Celery first if available
            from .tasks import calculate_monthly_depreciation
            from celery import current_app

            # Check if Celery is available
            if hasattr(current_app, 'control') and current_app.control.inspect().stats():
                result = calculate_monthly_depreciation.delay()
                return Response({
                    'message': 'Monthly depreciation calculation initiated',
                    'task_id': result.id
                })
            else:
                raise Exception("Celery not available")

        except Exception:
            # Fallback to synchronous monthly depreciation
            try:
                from datetime import date
                current_date = date.today()
                processed_count = 0
                error_count = 0
                total_depreciation = Decimal('0.00')

                active_assets = Asset.objects.filter(status='ACTIVE')

                for asset in active_assets:
                    try:
                        # Calculate and update depreciation
                        old_book_value = asset.current_book_value
                        asset.calculate_current_values()
                        asset.save()

                        # Create depreciation entry
                        depreciation_amount = old_book_value - asset.current_book_value
                        if depreciation_amount > 0:
                            AssetDepreciation.objects.create(
                                asset=asset,
                                depreciation_amount=depreciation_amount,
                                accumulated_depreciation=asset.accumulated_depreciation,
                                book_value=asset.current_book_value,
                                period_year=current_date.year,
                                period_month=current_date.month,
                                calculation_date=current_date
                            )
                            total_depreciation += depreciation_amount

                        processed_count += 1
                    except Exception:
                        error_count += 1

                return Response({
                    'message': 'Monthly depreciation calculation completed',
                    'period': f"{current_date.year}-{current_date.month:02d}",
                    'total_assets': active_assets.count(),
                    'processed_assets': processed_count,
                    'total_depreciation': str(total_depreciation),
                    'errors': error_count
                })
            except Exception as sync_error:
                return Response({
                    'error': f'Monthly depreciation failed: {str(sync_error)}'
                }, status=status.HTTP_400_BAD_REQUEST)


class AssetMaintenanceViewSet(viewsets.ModelViewSet):
    """Asset maintenance records"""
    queryset = AssetMaintenance.objects.select_related('asset', 'performed_by')
    serializer_class = AssetMaintenanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = AssetMaintenance.objects.select_related('asset', 'performed_by')

        # Filter by asset
        asset_id = self.request.query_params.get('asset')
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)

        # Filter by maintenance type
        maintenance_type = self.request.query_params.get('type')
        if maintenance_type:
            queryset = queryset.filter(maintenance_type=maintenance_type)

        return queryset.order_by('-service_date')

    def perform_create(self, serializer):
        serializer.save(performed_by=self.request.user)


class AssetDepreciationViewSet(viewsets.ReadOnlyModelViewSet):
    """Asset depreciation tracking (read-only)"""
    queryset = AssetDepreciation.objects.select_related('asset')
    serializer_class = AssetDepreciationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = AssetDepreciation.objects.select_related('asset')

        # Filter by asset
        asset_id = self.request.query_params.get('asset')
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)

        # Filter by period
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(period_year=int(year))

        month = self.request.query_params.get('month')
        if month:
            queryset = queryset.filter(period_month=int(month))

        return queryset.order_by('-period_year', '-period_month')


class AssetTransferViewSet(viewsets.ModelViewSet):
    """Asset transfer records"""
    queryset = AssetTransfer.objects.select_related('asset', 'from_user', 'to_user', 'created_by')
    serializer_class = AssetTransferSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = AssetTransfer.objects.select_related('asset', 'from_user', 'to_user', 'created_by')

        # Filter by asset
        asset_id = self.request.query_params.get('asset')
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)

        return queryset.order_by('-transfer_date')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
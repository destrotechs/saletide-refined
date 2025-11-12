from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Q, Count, Avg
from decimal import Decimal

from .models import VehicleClass, Part, Service, ServiceVariant, PriceBand
from .serializers import (
    VehicleClassSerializer, PartSerializer, ServiceSerializer,
    ServiceVariantSerializer, ServiceVariantListSerializer, PriceBandSerializer,
    ServiceVariantPricingSerializer, ServicePricingCalculatorSerializer,
    ServiceCatalogSerializer
)
from authentication.permissions import (
    IsAdmin, IsManager, IsSalesAgent, CanViewFloorPrices, CanApproveOverrides
)


class VehicleClassViewSet(viewsets.ModelViewSet):
    queryset = VehicleClass.objects.all()
    serializer_class = VehicleClassSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'modifier_type']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            # Show only active by default
            if not self.request.query_params.get('show_all'):
                queryset = queryset.filter(is_active=True)
        return queryset

    @extend_schema(
        summary="Get vehicle classes statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        stats = {
            'total_classes': VehicleClass.objects.count(),
            'active_classes': VehicleClass.objects.filter(is_active=True).count(),
            'percentage_modifier_classes': VehicleClass.objects.filter(
                modifier_type='PERCENTAGE'
            ).count(),
            'fixed_modifier_classes': VehicleClass.objects.filter(
                modifier_type='FIXED'
            ).count(),
        }
        return Response(stats)


class PartViewSet(viewsets.ModelViewSet):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['parent', 'is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            # Show only active by default
            if not self.request.query_params.get('show_all'):
                queryset = queryset.filter(is_active=True)
        return queryset

    @extend_schema(
        summary="Get part hierarchy tree",
        responses={200: PartSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Returns hierarchical tree structure of parts"""
        # Get top-level parts (no parent)
        top_level = self.get_queryset().filter(parent=None)
        serializer = PartSerializer(top_level, many=True, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        summary="Get child parts of a specific part",
        responses={200: PartSerializer(many=True)}
    )
    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        """Returns direct children of a part"""
        part = self.get_object()
        children = part.children.filter(is_active=True)
        serializer = PartSerializer(children, many=True, context={'request': request})
        return Response(serializer.data)


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'duration_estimate_minutes', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'catalog':
            return ServiceCatalogSerializer
        return ServiceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            # Show only active by default
            if not self.request.query_params.get('show_all'):
                queryset = queryset.filter(is_active=True)
        return queryset

    @extend_schema(
        summary="Get complete service catalog with variants",
        responses={200: ServiceCatalogSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def catalog(self, request):
        """Returns complete service catalog with all variants"""
        queryset = self.get_queryset().prefetch_related('variants')
        serializer = ServiceCatalogSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        summary="Get service statistics",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        stats = {
            'total_services': Service.objects.count(),
            'active_services': Service.objects.filter(is_active=True).count(),
            'avg_duration': Service.objects.aggregate(
                avg=Avg('duration_estimate_minutes')
            )['avg'] or 0,
            'total_variants': ServiceVariant.objects.filter(is_active=True).count(),
        }
        return Response(stats)


class ServiceVariantViewSet(viewsets.ModelViewSet):
    queryset = ServiceVariant.objects.select_related(
        'service', 'part', 'vehicle_class', 'created_by', 'updated_by'
    ).prefetch_related('inventory_options__sku').all()
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['service', 'part', 'vehicle_class', 'is_active']
    search_fields = ['service__name', 'part__name', 'vehicle_class__name']
    ordering_fields = ['service__name', 'suggested_price', 'created_at']
    ordering = ['service__name', 'part__name', 'vehicle_class__name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ServiceVariantListSerializer
        return ServiceVariantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            # Show only active by default
            if not self.request.query_params.get('show_all'):
                queryset = queryset.filter(is_active=True)
        return queryset

    def get_permissions(self):
        """Different permissions for different actions"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsManager]
        elif self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated, IsSalesAgent]
        else:
            permission_classes = [permissions.IsAuthenticated]

        return [permission() for permission in permission_classes]

    @extend_schema(
        request=ServiceVariantPricingSerializer,
        summary="Check if price is within acceptable bands",
        responses={200: {"type": "object"}}
    )
    @action(detail=False, methods=['post'])
    def check_pricing(self, request):
        """Check if proposed price is within acceptable bands"""
        serializer = ServiceVariantPricingSerializer(data=request.data)
        if serializer.is_valid():
            validated_data = serializer.validated_data
            service_variant = validated_data['service_variant']
            proposed_price = validated_data['proposed_price']

            response_data = {
                'service_variant_id': service_variant.id,
                'proposed_price': proposed_price,
                'suggested_price': service_variant.suggested_price,
                'within_band': validated_data['within_band'],
                'requires_approval': validated_data['requires_approval'],
                'is_below_floor': proposed_price < service_variant.floor_price,
            }

            # Only show floor price to authorized users
            if request.user.can_view_floor_prices():
                response_data['floor_price'] = service_variant.floor_price

            return Response(response_data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=ServicePricingCalculatorSerializer,
        summary="Calculate pricing for service combination",
        responses={200: ServicePricingCalculatorSerializer}
    )
    @action(detail=False, methods=['post'])
    def calculate_pricing(self, request):
        """Calculate pricing for a service/part/vehicle combination"""
        serializer = ServicePricingCalculatorSerializer(data=request.data)
        if serializer.is_valid():
            response_data = serializer.to_representation(serializer.validated_data)

            # Hide floor price from non-authorized users
            if not request.user.can_view_floor_prices():
                response_data.pop('floor_price', None)

            return Response(response_data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Get pricing recommendations for a service variant",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['get'])
    def pricing_recommendations(self, request, pk=None):
        """Get pricing recommendations based on market analysis"""
        service_variant = self.get_object()

        recommendations = {
            'service_variant_id': service_variant.id,
            'current_suggested_price': service_variant.suggested_price,
            'calculated_price_with_modifier': service_variant.calculate_price_with_modifier(),
            'price_bands': []
        }

        # Add floor price for authorized users
        if request.user.can_view_floor_prices():
            recommendations['floor_price'] = service_variant.floor_price

        # Get price bands
        for band in service_variant.price_bands.all():
            base_price = service_variant.suggested_price
            min_price = base_price * (1 + band.min_percentage / 100)
            max_price = base_price * (1 + band.max_percentage / 100)

            recommendations['price_bands'].append({
                'name': band.name,
                'min_price': min_price,
                'max_price': max_price,
                'requires_approval': band.requires_approval
            })

        return Response(recommendations)


class PriceBandViewSet(viewsets.ModelViewSet):
    queryset = PriceBand.objects.select_related('service_variant').all()
    serializer_class = PriceBandSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['service_variant', 'requires_approval']
    search_fields = ['name', 'service_variant__service__name']
    ordering_fields = ['name', 'min_percentage', 'created_at']
    ordering = ['service_variant', 'min_percentage']

    @extend_schema(
        summary="Test price against band",
        responses={200: {"type": "object"}}
    )
    @action(detail=True, methods=['post'])
    def test_price(self, request, pk=None):
        """Test if a specific price falls within this band"""
        band = self.get_object()
        price = request.data.get('price')

        if not price:
            return Response(
                {'error': 'Price is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            price = Decimal(str(price))
            within_band = band.is_price_within_band(price)

            response_data = {
                'band_name': band.name,
                'test_price': price,
                'within_band': within_band,
                'requires_approval': band.requires_approval,
                'min_percentage': band.min_percentage,
                'max_percentage': band.max_percentage
            }

            return Response(response_data)

        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid price format'},
                status=status.HTTP_400_BAD_REQUEST
            )

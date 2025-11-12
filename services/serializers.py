from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import VehicleClass, Part, Service, ServiceVariant, ServiceVariantInventory, PriceBand
from authentication.permissions import CanViewFloorPrices

User = get_user_model()


class VehicleClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleClass
        fields = [
            'id', 'name', 'code', 'modifier_type', 'modifier_value',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PartSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    full_path = serializers.CharField(read_only=True)
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = Part
        fields = [
            'id', 'name', 'parent', 'parent_name', 'code', 'description',
            'full_path', 'children_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_path']

    def get_children_count(self, obj):
        return obj.children.count()



class ServiceSerializer(serializers.ModelSerializer):
    variants_count = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'code', 'description', 'duration_estimate_minutes',
            'variants_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_variants_count(self, obj):
        return obj.variants.filter(is_active=True).count()


class ServiceVariantInventorySerializer(serializers.ModelSerializer):
    sku_name = serializers.CharField(source='sku.name', read_only=True)
    sku_code = serializers.CharField(source='sku.code', read_only=True)
    sku_unit = serializers.CharField(source='sku.unit', read_only=True)
    sku_cost = serializers.DecimalField(source='sku.cost', max_digits=12, decimal_places=2, read_only=True)
    service_variant_name = serializers.CharField(source='service_variant.__str__', read_only=True)

    class Meta:
        model = ServiceVariantInventory
        fields = [
            'id', 'service_variant', 'service_variant_name', 'sku', 'sku_name',
            'sku_code', 'sku_unit', 'sku_cost', 'is_required', 'standard_quantity',
            'floor_price_modifier', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ServiceVariantSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    part_name = serializers.CharField(source='part.name', read_only=True)
    part_full_path = serializers.CharField(source='part.get_full_path', read_only=True)
    vehicle_class_name = serializers.CharField(source='vehicle_class.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    calculated_price = serializers.SerializerMethodField()
    inventory_options = ServiceVariantInventorySerializer(many=True, read_only=True)

    class Meta:
        model = ServiceVariant
        fields = [
            'id', 'service', 'service_name', 'part', 'part_name', 'part_full_path',
            'vehicle_class', 'vehicle_class_name', 'suggested_price', 'floor_price',
            'calculated_price', 'price_inputs', 'inventory_options', 'is_active',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'updated_by', 'updated_by_name',
            'created_at', 'updated_at'
        ]


    def get_calculated_price(self, obj):
        return obj.calculate_price_with_modifier()

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')

        # Hide floor price from non-privileged users
        if request and hasattr(request, 'user'):
            if not request.user.can_view_floor_prices():
                ret.pop('floor_price', None)

        return ret

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
            validated_data['updated_by'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user
        return super().update(instance, validated_data)


class ServiceVariantListSerializer(ServiceVariantSerializer):
    """Simplified serializer for list views"""
    class Meta(ServiceVariantSerializer.Meta):
        fields = [
            'id', 'service_name', 'part_name', 'vehicle_class_name',
            'suggested_price', 'floor_price', 'calculated_price', 'inventory_options', 'is_active'
        ]


class PriceBandSerializer(serializers.ModelSerializer):
    service_variant_name = serializers.CharField(source='service_variant.__str__', read_only=True)

    class Meta:
        model = PriceBand
        fields = [
            'id', 'service_variant', 'service_variant_name', 'name',
            'min_percentage', 'max_percentage', 'requires_approval',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        if data['min_percentage'] > data['max_percentage']:
            raise serializers.ValidationError(
                "Minimum percentage cannot be greater than maximum percentage"
            )
        return data


class ServiceVariantPricingSerializer(serializers.Serializer):
    """Serializer for checking pricing within bands"""
    service_variant_id = serializers.UUIDField()
    proposed_price = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate(self, data):
        try:
            service_variant = ServiceVariant.objects.get(id=data['service_variant_id'])
        except ServiceVariant.DoesNotExist:
            raise serializers.ValidationError("Service variant not found")

        proposed_price = data['proposed_price']

        # Check against floor price
        if proposed_price < service_variant.floor_price:
            raise serializers.ValidationError({
                'proposed_price': 'Price is below floor price. Override approval required.',
                'floor_price': service_variant.floor_price,
                'requires_override': True
            })

        # Check price bands
        bands = service_variant.price_bands.all()
        within_band = False
        requires_approval = False

        for band in bands:
            if band.is_price_within_band(proposed_price):
                within_band = True
                if band.requires_approval:
                    requires_approval = True
                break

        data['service_variant'] = service_variant
        data['within_band'] = within_band
        data['requires_approval'] = requires_approval

        return data


class ServicePricingCalculatorSerializer(serializers.Serializer):
    """Serializer for calculating service pricing with modifiers"""
    service_id = serializers.UUIDField()
    part_id = serializers.UUIDField()
    vehicle_class_id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=8, decimal_places=2, default=1)

    def validate(self, data):
        try:
            service_variant = ServiceVariant.objects.get(
                service_id=data['service_id'],
                part_id=data['part_id'],
                vehicle_class_id=data['vehicle_class_id']
            )
        except ServiceVariant.DoesNotExist:
            raise serializers.ValidationError("Service variant combination not found")

        data['service_variant'] = service_variant
        return data

    def to_representation(self, instance):
        service_variant = instance['service_variant']
        quantity = instance['quantity']

        return {
            'service_variant_id': service_variant.id,
            'service_name': service_variant.service.name,
            'part_name': service_variant.part.get_full_path(),
            'vehicle_class_name': service_variant.vehicle_class.name,
            'base_price': service_variant.suggested_price,
            'calculated_price': service_variant.calculate_price_with_modifier(),
            'quantity': quantity,
            'line_total': service_variant.calculate_price_with_modifier() * quantity,
            'duration_minutes': service_variant.service.duration_estimate_minutes
        }


class ServiceCatalogSerializer(serializers.ModelSerializer):
    """Complete service catalog with all variants"""
    variants = ServiceVariantListSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'code', 'description', 'duration_estimate_minutes',
            'variants', 'is_active', 'created_at'
        ]
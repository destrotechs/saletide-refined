from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Asset, AssetCategory, AssetDepreciation, AssetMaintenance, AssetTransfer


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email']


class AssetCategorySerializer(serializers.ModelSerializer):
    asset_count = serializers.IntegerField(read_only=True)
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = AssetCategory
        fields = [
            'id', 'name', 'code', 'description', 'useful_life_years',
            'depreciation_method', 'asset_account', 'depreciation_account',
            'expense_account', 'is_active', 'created_at', 'updated_at',
            'asset_count', 'total_value'
        ]


class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    # Calculated fields
    age_in_years = serializers.ReadOnlyField()
    depreciation_rate = serializers.ReadOnlyField()
    monthly_depreciation = serializers.ReadOnlyField()
    annual_depreciation = serializers.ReadOnlyField()

    # Status displays
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    depreciation_method_display = serializers.CharField(source='get_depreciation_method_display', read_only=True)

    class Meta:
        model = Asset
        fields = [
            'id', 'asset_number', 'name', 'description', 'category', 'category_name', 'category_code',
            'purchase_cost', 'purchase_date', 'salvage_value', 'useful_life_years',
            'depreciation_method', 'depreciation_method_display',
            'accumulated_depreciation', 'current_book_value', 'last_depreciation_date',
            'serial_number', 'model', 'manufacturer', 'location', 'condition', 'condition_display',
            'status', 'status_display', 'assigned_to', 'assigned_to_name', 'department',
            'disposal_date', 'disposal_amount', 'disposal_method',
            'warranty_expiry', 'insurance_value', 'next_maintenance_date',
            'notes', 'tags', 'created_by', 'created_by_name', 'created_at', 'updated_at',
            'age_in_years', 'depreciation_rate', 'monthly_depreciation', 'annual_depreciation'
        ]
        read_only_fields = [
            'id', 'asset_number', 'accumulated_depreciation', 'current_book_value',
            'last_depreciation_date', 'created_by', 'created_at', 'updated_at'
        ]


class AssetCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = [
            'name', 'description', 'category', 'purchase_cost', 'purchase_date',
            'salvage_value', 'useful_life_years', 'depreciation_method',
            'serial_number', 'model', 'manufacturer', 'location', 'condition',
            'status', 'assigned_to', 'department', 'warranty_expiry',
            'insurance_value', 'next_maintenance_date', 'notes', 'tags'
        ]

    def validate(self, data):
        # Ensure salvage value is not greater than purchase cost
        if data.get('salvage_value', 0) >= data.get('purchase_cost', 0):
            raise serializers.ValidationError(
                "Salvage value must be less than purchase cost"
            )

        # Ensure useful life is positive
        if data.get('useful_life_years', 0) <= 0:
            raise serializers.ValidationError(
                "Useful life must be greater than 0"
            )

        return data


class AssetUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = [
            'name', 'description', 'location', 'condition', 'status',
            'assigned_to', 'department', 'warranty_expiry', 'insurance_value',
            'next_maintenance_date', 'notes', 'tags', 'disposal_date',
            'disposal_amount', 'disposal_method'
        ]

    def validate(self, data):
        instance = self.instance

        # If disposing asset, require disposal fields
        if data.get('status') in ['DISPOSED', 'SOLD']:
            if not data.get('disposal_date') and not instance.disposal_date:
                raise serializers.ValidationError(
                    "Disposal date is required when disposing asset"
                )

        return data


class AssetSummarySerializer(serializers.Serializer):
    total_assets = serializers.IntegerField()
    total_purchase_cost = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_book_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_accumulated_depreciation = serializers.DecimalField(max_digits=15, decimal_places=2)
    monthly_depreciation = serializers.DecimalField(max_digits=15, decimal_places=2)
    depreciation_percentage = serializers.FloatField()
    recent_assets_count = serializers.IntegerField()
    maintenance_due_count = serializers.IntegerField()
    fully_depreciated_count = serializers.IntegerField()
    categories = serializers.ListField(child=serializers.DictField())


class AssetDepreciationSerializer(serializers.ModelSerializer):
    asset_number = serializers.CharField(source='asset.asset_number', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)

    class Meta:
        model = AssetDepreciation
        fields = [
            'id', 'asset', 'asset_number', 'asset_name', 'period_month', 'period_year',
            'depreciation_amount', 'accumulated_depreciation', 'book_value',
            'journal_entry_created', 'journal_entry_id', 'created_at'
        ]


class AssetMaintenanceSerializer(serializers.ModelSerializer):
    asset_number = serializers.CharField(source='asset.asset_number', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    maintenance_type_display = serializers.CharField(source='get_maintenance_type_display', read_only=True)

    class Meta:
        model = AssetMaintenance
        fields = [
            'id', 'asset', 'asset_number', 'asset_name', 'maintenance_type',
            'maintenance_type_display', 'description', 'cost', 'service_date',
            'service_provider', 'next_service_date', 'parts_cost', 'labor_cost',
            'labor_hours', 'notes', 'performed_by', 'performed_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'performed_by', 'created_at']


class AssetTransferSerializer(serializers.ModelSerializer):
    asset_number = serializers.CharField(source='asset.asset_number', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    from_user_name = serializers.CharField(source='from_user.get_full_name', read_only=True)
    to_user_name = serializers.CharField(source='to_user.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = AssetTransfer
        fields = [
            'id', 'asset', 'asset_number', 'asset_name', 'transfer_date',
            'from_location', 'to_location', 'from_user', 'from_user_name',
            'to_user', 'to_user_name', 'reason', 'notes', 'created_by',
            'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at']
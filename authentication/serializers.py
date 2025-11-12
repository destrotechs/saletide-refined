from rest_framework import serializers
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Branch, UserRole

User = get_user_model()


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'code', 'address', 'phone', 'email', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    branch = BranchSerializer(read_only=True)
    branch_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    password = serializers.CharField(write_only=True, required=False)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'phone',
            'role', 'branch', 'branch_id', 'is_active', 'date_joined',
            'last_login', 'created_at', 'password'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        branch_id = validated_data.pop('branch_id', None)
        password = validated_data.pop('password')

        user = User(**validated_data)

        if branch_id:
            user.branch_id = branch_id

        user.set_password(password)
        user.save()

        return user

    def update(self, instance, validated_data):
        branch_id = validated_data.pop('branch_id', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if branch_id:
            instance.branch_id = branch_id

        if password:
            instance.set_password(password)

        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        if email and password:
            user = authenticate(email=email, password=password)

            if user:
                if not user.is_active:
                    msg = 'User account is disabled.'
                    raise serializers.ValidationError(msg)
            else:
                msg = 'Unable to log in with provided credentials.'
                raise serializers.ValidationError(msg)
        else:
            msg = 'Must include "email" and "password".'
            raise serializers.ValidationError(msg)

        data['user'] = user
        return data


class RefreshTokenSerializer(serializers.Serializer):
    refresh_token = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, style={'input_type': 'password'})
    new_password = serializers.CharField(required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(required=True, style={'input_type': 'password'})

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("New passwords don't match")
        return data


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class RoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=UserRole.choices)
    label = serializers.SerializerMethodField()

    def get_label(self, obj):
        return UserRole(obj['role']).label


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile information"""

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone']

    def validate_email(self, value):
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class TokenResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    user = UserSerializer()
    expires_in = serializers.IntegerField()
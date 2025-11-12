from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import Branch, RefreshToken, UserRole
from .serializers import (
    UserSerializer, BranchSerializer, LoginSerializer,
    RefreshTokenSerializer, ChangePasswordSerializer,
    ResetPasswordSerializer, TokenResponseSerializer,
    ProfileUpdateSerializer
)
from .backends import JWTUtils
from .permissions import IsAdmin, IsManager
from django.conf import settings

User = get_user_model()


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={200: TokenResponseSerializer}
    )
    @action(detail=False, methods=['post'])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        access_token = JWTUtils.generate_access_token(user)
        refresh_token = JWTUtils.generate_refresh_token(user)

        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        return Response({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': UserSerializer(user).data,
            'expires_in': settings.JWT_AUTH['JWT_ACCESS_TOKEN_LIFETIME'].total_seconds()
        })

    @extend_schema(
        request=RefreshTokenSerializer,
        responses={200: TokenResponseSerializer}
    )
    @action(detail=False, methods=['post'])
    def refresh(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data['refresh_token']
        user = JWTUtils.verify_refresh_token(refresh_token)

        if not user:
            return Response(
                {'error': 'Invalid refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Blacklist old refresh token
        JWTUtils.blacklist_token(refresh_token)

        # Generate new tokens
        access_token = JWTUtils.generate_access_token(user)
        new_refresh_token = JWTUtils.generate_refresh_token(user)

        return Response({
            'access_token': access_token,
            'refresh_token': new_refresh_token,
            'user': UserSerializer(user).data,
            'expires_in': settings.JWT_AUTH['JWT_ACCESS_TOKEN_LIFETIME'].total_seconds()
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        refresh_token = request.data.get('refresh_token')

        if refresh_token:
            JWTUtils.blacklist_token(refresh_token)

        return Response({'message': 'Successfully logged out'})

    @extend_schema(
        request=ChangePasswordSerializer
    )
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Invalid old password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        # Blacklist all refresh tokens
        RefreshToken.objects.filter(user=user, is_blacklisted=False).update(is_blacklisted=True)

        return Response({'message': 'Password changed successfully'})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(
        request=ProfileUpdateSerializer,
        responses={200: UserSerializer}
    )
    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        """Update the current user's profile information"""
        serializer = ProfileUpdateSerializer(
            instance=request.user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            'message': 'Profile updated successfully',
            'user': UserSerializer(user).data
        })


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """
        Allow authenticated users to list and retrieve users (for assignment purposes),
        but only managers can create, update, or delete users.
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsManager()]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by role if provided
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role=role)

        # Filter by branch if provided
        branch_id = self.request.query_params.get('branch', None)
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'message': 'User activated successfully'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()

        # Blacklist all refresh tokens
        RefreshToken.objects.filter(user=user, is_blacklisted=False).update(is_blacklisted=True)

        return Response({'message': 'User deactivated successfully'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def change_role(self, request, pk=None):
        user = self.get_object()
        new_role = request.data.get('role')

        if new_role not in dict(UserRole.choices):
            return Response(
                {'error': 'Invalid role'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.role = new_role
        user.save()

        return Response({'message': 'Role changed successfully'})


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated, IsManager]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

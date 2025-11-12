from rest_framework import permissions
from .models import UserRole


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == UserRole.ADMIN:
            return True

        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user

        return False


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.ADMIN


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [UserRole.ADMIN, UserRole.MANAGER]


class IsSalesAgent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_AGENT
        ]


class IsTechnician(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN
        ]


class IsInventoryClerk(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK
        ]


class IsAccountant(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserRole.ADMIN, UserRole.ACCOUNTANT
        ]


class CanViewFloorPrices(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.can_view_floor_prices()


class CanApproveOverrides(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.can_approve_overrides()


class RoleBasedPermission(permissions.BasePermission):
    role_permissions = {
        'view': {
            UserRole.ADMIN: True,
            UserRole.MANAGER: True,
            UserRole.SALES_AGENT: True,
            UserRole.TECHNICIAN: True,
            UserRole.INVENTORY_CLERK: True,
            UserRole.ACCOUNTANT: True,
        },
        'create': {
            UserRole.ADMIN: True,
            UserRole.MANAGER: True,
            UserRole.SALES_AGENT: True,
            UserRole.TECHNICIAN: False,
            UserRole.INVENTORY_CLERK: True,
            UserRole.ACCOUNTANT: False,
        },
        'update': {
            UserRole.ADMIN: True,
            UserRole.MANAGER: True,
            UserRole.SALES_AGENT: False,
            UserRole.TECHNICIAN: False,
            UserRole.INVENTORY_CLERK: True,
            UserRole.ACCOUNTANT: False,
        },
        'delete': {
            UserRole.ADMIN: True,
            UserRole.MANAGER: True,
            UserRole.SALES_AGENT: False,
            UserRole.TECHNICIAN: False,
            UserRole.INVENTORY_CLERK: False,
            UserRole.ACCOUNTANT: False,
        },
    }

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            action = 'view'
        elif request.method == 'POST':
            action = 'create'
        elif request.method in ['PUT', 'PATCH']:
            action = 'update'
        elif request.method == 'DELETE':
            action = 'delete'
        else:
            return False

        return self.role_permissions.get(action, {}).get(request.user.role, False)
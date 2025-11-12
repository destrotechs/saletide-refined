from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .views import AuthViewSet, UserViewSet, BranchViewSet
from .serializers import UserSerializer

# Create separate routers for cleaner URL structure
auth_router = DefaultRouter()
auth_router.register('', AuthViewSet, basename='auth')

user_router = DefaultRouter()
user_router.register('', UserViewSet, basename='users')

branch_router = DefaultRouter()
branch_router.register('', BranchViewSet, basename='branches')

# Simple view for current user
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    return Response(UserSerializer(request.user).data)

urlpatterns = [
    path('', include(auth_router.urls)),  # This will make login accessible at /api/v1/auth/login/
    path('user/', current_user_view, name='current-user'),  # This will make /api/v1/auth/user/ work
    path('users/', include(user_router.urls)),
    path('branches/', include(branch_router.urls)),
]
"""
URL configuration for timax_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        'message': 'TIMAX Automotive Services API',
        'version': '1.0.0',
        'endpoints': {
            'authentication': '/api/v1/auth/',
            'users': '/api/v1/users/',
            'branches': '/api/v1/branches/',
            'services': '/api/v1/services/',
            'inventory': '/api/v1/inventory/',
            'assets': '/api/v1/assets/',
            'sales': '/api/v1/sales/',
            'reports': '/api/v1/reports/',
            'accounting': '/api/v1/accounting/',
            'expenses': '/api/v1/expenses/',
            'documentation': '/api/docs/',
            'schema': '/api/schema/',
        }
    })


urlpatterns = [
    path('admin/', admin.site.urls),

    # API Root
    path('api/', api_root, name='api-root'),

    # API v1 routes
    path('api/v1/auth/', include('authentication.urls')),
    path('api/v1/dashboard/', include('dashboard.urls')),
    path('api/v1/services/', include('services.urls')),
    path('api/v1/inventory/', include('inventory.urls')),
    path('api/v1/assets/', include('assets.urls')),
    path('api/v1/sales/', include('sales.urls')),
    path('api/v1/reports/', include('reports.urls')),
    path('api/v1/accounting/', include('accounting.urls')),
    path('api/v1/expenses/', include('expenses.urls')),
    path('api/v1/', include('analytics.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Media files (development only)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

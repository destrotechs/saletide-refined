import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import authentication, exceptions
from datetime import datetime, timedelta

User = get_user_model()


class JWTAuthentication(authentication.BaseAuthentication):
    authentication_header_prefix = 'Bearer'

    def authenticate(self, request):
        request.user = None
        auth_header = authentication.get_authorization_header(request).split()
        auth_header_prefix = self.authentication_header_prefix.lower()

        if not auth_header:
            return None

        if len(auth_header) == 1:
            return None

        elif len(auth_header) > 2:
            return None

        prefix = auth_header[0].decode('utf-8')
        token = auth_header[1].decode('utf-8')

        if prefix.lower() != auth_header_prefix:
            return None

        return self._authenticate_credentials(request, token)

    def _authenticate_credentials(self, request, token):
        try:
            payload = jwt.decode(
                token,
                settings.JWT_AUTH['JWT_SECRET_KEY'],
                algorithms=[settings.JWT_AUTH['JWT_ALGORITHM']]
            )
        except jwt.ExpiredSignatureError:
            msg = 'Token has expired.'
            raise exceptions.AuthenticationFailed(msg)
        except jwt.InvalidTokenError:
            msg = 'Invalid token.'
            raise exceptions.AuthenticationFailed(msg)

        try:
            user = User.objects.get(pk=payload['user_id'])
        except User.DoesNotExist:
            msg = 'No user matching this token was found.'
            raise exceptions.AuthenticationFailed(msg)

        if not user.is_active:
            msg = 'This user has been deactivated.'
            raise exceptions.AuthenticationFailed(msg)

        return (user, token)


class JWTUtils:
    @staticmethod
    def generate_access_token(user):
        dt = timezone.now() + settings.JWT_AUTH['JWT_ACCESS_TOKEN_LIFETIME']

        token = jwt.encode({
            'user_id': str(user.id),
            'email': user.email,
            'role': user.role,
            'exp': dt,
            'iat': timezone.now(),
            'token_type': 'access'
        }, settings.JWT_AUTH['JWT_SECRET_KEY'], algorithm=settings.JWT_AUTH['JWT_ALGORITHM'])

        return token

    @staticmethod
    def generate_refresh_token(user):
        from .models import RefreshToken

        dt = timezone.now() + settings.JWT_AUTH['JWT_REFRESH_TOKEN_LIFETIME']

        token = jwt.encode({
            'user_id': str(user.id),
            'exp': dt,
            'iat': timezone.now(),
            'token_type': 'refresh'
        }, settings.JWT_AUTH['JWT_SECRET_KEY'], algorithm=settings.JWT_AUTH['JWT_ALGORITHM'])

        # Store refresh token in database
        RefreshToken.objects.create(
            user=user,
            token=token,
            expires_at=dt
        )

        return token

    @staticmethod
    def verify_refresh_token(token):
        from .models import RefreshToken

        try:
            payload = jwt.decode(
                token,
                settings.JWT_AUTH['JWT_SECRET_KEY'],
                algorithms=[settings.JWT_AUTH['JWT_ALGORITHM']]
            )

            if payload.get('token_type') != 'refresh':
                return None

            refresh_token = RefreshToken.objects.filter(
                token=token,
                user_id=payload['user_id'],
                is_blacklisted=False
            ).first()

            if refresh_token and refresh_token.is_valid():
                return refresh_token.user

        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, RefreshToken.DoesNotExist):
            pass

        return None

    @staticmethod
    def blacklist_token(token):
        from .models import RefreshToken

        try:
            refresh_token = RefreshToken.objects.get(token=token)
            refresh_token.is_blacklisted = True
            refresh_token.save()
            return True
        except RefreshToken.DoesNotExist:
            return False
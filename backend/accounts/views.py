from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Count, Q
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.filters import SearchFilter
from rest_framework.generics import ListCreateAPIView, UpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import send_password_reset_email
from .models import User
from .permissions import IsAdmin
from .serializers import (
    ChangePasswordSerializer,
    CreateUserSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    ProfileSerializer,
    ResetPasswordSerializer,
    ResetTokenSerializer,
    UserListSerializer,
    UserSerializer,
    UserStatusSerializer,
)


class LoginView(TokenObtainPairView):
    """POST username + password -> access, refresh, user (with role)."""

    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class MeView(APIView):
    """
    GET   -> the signed-in user's profile.
    PATCH -> update the permitted fields (first_name, last_name, email).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(ProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """POST {"current_password","new_password"} -> changes your own password."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password changed.'})


class UserListCreateView(ListCreateAPIView):
    """
    GET  -> admin only: paginated list.
            ?search=<text>  ?role=ADMIN|FACULTY|STUDENT
            ?status=active|suspended|inactive|never
    POST -> admin creates a faculty account.
    """

    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']


    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateUserSerializer
        return UserListSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by('-date_joined')
        params = self.request.query_params
        role = params.get('role')
        if role in User.Role.values:
            qs = qs.filter(role=role)
        status = params.get('status')
        if status in ('active', 'suspended', 'inactive'):
            qs = qs.filter(status=status.upper())
        elif status == 'never':  # has an account but has never signed in
            qs = qs.filter(status=User.Status.ACTIVE, last_login__isnull=True)
        return qs


class UserStatsView(APIView):
    """GET -> the register: totals per role, split by account state."""

    permission_classes = [IsAdmin]

    def get(self, request):
        never = Q(status=User.Status.ACTIVE, last_login__isnull=True)
        rows = {
            r['role']: r
            for r in User.objects.values('role').annotate(
                total=Count('id'),
                active=Count('id', filter=Q(status=User.Status.ACTIVE)),
                suspended=Count('id', filter=Q(status=User.Status.SUSPENDED)),
                inactive=Count('id', filter=Q(status=User.Status.INACTIVE)),
                never_signed_in=Count('id', filter=never),
            )
        }
        empty = {'total': 0, 'active': 0, 'suspended': 0, 'inactive': 0,
                 'never_signed_in': 0}
        by_role = [
            {'role': role, **{k: rows.get(role, empty)[k] for k in empty}}
            for role in (User.Role.FACULTY, User.Role.STUDENT, User.Role.ADMIN)
        ]
        totals = {k: sum(r[k] for r in by_role) for k in empty}
        return Response({**totals, 'by_role': by_role})


class UserStatusView(UpdateAPIView):
    """PATCH {"status": ACTIVE|SUSPENDED|INACTIVE, "status_reason"?} (admin only)."""

    queryset = User.objects.all()
    serializer_class = UserStatusSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['patch']


class PasswordResetThrottle(AnonRateThrottle):
    scope = 'password_reset'


class ForgotPasswordView(APIView):
    """
    POST {"email"} -> emails a reset link if the account exists.
    Always answers the same way, so nobody can probe which emails are registered.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_password_reset_email(user, link)

        return Response(
            {'detail': 'If an account exists for that email, a reset link is on its way.'}
        )


class VerifyResetTokenView(APIView):
    """POST {"uid","token"} -> 200 if the reset link is still valid, 400 if not."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ResetTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({'valid': True})


class ResetPasswordView(APIView):
    """POST {"uid","token","new_password"} -> sets the new password."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])  # also invalidates the used token
        return Response({'detail': 'Password updated. You can now sign in.'})

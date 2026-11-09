from django.urls import path

from .views import (
    ChangePasswordView,
    ForgotPasswordView,
    LoginView,
    MeView,
    ResetPasswordView,
    UserListCreateView,
    UserStatsView,
    UserStatusView,
    VerifyResetTokenView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('me/', MeView.as_view(), name='me'),
    path('me/password/', ChangePasswordView.as_view(), name='change-password'),

    path('users/', UserListCreateView.as_view(), name='users'),
    path('users/stats/', UserStatsView.as_view(), name='user-stats'),
    path('users/<int:pk>/', UserStatusView.as_view(), name='user-status'),

    path('password/forgot/', ForgotPasswordView.as_view(), name='password-forgot'),
    path('password/verify/', VerifyResetTokenView.as_view(), name='password-verify'),
    path('password/reset/', ResetPasswordView.as_view(), name='password-reset'),
]

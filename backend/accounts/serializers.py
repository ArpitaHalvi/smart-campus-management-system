from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


def clean_unique_email(value, exclude_pk=None):
    """Emails are stored lower-case and must be unique ignoring case."""
    value = value.strip().lower()
    taken = User.objects.filter(email__iexact=value)
    if exclude_pk is not None:
        taken = taken.exclude(pk=exclude_pk)
    if taken.exists():
        raise serializers.ValidationError('A user with this email already exists.')
    return value


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']
        read_only_fields = fields


class CreateUserSerializer(serializers.ModelSerializer):
    """
    Used by admins to create faculty accounts.
    Students are registered through the students API (account + record
    together), and ADMIN accounts can never be created through the API.
    """

    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password',
                  'first_name', 'last_name', 'role']
        read_only_fields = ['id']
        extra_kwargs = {'role': {'required': True}}

    def validate_email(self, value):
        return clean_unique_email(value)

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_role(self, value):
        if value != User.Role.FACULTY:
            raise serializers.ValidationError(
                'Only faculty accounts are created here. '
                'Register students from the Students page.'
            )
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    """
    Validates username + password and returns access/refresh tokens
    plus the user's details, so the frontend knows which dashboard to show.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Extra claims stored inside the JWT itself
        token['role'] = user.role
        token['username'] = user.username
        return token

    def validate(self, attrs):
        # Tell a suspended or deactivated user why they can't sign in, but only
        # once the password is right, so this never reveals who has an account.
        user = User.objects.filter(username=attrs.get('username')).first()
        if (
            user
            and user.status != User.Status.ACTIVE
            and user.check_password(attrs.get('password', ''))
        ):
            what = (
                'suspended'
                if user.status == User.Status.SUSPENDED
                else 'deactivated'
            )
            reason = f' Reason: {user.status_reason}.' if user.status_reason else ''
            raise AuthenticationFailed(
                f'Your account has been {what}.{reason} '
                'Please contact your administrator.'
            )

        data = super().validate(attrs)  # raises 401 on bad credentials
        data['user'] = UserSerializer(self.user).data
        return data


class UserListSerializer(serializers.ModelSerializer):
    """What the admin dashboard shows for each user."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'status', 'status_reason', 'is_active',
                  'date_joined', 'last_login']
        read_only_fields = fields


class UserStatusSerializer(serializers.ModelSerializer):
    """Admin activates, suspends or deactivates an account."""

    class Meta:
        model = User
        fields = ['id', 'status', 'status_reason', 'is_active']
        read_only_fields = ['id', 'is_active']

    def validate(self, attrs):
        if self.instance.pk == self.context['request'].user.pk:
            raise serializers.ValidationError(
                {'status': "You can't change the status of your own account."}
            )
        if attrs.get('status') == User.Status.ACTIVE:
            attrs['status_reason'] = ''  # nothing to explain once active again
        return attrs


class ProfileSerializer(serializers.ModelSerializer):
    """A user's own profile. Only name and email can be changed."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'status', 'date_joined', 'last_login']
        read_only_fields = ['id', 'username', 'role', 'status',
                            'date_joined', 'last_login']
        extra_kwargs = {'first_name': {'required': True, 'allow_blank': False}}

    def validate_email(self, value):
        return clean_unique_email(value, exclude_pk=self.instance.pk)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('That is not your current password.')
        return value

    def validate_new_password(self, value):
        validate_password(value, user=self.context['request'].user)
        return value

    def validate(self, attrs):
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError(
                {'new_password': 'Choose a different password from your current one.'}
            )
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetTokenSerializer(serializers.Serializer):
    """The uid + token pair from the reset link. Validates both."""

    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, attrs):
        invalid = serializers.ValidationError(
            {'token': 'This reset link is invalid or has expired.'}
        )
        try:
            user_id = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise invalid
        if not default_token_generator.check_token(user, attrs['token']):
            raise invalid
        attrs['user'] = user
        return attrs


class ResetPasswordSerializer(ResetTokenSerializer):
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        try:
            validate_password(attrs['new_password'], user=attrs['user'])
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {'new_password': list(exc.messages)}
            )
        return attrs

from rest_framework import serializers
from accounts.models import User
from academics.models import Department
from .models import Faculty


class UserDetailSerializer(serializers.ModelSerializer):
    """Read-only nested user details for Faculty."""
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email']
        read_only_fields = ['id', 'first_name', 'last_name', 'email']


class DepartmentDetailSerializer(serializers.ModelSerializer):
    """Read-only nested department details for Faculty."""
    class Meta:
        model = Department
        fields = ['id', 'name', 'code']
        read_only_fields = ['id', 'name', 'code']


class FacultySerializer(serializers.ModelSerializer):

    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            role=User.Role.FACULTY,
            status=User.Status.ACTIVE
        )
    )
    
    user_details = UserDetailSerializer(source='user', read_only=True)
    department_details = DepartmentDetailSerializer(source='department', read_only=True)

    class Meta:
        model = Faculty
        fields = [
            'id',
            'user',
            'user_details',
            'employee_id',
            'department',
            'department_details',
            'designation',
            'qualification',
            'specialization',
            'phone',
            'joining_date',
            'is_active',
            'created_at',
            'updated_at'
        ]

        read_only_fields = ['id', 'user_details', 'department_details', 'created_at', 'updated_at']

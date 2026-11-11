from rest_framework import serializers
from accounts.models import User
from .models import Faculty


class FacultySerializer(serializers.ModelSerializer):

    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            role=User.Role.FACULTY,
            status=User.Status.ACTIVE
        )
    )

    class Meta:
        model = Faculty
        fields = [
            'id',
            'user',
            'employee_id',
            'department',
            'designation',
            'qualification',
            'specialization',
            'phone',
            'joining_date',
            'is_active',
            'created_at',
            'updated_at'
        ]

        read_only_fields = ['id', 'created_at', 'updated_at']

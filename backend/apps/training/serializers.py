from rest_framework import serializers
from .models import TrainingCourse, TrainingEnrollment

class TrainingCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingCourse
        fields = ["id", "name", "duration_hours", "validity_months", "active", "description", "created_at"]

class CaregiverTrainingBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="id.id")
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField(source="id.email")
    states = serializers.SerializerMethodField()

    def get_states(self, obj):
        state = getattr(obj, "state", None)
        if not state:
            return None
        return {"id": state.id, "code": state.code, "name": state.name}

class TrainingEnrollmentSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    duration_hours = serializers.DecimalField(source="course.duration_hours", max_digits=4, decimal_places=1, read_only=True)
    training_courses = TrainingCourseSerializer(source="course", read_only=True)
    caregivers = CaregiverTrainingBriefSerializer(source="caregiver", read_only=True)

    class Meta:
        model = TrainingEnrollment
        fields = [
            "id", "course_id", "course_name", "duration_hours", "status",
            "due_at", "enrolled_at", "completed_at", "created_at",
            "training_courses", "caregivers",
        ]
        read_only_fields = ["id", "enrolled_at", "completed_at", "created_at"]

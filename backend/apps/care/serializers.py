from rest_framework import serializers
from .models import CarePlan, CarePlanActivity, CareSchedule, CaregiverClientAssignment
from apps.caregivers.models import Caregiver
from apps.clients.models import Client

class CaregiverBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caregiver
        fields = ["id", "first_name", "last_name", "phone"]

class ClientBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "first_name", "last_name", "phone"]

class CarePlanActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = CarePlanActivity
        fields = ["id", "task", "frequency", "notes", "sort_order"]

class CarePlanSerializer(serializers.ModelSerializer):
    activities = CarePlanActivitySerializer(many=True, read_only=True)
    daily_activities = CarePlanActivitySerializer(source="activities", many=True, read_only=True)
    plan_status = serializers.CharField(source="status", read_only=True)
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = CarePlan
        fields = [
            "id", "client_id", "state_id", "caregiver_id", "status", "plan_status",
            "effective_date", "primary_nurse", "emergency_protocol",
            "activities", "daily_activities", "client_name", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_client_name(self, obj):
        try:
            profile = getattr(obj.client, "client_profile", None)
            if profile:
                return f"{profile.first_name} {profile.last_name}"
            return obj.client.email
        except Exception:
            return "Client"

class CareScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareSchedule
        fields = [
            "id", "client_id", "caregiver_id", "state_id", "day_of_week",
            "start_time", "end_time", "service", "notes", "status", "created_at"
        ]
        read_only_fields = ["id", "created_at"]

class CaregiverClientAssignmentSerializer(serializers.ModelSerializer):
    caregiver_name = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    caregivers = CaregiverBriefSerializer(source="caregiver", read_only=True)
    clients = ClientBriefSerializer(source="client", read_only=True)

    class Meta:
        model = CaregiverClientAssignment
        fields = [
            "id", "caregiver_id", "caregiver_name", "client_id", "client_name",
            "caregivers", "clients",
            "role", "assigned_at", "ended_at", "created_at"
        ]
        read_only_fields = ["id", "assigned_at", "created_at"]

    def get_caregiver_name(self, obj):
        return f"{obj.caregiver.first_name} {obj.caregiver.last_name}"

    def get_client_name(self, obj):
        return f"{obj.client.first_name} {obj.client.last_name}"

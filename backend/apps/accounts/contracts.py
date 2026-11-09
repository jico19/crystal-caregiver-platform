from rest_framework import serializers


class BranchOutput(serializers.Serializer):
    public_id = serializers.UUIDField()
    state_code = serializers.CharField()
    display_name = serializers.CharField()


class SessionOutput(serializers.Serializer):
    email = serializers.EmailField()
    roles = serializers.ListField(child=serializers.CharField())
    branches = BranchOutput(many=True)


class CSRFOutput(serializers.Serializer):
    csrfToken = serializers.CharField()


class AuthOutput(CSRFOutput):
    user = SessionOutput()


class DetailOutput(serializers.Serializer):
    detail = serializers.CharField()


class InvitationOutput(serializers.Serializer):
    public_id = serializers.UUIDField()
    status = serializers.CharField()


class ApplicationOutput(AuthOutput):
    application = serializers.UUIDField()
    status = serializers.CharField()

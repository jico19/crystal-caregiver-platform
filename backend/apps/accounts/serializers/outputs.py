"""Schema contracts for branch, session, invitation, and authentication responses."""

from rest_framework import serializers


# Describe public branch identifiers included in authentication responses.
class BranchOutput(serializers.Serializer):
    public_id = serializers.UUIDField()
    state_code = serializers.CharField()
    display_name = serializers.CharField()


# Describe the session identity, business roles, and accessible branches.
class SessionOutput(serializers.Serializer):
    email = serializers.EmailField()
    roles = serializers.ListField(child=serializers.CharField())
    branches = BranchOutput(many=True)


# Describe the CSRF bootstrap token for same-origin requests.
class CSRFOutput(serializers.Serializer):
    csrfToken = serializers.CharField()


# Combine the authenticated identity and newly issued CSRF token.
class AuthOutput(CSRFOutput):
    user = SessionOutput()


# Describe generic status messages without exposing account data.
class DetailOutput(serializers.Serializer):
    detail = serializers.CharField()


# Describe an invitation's public identifier and initial status.
class InvitationOutput(serializers.Serializer):
    public_id = serializers.UUIDField()
    status = serializers.CharField()


# Describe application submission and the resulting authentication response.
class ApplicationOutput(AuthOutput):
    application = serializers.UUIDField()
    status = serializers.CharField()

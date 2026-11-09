import django_filters
from .models import Caregiver


# Filter the already authorized staff queue by state and demo onboarding status.
class OnboardingFilter(django_filters.FilterSet):
    state = django_filters.CharFilter(field_name="branch__state_code")
    status = django_filters.ChoiceFilter(field_name="onboarding_status", choices=[("pending", "Pending"), ("onboarding", "Onboarding"), ("eligible", "Demo onboarding complete")])

    class Meta:
        model = Caregiver
        fields = ["state", "status"]

from django.db import models
from django.db.models import Q
from django.utils import timezone
from .base import ScopedRecord, relation, actor, unique


class BranchOnboardingPolicy(ScopedRecord):
    expiry_lead_days = models.PositiveIntegerField(default=30)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("branch", name="onboarding_policy_branch"),
            models.CheckConstraint(condition=Q(expiry_lead_days__gte=0), name="onboarding_lead_nonnegative"),
        ]


class CaregiverOnboardingEvent(ScopedRecord):
    caregiver = relation("operations.Caregiver")
    reviewer = actor()
    previous_status = models.CharField(max_length=24, default="pending")
    new_status = models.CharField(max_length=24, default="onboarding")
    occurred_at = models.DateTimeField(default=timezone.now)
    evidence = models.JSONField(default=dict)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            models.CheckConstraint(condition=Q(previous_status__in=["pending", "onboarding"]) & Q(new_status__in=["onboarding", "eligible"]), name="onboarding_event_status"),
            models.UniqueConstraint(fields=["caregiver", "new_status"], name="one_onboarding_milestone"),
        ]

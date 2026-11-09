from django.db import models

from .base import Record, ScopedRecord, actor, relation, unique


class Agency(Record):
    name = models.CharField(max_length=200)


class StateBranch(Record):
    agency = relation(Agency)
    state_code = models.CharField(max_length=2, choices=[(s, s) for s in ("FL", "IN", "GA")])
    display_name = models.CharField(max_length=200)
    timezone = models.CharField(max_length=64)
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            unique("agency", "state_code", name="agency_state_unique"),
            models.CheckConstraint(
                condition=models.Q(state_code__in=["FL", "IN", "GA"]), name="supported_state"
            ),
        ]


class AgencyAdmin(Record):
    agency = relation(Agency)
    user = actor()
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [unique("agency", "user", name="agency_admin_unique")]


class BranchStaff(ScopedRecord):
    user = actor()
    role = models.CharField(
        max_length=24, choices=[("administrator", "Administrator"), ("staff", "Staff")]
    )
    active = models.BooleanField(default=True)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("branch", "user", name="branch_staff_unique"),
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(role="administrator", active=True),
                name="one_active_admin_state",
            ),
            models.CheckConstraint(
                condition=models.Q(role__in=["administrator", "staff"]), name="branch_staff_role"
            ),
        ]


class PersonRecord(ScopedRecord):
    user = actor(null=True, blank=True)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    active = models.BooleanField(default=True)

    class Meta(ScopedRecord.Meta):
        abstract = True
        constraints = ScopedRecord.Meta.constraints + [
            unique("branch", "user", name="%(class)s_branch_user")
        ]


class Caregiver(PersonRecord):
    onboarding_status = models.CharField(max_length=32, default="pending")


class Client(PersonRecord):
    admission_status = models.CharField(max_length=32, default="pending")
    service_start_date = models.DateField(null=True, blank=True)

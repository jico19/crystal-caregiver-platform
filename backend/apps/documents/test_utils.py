from datetime import date, timedelta
from unittest.mock import patch

from rest_framework import status

from apps.caregivers.models import Caregiver
from apps.clients.models import Client
from apps.compliance.models import AuditLog
from apps.core.test_utils import BasePlatformTestCase, User

from .models import Document, DocumentRequirement, DocumentType


class ComplianceEndpointTestCase(BasePlatformTestCase):
    evaluation_date = date(2026, 6, 15)

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        # Isolate the requirements from the platform's seeded checklist.
        DocumentRequirement.objects.all().delete()
        cls.caregiver_user = User.objects.create_user(
            email="compliance.caregiver@example.test",
            role=cls.caregiver_role,
            state=cls.fl,
        )
        cls.caregiver = Caregiver.objects.create(
            id=cls.caregiver_user,
            state=cls.fl,
            first_name="Synthetic",
            last_name="Caregiver",
        )
        cls.client_user = User.objects.create_user(
            email="compliance.client@example.test",
            role=cls.client_role,
            state=cls.fl,
        )
        cls.client_record = Client.objects.create(
            id=cls.client_user,
            state=cls.fl,
            first_name="Synthetic",
            last_name="Client",
            date_of_birth=date(1950, 1, 1),
        )
        cls.fl_admin = User.objects.get(email="fl.admin@caregiverplatform.com")
        cls.in_admin = User.objects.create_user(
            email="compliance.in.admin@example.test",
            role=cls.admin_role,
            state=cls.in_state,
        )
        cls.required_type = DocumentType.objects.create(
            name="Synthetic Required Credential",
            for_role="both",
            requires_expiration=True,
        )
        DocumentRequirement.objects.create(
            state=cls.fl,
            document_type=cls.required_type,
            for_role="both",
        )

    def _document(self, *, owner, **overrides):
        fields = {
            "owner": owner,
            "state": self.fl,
            "document_type": self.required_type,
            "storage_path": "synthetic/compliance.pdf",
            "status": "approved",
        }
        fields.update(overrides)
        return Document.objects.create(**fields)

    def _compliance_records(self):
        return {
            model._meta.label: list(model.objects.order_by("pk").values())
            for model in (
                User,
                Client,
                Caregiver,
                DocumentType,
                DocumentRequirement,
                Document,
                AuditLog,
            )
        }

    def _get_compliance(self):
        self.client.force_authenticate(user=self.compliance_actor)
        before = self._compliance_records()
        with patch(f"{self.clock_module}.date") as clock:
            clock.today.return_value = self.evaluation_date
            response = self.client.get(self.compliance_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._compliance_records(), before)
        return response.json()

    def _expected_compliance(
        self,
        *,
        approved=(),
        expired=(),
        expiring=(),
        missing=(),
    ):
        compliant = not missing and not expired
        if self.compliance_kind == "admin":
            return {
                "caregiver_id": str(self.caregiver.id),
                "compliant": not missing,
                "missing_requirements": list(missing),
                "approved_credentials": list(approved),
            }
        if self.compliance_kind == "caregiver":
            return {
                "compliant": compliant,
                "missing_requirements": list(missing),
                "approved": list(approved),
                "expired": list(expired),
                "expiring_soon": list(expiring),
            }
        types = [
            {
                "document_type_id": self.required_type.pk,
                "name": self.required_type.name,
            }
        ]
        return {
            "summary": {
                "missing": len(missing),
                "expired": len(expired),
                "expiring_soon": len(expiring),
                "compliant": compliant,
            },
            "compliant": compliant,
            "required_types": types,
            "missing": types if missing else [],
            "expired": list(expired),
            "expiring_soon": list(expiring),
        }

    def assert_compliance_characterization(self):
        # Expected categories are explicit, independent of the
        # implementation.
        cases = (
            ("missing", None, None, "missing", True, True, True),
            ("pending", "pending_review", -1, "missing", True, True, True),
            ("rejected", "rejected", None, "missing", True, True, True),
            ("no expiry", "approved", None, "approved", False, False, False),
            ("expired date", "approved", -1, "expired", True, True, False),
            ("expired status", "expired", 31, "expired", True, True, True),
            ("today", "approved", 0, "expiring", False, True, False),
            ("within 30 days", "approved", 15, "expiring", False, True, False),
            ("day 30", "approved", 30, "expiring", False, True, False),
            ("31 days", "approved", 31, "approved", False, False, False),
        )
        name = self.required_type.name
        for label, doc_status, days, category, cg, client, admin in cases:
            with self.subTest(case=label):
                Document.objects.filter(owner=self.compliance_owner).delete()
                if doc_status:
                    self._document(
                        owner=self.compliance_owner,
                        status=doc_status,
                        expiration_date=(
                            self.evaluation_date + timedelta(days=days)
                            if days is not None
                            else None
                        ),
                    )
                missing = {
                    "caregiver": cg,
                    "client": client,
                    "admin": admin,
                }[self.compliance_kind]
                approved = category == "approved"
                if self.compliance_kind == "admin":
                    approved = doc_status == "approved"
                expected = self._expected_compliance(
                    approved=[name] if approved else [],
                    expired=[name] if category == "expired" else [],
                    expiring=[name] if category == "expiring" else [],
                    missing=[name] if missing else [],
                )
                self.assertEqual(self._get_compliance(), expected)

    def assert_replacement_characterization(self):
        name = self.required_type.name
        self._document(
            owner=self.compliance_owner,
            expiration_date=self.evaluation_date - timedelta(days=1),
        )
        self._document(owner=self.compliance_owner)
        approved = [name, name] if self.compliance_kind == "admin" else [name]
        self.assertEqual(
            self._get_compliance(),
            self._expected_compliance(
                approved=approved,
                expired=[name],
            ),
        )
        # Explicit expired records also remain visible after
        # replacement.
        Document.objects.filter(owner=self.compliance_owner).delete()
        self._document(owner=self.compliance_owner, status="expired")
        self._document(owner=self.compliance_owner)
        self.assertEqual(
            self._get_compliance(),
            self._expected_compliance(
                approved=[name],
                expired=[name],
            ),
        )

    def assert_scoping_characterization(self):
        self._document(owner=self.compliance_owner)
        optional_type = DocumentType.objects.create(name="Synthetic Optional")
        DocumentRequirement.objects.create(
            state=self.fl,
            document_type=optional_type,
            for_role="both",
            required=False,
        )
        other_state_type = DocumentType.objects.create(name="Other State Type")
        DocumentRequirement.objects.create(
            state=self.in_state,
            document_type=other_state_type,
            for_role="both",
        )
        other_role_type = DocumentType.objects.create(name="Other Role Type")
        DocumentRequirement.objects.create(
            state=self.fl,
            document_type=other_role_type,
            for_role=(
                "caregiver" if self.compliance_kind == "client" else "client"
            ),
        )
        other_owner = (
            self.caregiver_user
            if self.compliance_kind == "client"
            else self.client_user
        )
        self._document(owner=other_owner, status="expired")
        deleted = self._document(owner=self.compliance_owner, status="expired")
        deleted.soft_delete(user=self.super_user)
        self.assertEqual(
            self._get_compliance(),
            self._expected_compliance(
                approved=[self.required_type.name],
            ),
        )
        # Optional uploads still affect the legacy expiry-based
        # summaries.
        self._document(
            owner=self.compliance_owner,
            document_type=optional_type,
            status="expired",
        )
        self.assertEqual(
            self._get_compliance(),
            self._expected_compliance(
                approved=[self.required_type.name],
                expired=[optional_type.name],
            ),
        )

    def assert_document_state_scope_characterization(self):
        # Requirements use profile state, but owner uploads were not
        # restricted
        # to that state. Preserve this independently of role policy
        # decisions.
        self._document(owner=self.compliance_owner, state=self.in_state)
        self.assertEqual(
            self._get_compliance(),
            self._expected_compliance(
                approved=[self.required_type.name],
            ),
        )

    def assert_deleted_document_characterization(self):
        document = self._document(owner=self.compliance_owner)
        document.soft_delete(user=self.super_user)
        self.assertEqual(
            self._get_compliance(),
            self._expected_compliance(
                missing=[self.required_type.name],
            ),
        )

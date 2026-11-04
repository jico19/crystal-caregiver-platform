from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.core.models import State, Role
from apps.documents.models import DocumentType, DocumentRequirement
from apps.training.models import TrainingCourse
from apps.marketing.models import WebsiteContent, Service, LicensingInfo

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds initial database records: states, roles, document requirements, training courses, and initial admin accounts."

    def handle(self, *args, **options):
        self.stdout.write("Seeding states...")
        states_data = [
            {"id": 1, "code": "FL", "name": "Florida", "slug": "florida"},
            {"id": 2, "code": "IN", "name": "Indiana", "slug": "indiana"},
            {"id": 3, "code": "GA", "name": "Georgia", "slug": "georgia"},
        ]
        states_map = {}
        for s in states_data:
            obj, _ = State.objects.update_or_create(
                id=s["id"],
                defaults={"code": s["code"], "name": s["name"], "slug": s["slug"], "active": True}
            )
            states_map[s["code"]] = obj

        self.stdout.write("Seeding roles...")
        roles_data = [
            {"id": 1, "name": "super_admin", "description": "Global Super Administrator"},
            {"id": 2, "name": "administrator", "description": "State-scoped Administrator"},
            {"id": 3, "name": "caregiver", "description": "Caregiver / Healthcare Aide"},
            {"id": 4, "name": "client", "description": "Client / Care Recipient"},
        ]
        roles_map = {}
        for r in roles_data:
            obj, _ = Role.objects.update_or_create(
                id=r["id"],
                defaults={"name": r["name"], "description": r["description"]}
            )
            roles_map[r["name"]] = obj

        self.stdout.write("Seeding document types...")
        doc_types_data = [
            {"name": "CPR Certificate", "for_role": "caregiver", "requires_expiration": True},
            {"name": "Driver's License", "for_role": "both", "requires_expiration": True},
            {"name": "Level 2 Background Check", "for_role": "caregiver", "requires_expiration": True},
            {"name": "TB Screening", "for_role": "caregiver", "requires_expiration": True},
            {"name": "Medicaid Card", "for_role": "client", "requires_expiration": False},
            {"name": "Signed Care Agreement", "for_role": "client", "requires_expiration": False},
        ]
        doc_types_map = {}
        for dt in doc_types_data:
            obj, _ = DocumentType.objects.update_or_create(
                name=dt["name"],
                defaults={"for_role": dt["for_role"], "requires_expiration": dt["requires_expiration"]}
            )
            doc_types_map[dt["name"]] = obj

        self.stdout.write("Seeding state document requirements...")
        for state in states_map.values():
            for dt_name in ["CPR Certificate", "Driver's License", "Level 2 Background Check", "TB Screening"]:
                DocumentRequirement.objects.get_or_create(
                    state=state,
                    document_type=doc_types_map[dt_name],
                    for_role="caregiver",
                    defaults={"required": True}
                )

        self.stdout.write("Seeding training courses...")
        courses_data = [
            {"name": "HIPAA Privacy & Security Standards", "duration_hours": 2.0, "validity_months": 12},
            {"name": "Infection Control & Universal Precautions", "duration_hours": 1.5, "validity_months": 12},
            {"name": "Patient Mobility & Safe Transfer Techniques", "duration_hours": 3.0, "validity_months": 12},
            {"name": "Emergency Preparedness & First Aid", "duration_hours": 2.5, "validity_months": 24},
        ]
        for c in courses_data:
            TrainingCourse.objects.update_or_create(
                name=c["name"],
                defaults={"duration_hours": c["duration_hours"], "validity_months": c["validity_months"], "active": True}
            )

        self.stdout.write("Seeding marketing content & services...")
        for code, state in states_map.items():
            WebsiteContent.objects.get_or_create(
                state=state,
                section_key="hero",
                defaults={
                    "title": f"Premier Home Care in {state.name}",
                    "content": f"Compassionate, high-quality in-home healthcare services for seniors and individuals across {state.name}.",
                }
            )
            Service.objects.get_or_create(
                state=state,
                title="Personal Care Services",
                defaults={
                    "description": "Bathing, dressing, grooming, and mobility assistance by certified aides.",
                    "sort_order": 1,
                    "active": True,
                }
            )
            Service.objects.get_or_create(
                state=state,
                title="Companion Care",
                defaults={
                    "description": "Meal preparation, medication reminders, light housekeeping, and companionship.",
                    "sort_order": 2,
                    "active": True,
                }
            )
            LicensingInfo.objects.get_or_create(
                state=state,
                license_number=f"{code}-HHA-2026-001",
                defaults={
                    "issuing_authority": f"{state.name} Department of Health",
                    "status": "Active",
                }
            )

        self.stdout.write("Seeding default administrative accounts...")
        # Super Admin
        super_admin, created = User.objects.get_or_create(
            email="admin@caregiverplatform.com",
            defaults={
                "role": roles_map["super_admin"],
                "status": "active",
                "is_staff": True,
                "is_superuser": True,
            }
        )
        if created or not super_admin.has_usable_password():
            super_admin.set_password("AdminPassword123!")
            super_admin.save()

        # Florida Administrator
        fl_admin, created = User.objects.get_or_create(
            email="fl.admin@caregiverplatform.com",
            defaults={
                "role": roles_map["administrator"],
                "state": states_map["FL"],
                "status": "active",
                "is_staff": True,
            }
        )
        if created or not fl_admin.has_usable_password():
            fl_admin.set_password("AdminPassword123!")
            fl_admin.save()

        self.stdout.write(self.style.SUCCESS("Initial platform seeding completed successfully!"))

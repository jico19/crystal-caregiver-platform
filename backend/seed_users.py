import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.core.models import State, Role
from apps.authentication.models import User
from apps.caregivers.models import Caregiver
from apps.clients.models import Client
from apps.care.models import CarePlan, CarePlanActivity
from apps.compliance.models import AuditLog

fl = State.objects.get(code='FL')
in_st = State.objects.get(code='IN')
ga = State.objects.get(code='GA')

roles = {r.name: r for r in Role.objects.all()}

# 1. Update all existing users' password to password123
for u in User.objects.all():
    u.set_password('password123')
    u.status = 'active'
    u.is_active = True
    u.save()

# 2. Sample user definitions across all 4 tiers & all 3 states
sample_users = [
    # Super admins
    {'email': 'admin@caregiverplatform.com', 'role': 'super_admin', 'state': None, 'is_staff': True, 'is_superuser': True},
    {'email': 'admin@test.com', 'role': 'super_admin', 'state': None, 'is_staff': True, 'is_superuser': True},
    # State admins
    {'email': 'admin.fl@caregiverplatform.com', 'role': 'administrator', 'state': fl, 'is_staff': True},
    {'email': 'fl.admin@caregiverplatform.com', 'role': 'administrator', 'state': fl, 'is_staff': True},
    {'email': 'admin.in@caregiverplatform.com', 'role': 'administrator', 'state': in_st, 'is_staff': True},
    {'email': 'admin.ga@caregiverplatform.com', 'role': 'administrator', 'state': ga, 'is_staff': True},
    # Caregivers
    {'email': 'caregiver.fl@caregiverplatform.com', 'role': 'caregiver', 'state': fl, 'first_name': 'Sarah', 'last_name': 'Jenkins'},
    {'email': 'caregiver.in@caregiverplatform.com', 'role': 'caregiver', 'state': in_st, 'first_name': 'Michael', 'last_name': 'Chang'},
    {'email': 'caregiver.ga@caregiverplatform.com', 'role': 'caregiver', 'state': ga, 'first_name': 'Elena', 'last_name': 'Rostova'},
    # Clients
    {'email': 'client.fl@caregiverplatform.com', 'role': 'client', 'state': fl, 'first_name': 'Robert', 'last_name': 'Smith'},
    {'email': 'client.in@caregiverplatform.com', 'role': 'client', 'state': in_st, 'first_name': 'Dorothy', 'last_name': 'Miller'},
    {'email': 'client.ga@caregiverplatform.com', 'role': 'client', 'state': ga, 'first_name': 'Arthur', 'last_name': 'Davis'},
]

for item in sample_users:
    role_obj = roles[item['role']]
    user, created = User.objects.get_or_create(
        email=item['email'].lower(),
        defaults={
            'role': role_obj,
            'state': item['state'],
            'status': 'active',
            'is_active': True,
            'is_staff': item.get('is_staff', False),
            'is_superuser': item.get('is_superuser', False),
        }
    )
    user.role = role_obj
    user.state = item['state']
    user.status = 'active'
    user.is_active = True
    if 'is_staff' in item:
        user.is_staff = item['is_staff']
    if 'is_superuser' in item:
        user.is_superuser = item['is_superuser']
    user.set_password('password123')
    user.save()

    if item['role'] == 'caregiver':
        Caregiver.objects.update_or_create(
            id=user,
            defaults={
                'state': item['state'],
                'first_name': item['first_name'],
                'last_name': item['last_name'],
                'phone': '(555) 234-5678',
                'address': '100 Healthcare Blvd',
                'date_of_birth': date(1990, 5, 15),
                'ssn_last4': '4321',
            }
        )
    elif item['role'] == 'client':
        Client.objects.update_or_create(
            id=user,
            defaults={
                'state': item['state'],
                'first_name': item['first_name'],
                'last_name': item['last_name'],
                'date_of_birth': date(1952, 10, 20),
                'phone': '(555) 876-5432',
                'address': '200 Care Lane',
                'medicaid_number': 'MCD987654321',
                'status': 'active',
                'service_start_date': date(2026, 1, 1),
            }
        )
        admin_user = User.objects.filter(role__name='super_admin').first()
        plan, _ = CarePlan.objects.update_or_create(
            client=user,
            defaults={
                'state': item['state'],
                'status': 'active',
                'effective_date': date(2026, 1, 1),
                'primary_nurse': f"Nurse Supervisor RN ({item['state'].code})",
                'emergency_protocol': "Dial 911 for acute medical distress. Contact regional supervisor hotline at (555) 019-9999.",
                'created_by': admin_user or user,
            }
        )
        plan.activities.all().delete()
        sample_activities = [
            ("Morning Medication Assistance", "Daily - 8:00 AM", "Ensure client takes blood pressure medication with water."),
            ("Assistance with Mobility & Ambulation", "Daily - As Needed", "Use walker for bathroom visits; fall prevention protocol."),
            ("Nutritional Meal Preparation", "Twice Daily", "Low-sodium diabetic friendly lunch and dinner preparation."),
            ("Hydration & Vital Signs Check", "Daily - 2:00 PM", "Record blood pressure and fluid intake in logbook."),
        ]
        for idx, (task, freq, notes) in enumerate(sample_activities):
            CarePlanActivity.objects.create(
                care_plan=plan,
                task=task,
                frequency=freq,
                notes=notes,
                sort_order=idx + 1,
            )

# 3. Seed initial compliance audit logs if empty
if not AuditLog.objects.exists():
    admin_user = User.objects.filter(role__name='super_admin').first()
    sample_audit_events = [
        {"action": "ADMIT_CLIENT", "table_name": "clients", "record_id": "client.fl", "state": fl, "new_values": {"status": "active", "service_start_date": "2026-01-01"}},
        {"action": "APPROVE_CAREGIVER", "table_name": "caregivers", "record_id": "caregiver.fl", "state": fl, "new_values": {"status": "active"}},
        {"action": "CREATE_CARE_PLAN", "table_name": "care_plans", "record_id": "plan.fl", "state": fl, "new_values": {"status": "active", "primary_nurse": "Nurse Supervisor RN (FL)"}},
        {"action": "REVIEW_DOCUMENT", "table_name": "documents", "record_id": "doc.in", "state": in_st, "new_values": {"status": "approved"}},
        {"action": "UPDATE_USER_STATUS", "table_name": "users", "record_id": "client.ga", "state": ga, "new_values": {"status": "active", "is_active": True}},
    ]
    for ev in sample_audit_events:
        AuditLog.objects.create(
            user=admin_user,
            action=ev["action"],
            table_name=ev["table_name"],
            record_id=ev["record_id"],
            entity_state=ev["state"],
            new_values=ev["new_values"],
            ip_address="127.0.0.1",
            user_agent="CaregiverPlatform/SeedScript",
        )

print('--- Seeding Completed Successfully ---')
for u in User.objects.all().order_by('role__name', 'email'):
    st = u.state.code if u.state else 'ALL'
    print(f'{u.email:<35} | Role: {u.role.name:<15} | State: {st:<5}')

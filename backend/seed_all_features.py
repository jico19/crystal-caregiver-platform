import os
import django
from datetime import date, datetime, timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.core.models import State, Role
from apps.authentication.models import User
from apps.caregivers.models import Caregiver, CaregiverApplication
from apps.clients.models import Client, ClientReferral, ClientAgreement
from apps.authorizations.models import Authorization
from apps.care.models import CarePlan, CarePlanActivity, CareSchedule, CaregiverClientAssignment
from apps.documents.models import DocumentType, Document
from apps.training.models import TrainingCourse, TrainingEnrollment
from apps.compliance.models import AuditLog, Notification, Announcement

print("=== Starting Comprehensive Realistic Data Seeding ===")

fl = State.objects.get(code='FL')
in_st = State.objects.get(code='IN')
ga = State.objects.get(code='GA')
states = {'FL': fl, 'IN': in_st, 'GA': ga}

roles = {r.name: r for r in Role.objects.all()}

# ---------------------------------------------------------
# 1. Ensure Admins Exist
# ---------------------------------------------------------
print("1. Seeding administrators...")
admin_users_data = [
    # Super admins
    {'email': 'admin@caregiverplatform.com', 'role': 'super_admin', 'state': None, 'is_staff': True, 'is_superuser': True, 'pass': 'AdminPassword123!'},
    {'email': 'admin@test.com', 'role': 'super_admin', 'state': None, 'is_staff': True, 'is_superuser': True, 'pass': 'password123'},
    # State admins
    {'email': 'admin.fl@caregiverplatform.com', 'role': 'administrator', 'state': fl, 'is_staff': True, 'pass': 'password123'},
    {'email': 'fl.admin@caregiverplatform.com', 'role': 'administrator', 'state': fl, 'is_staff': True, 'pass': 'password123'},
    {'email': 'admin.in@caregiverplatform.com', 'role': 'administrator', 'state': in_st, 'is_staff': True, 'pass': 'password123'},
    {'email': 'admin.ga@caregiverplatform.com', 'role': 'administrator', 'state': ga, 'is_staff': True, 'pass': 'password123'},
]

for item in admin_users_data:
    u, _ = User.objects.update_or_create(
        email=item['email'].lower(),
        defaults={
            'role': roles[item['role']],
            'state': item['state'],
            'status': 'active',
            'is_active': True,
            'is_staff': item.get('is_staff', False),
            'is_superuser': item.get('is_superuser', False),
        }
    )
    u.set_password(item['pass'])
    u.save()

super_admin = User.objects.get(email='admin@caregiverplatform.com')
fl_admin = User.objects.get(email='admin.fl@caregiverplatform.com')
in_admin = User.objects.get(email='admin.in@caregiverplatform.com')
ga_admin = User.objects.get(email='admin.ga@caregiverplatform.com')
state_admins = {'FL': fl_admin, 'IN': in_admin, 'GA': ga_admin}

# ---------------------------------------------------------
# 2. Caregivers Across States & Funnel Stages
# ---------------------------------------------------------
print("2. Seeding caregivers & applications...")
caregiver_data = [
    # FL Caregivers
    {
        'email': 'caregiver.fl@caregiverplatform.com', 'state': fl,
        'first_name': 'Sarah', 'last_name': 'Jenkins', 'phone': '(305) 555-0142',
        'address': '1240 Ocean Drive, Miami, FL 33139', 'dob': date(1992, 4, 18), 'ssn': '4321',
        'app_status': 'approved', 'app_notes': 'Clear Level-2 background check; 5 yrs pediatric & geriatric CNA experience.'
    },
    {
        'email': 'marcus.vance.fl@caregiverplatform.com', 'state': fl,
        'first_name': 'Marcus', 'last_name': 'Vance', 'phone': '(813) 555-7821',
        'address': '4502 Westshore Blvd, Tampa, FL 33609', 'dob': date(1988, 11, 23), 'ssn': '8912',
        'app_status': 'approved', 'app_notes': 'Approved for complex memory care and Alzheimer’s support.'
    },
    {
        'email': 'lucia.mendez.fl@caregiverplatform.com', 'state': fl,
        'first_name': 'Lucia', 'last_name': 'Mendez', 'phone': '(407) 555-3290',
        'address': '8910 Sand Lake Rd, Orlando, FL 32819', 'dob': date(1995, 2, 14), 'ssn': '3456',
        'app_status': 'under_review', 'app_notes': 'Application submitted; awaiting TB screening clearance.'
    },
    {
        'email': 'trent.boyd.fl@caregiverplatform.com', 'state': fl,
        'first_name': 'Trent', 'last_name': 'Boyd', 'phone': '(904) 555-8712',
        'address': '312 Riverside Ave, Jacksonville, FL 32202', 'dob': date(1991, 7, 30), 'ssn': '6723',
        'app_status': 'onboarding', 'app_notes': 'Passed interview. Enrolled in mandatory HIPAA and CPR courses.'
    },
    # IN Caregivers
    {
        'email': 'caregiver.in@caregiverplatform.com', 'state': in_st,
        'first_name': 'Michael', 'last_name': 'Chang', 'phone': '(317) 555-9012',
        'address': '720 Meridian St, Indianapolis, IN 46204', 'dob': date(1985, 9, 12), 'ssn': '1234',
        'app_status': 'approved', 'app_notes': 'Certified Home Health Aide with physical transfer certification.'
    },
    {
        'email': 'abigail.clark.in@caregiverplatform.com', 'state': in_st,
        'first_name': 'Abigail', 'last_name': 'Clark', 'phone': '(260) 555-4318',
        'address': '1820 Clinton St, Fort Wayne, IN 46805', 'dob': date(1993, 6, 5), 'ssn': '7789',
        'app_status': 'approved', 'app_notes': 'Experienced with developmental disability waiver clients.'
    },
    {
        'email': 'noah.fischer.in@caregiverplatform.com', 'state': in_st,
        'first_name': 'Noah', 'last_name': 'Fischer', 'phone': '(812) 555-6671',
        'address': '505 Walnut St, Evansville, IN 47708', 'dob': date(1998, 1, 29), 'ssn': '5512',
        'app_status': 'rejected', 'app_notes': 'Background check revealed disqualifying felony; formal rejection notice issued.'
    },
    # GA Caregivers
    {
        'email': 'caregiver.ga@caregiverplatform.com', 'state': ga,
        'first_name': 'Elena', 'last_name': 'Rostova', 'phone': '(404) 555-6543',
        'address': '3400 Peachtree Rd NE, Atlanta, GA 30326', 'dob': date(1989, 3, 27), 'ssn': '5678',
        'app_status': 'approved', 'app_notes': 'Licensed practical nurse background with extensive senior companion experience.'
    },
    {
        'email': 'devon.washington.ga@caregiverplatform.com', 'state': ga,
        'first_name': 'Devon', 'last_name': 'Washington', 'phone': '(912) 555-8910',
        'address': '410 Bull St, Savannah, GA 31401', 'dob': date(1990, 8, 19), 'ssn': '9943',
        'app_status': 'approved', 'app_notes': 'Certified PCA with active CPR and first aid certificates.'
    },
    {
        'email': 'kendra.bell.ga@caregiverplatform.com', 'state': ga,
        'first_name': 'Kendra', 'last_name': 'Bell', 'phone': '(706) 555-2144',
        'address': '901 Broad St, Augusta, GA 30901', 'dob': date(1996, 12, 10), 'ssn': '2211',
        'app_status': 'under_review', 'app_notes': 'Application in progress; verifying references from previous hospice agency.'
    },
]

caregivers_map = {}
for cd in caregiver_data:
    u, _ = User.objects.update_or_create(
        email=cd['email'].lower(),
        defaults={
            'role': roles['caregiver'],
            'state': cd['state'],
            'status': 'active' if cd['app_status'] != 'rejected' else 'suspended',
            'is_active': cd['app_status'] != 'rejected',
        }
    )
    u.set_password('password123')
    u.save()

    cg, _ = Caregiver.objects.update_or_create(
        id=u,
        defaults={
            'state': cd['state'],
            'first_name': cd['first_name'],
            'last_name': cd['last_name'],
            'phone': cd['phone'],
            'address': cd['address'],
            'date_of_birth': cd['dob'],
            'ssn_last4': cd['ssn'],
        }
    )
    caregivers_map[cd['email']] = cg

    # Caregiver Application
    admin_reviewer = state_admins[cd['state'].code]
    CaregiverApplication.objects.update_or_create(
        caregiver=cg,
        defaults={
            'state': cd['state'],
            'status': cd['app_status'],
            'submitted_at': timezone.now() - timedelta(days=20),
            'reviewed_at': timezone.now() - timedelta(days=5) if cd['app_status'] != 'under_review' else None,
            'reviewed_by': admin_reviewer if cd['app_status'] != 'under_review' else None,
            'notes': cd['app_notes'],
            'rejection_reason': 'Failed criminal background check criteria under state administrative code.' if cd['app_status'] == 'rejected' else None,
            'signed_name': f"{cd['first_name']} {cd['last_name']}",
            'signed_at': timezone.now() - timedelta(days=20),
        }
    )

# ---------------------------------------------------------
# 3. Document Requirements & Caregiver Uploads
# ---------------------------------------------------------
print("3. Seeding compliance documents...")
doc_types = {dt.name: dt for dt in DocumentType.objects.all()}

for email, cg in caregivers_map.items():
    if cg.id.email in ['noah.fischer.in@caregiverplatform.com']:
        continue  # Rejected candidate

    # CPR Certificate
    if 'CPR Certificate' in doc_types:
        Document.objects.update_or_create(
            owner=cg.id,
            document_type=doc_types['CPR Certificate'],
            defaults={
                'state': cg.state,
                'storage_path': f'compliance/cpr_{cg.id.pk}.pdf',
                'status': 'approved',
                'expiration_date': date(2027, 6, 30),
                'reviewed_at': timezone.now() - timedelta(days=10),
                'reviewed_by': state_admins[cg.state.code],
            }
        )

    # Driver's License
    if "Driver's License" in doc_types:
        Document.objects.update_or_create(
            owner=cg.id,
            document_type=doc_types["Driver's License"],
            defaults={
                'state': cg.state,
                'storage_path': f'compliance/dl_{cg.id.pk}.pdf',
                'status': 'approved',
                'expiration_date': date(2028, 9, 15),
                'reviewed_at': timezone.now() - timedelta(days=10),
                'reviewed_by': state_admins[cg.state.code],
            }
        )

    # TB Screening
    if 'TB Screening' in doc_types:
        is_pending = cg.id.email in ['lucia.mendez.fl@caregiverplatform.com']
        Document.objects.update_or_create(
            owner=cg.id,
            document_type=doc_types['TB Screening'],
            defaults={
                'state': cg.state,
                'storage_path': f'compliance/tb_{cg.id.pk}.pdf',
                'status': 'submitted' if is_pending else 'approved',
                'expiration_date': date(2027, 1, 15),
                'reviewed_at': None if is_pending else timezone.now() - timedelta(days=10),
                'reviewed_by': None if is_pending else state_admins[cg.state.code],
            }
        )

    # Level 2 Background Check
    if 'Level 2 Background Check' in doc_types:
        Document.objects.update_or_create(
            owner=cg.id,
            document_type=doc_types['Level 2 Background Check'],
            defaults={
                'state': cg.state,
                'storage_path': f'compliance/bg_{cg.id.pk}.pdf',
                'status': 'approved',
                'expiration_date': date(2029, 3, 1),
                'reviewed_at': timezone.now() - timedelta(days=12),
                'reviewed_by': state_admins[cg.state.code],
            }
        )

# ---------------------------------------------------------
# 4. Training Courses & Caregiver Enrollments
# ---------------------------------------------------------
print("4. Seeding training courses & enrollments...")
courses = list(TrainingCourse.objects.filter(active=True))

for email, cg in caregivers_map.items():
    if cg.id.email in ['noah.fischer.in@caregiverplatform.com']:
        continue
    for c_idx, course in enumerate(courses):
        # Stagger completions vs in-progress
        if cg.id.email == 'trent.boyd.fl@caregiverplatform.com' and c_idx >= 2:
            enroll_status = 'enrolled'
            completed_dt = None
        else:
            enroll_status = 'completed'
            completed_dt = timezone.now() - timedelta(days=8)

        TrainingEnrollment.objects.update_or_create(
            course=course,
            caregiver=cg,
            defaults={
                'status': enroll_status,
                'enrolled_at': timezone.now() - timedelta(days=14),
                'due_at': timezone.now() + timedelta(days=16),
                'completed_at': completed_dt,
            }
        )

# ---------------------------------------------------------
# 5. Clients Across States & Admission Lifecycle
# ---------------------------------------------------------
print("5. Seeding clients & admissions...")
clients_data = [
    # FL Clients
    {
        'email': 'client.fl@caregiverplatform.com', 'state': fl,
        'first_name': 'Robert', 'last_name': 'Smith', 'phone': '(305) 555-8731',
        'address': '200 Care Lane, Coral Gables, FL 33134', 'dob': date(1948, 10, 20),
        'medicaid': 'FL-MCD-98765432', 'status': 'active', 'start_date': date(2026, 1, 1),
        'notes': 'Admitted under Statewide Medicaid Managed Care Long-Term Care (SMMC LTC) program.'
    },
    {
        'email': 'beatrice.morales.fl@caregiverplatform.com', 'state': fl,
        'first_name': 'Beatrice', 'last_name': 'Morales', 'phone': '(813) 555-4421',
        'address': '782 Bayshore Blvd, Tampa, FL 33606', 'dob': date(1951, 6, 14),
        'medicaid': 'FL-MCD-44129983', 'status': 'active', 'start_date': date(2026, 2, 1),
        'notes': 'Requires standby assistance with bathing and nutritional support.'
    },
    {
        'email': 'gerald.fontaine.fl@caregiverplatform.com', 'state': fl,
        'first_name': 'Gerald', 'last_name': 'Fontaine', 'phone': '(407) 555-9922',
        'address': '104 Orange Blossom Way, Orlando, FL 32801', 'dob': date(1945, 12, 3),
        'medicaid': 'FL-MCD-11239854', 'status': 'approved', 'start_date': date(2026, 11, 1),
        'notes': 'Pre-admission approved. Service starts on 1st of next month upon authorization issue.'
    },
    {
        'email': 'clara.oswald.fl@caregiverplatform.com', 'state': fl,
        'first_name': 'Clara', 'last_name': 'Oswald', 'phone': '(904) 555-1177',
        'address': '55 San Marco Ave, St. Augustine, FL 32084', 'dob': date(1956, 3, 29),
        'medicaid': 'FL-MCD-77341209', 'status': 'pending', 'start_date': None,
        'notes': 'Intake paperwork submitted; pending clinical review and nursing assessment.'
    },
    # IN Clients
    {
        'email': 'client.in@caregiverplatform.com', 'state': in_st,
        'first_name': 'Dorothy', 'last_name': 'Miller', 'phone': '(317) 555-6611',
        'address': '340 Fall Creek Pkwy, Indianapolis, IN 46205', 'dob': date(1942, 5, 11),
        'medicaid': 'IN-IHCP-33984127', 'status': 'active', 'start_date': date(2026, 1, 15),
        'notes': 'Enrolled in Indiana Pathways for Aging (Aged and Disabled Medicaid Waiver).'
    },
    {
        'email': 'harold.pemberton.in@caregiverplatform.com', 'state': in_st,
        'first_name': 'Harold', 'last_name': 'Pemberton', 'phone': '(260) 555-8094',
        'address': '920 Coldwater Rd, Fort Wayne, IN 46825', 'dob': date(1950, 8, 22),
        'medicaid': 'IN-IHCP-99023418', 'status': 'active', 'start_date': date(2026, 3, 1),
        'notes': 'Parkinson’s symptom management; companion care 20 hours per week.'
    },
    {
        'email': 'evelyn.kane.in@caregiverplatform.com', 'state': in_st,
        'first_name': 'Evelyn', 'last_name': 'Kane', 'phone': '(812) 555-3490',
        'address': '1414 First Ave, Evansville, IN 47710', 'dob': date(1953, 1, 19),
        'medicaid': 'IN-IHCP-44912033', 'status': 'pending', 'start_date': None,
        'notes': 'Intake received via local Area Agency on Aging (AAA). Verification pending.'
    },
    # GA Clients
    {
        'email': 'client.ga@caregiverplatform.com', 'state': ga,
        'first_name': 'Arthur', 'last_name': 'Davis', 'phone': '(404) 555-7319',
        'address': '180 Ponce De Leon Ave, Atlanta, GA 30308', 'dob': date(1946, 7, 8),
        'medicaid': 'GA-GAMIS-55219084', 'status': 'active', 'start_date': date(2026, 2, 15),
        'notes': 'Georgia Community Care Services Program (CCSP) Medicaid waiver recipient.'
    },
    {
        'email': 'gwendolyn.hayes.ga@caregiverplatform.com', 'state': ga,
        'first_name': 'Gwendolyn', 'last_name': 'Hayes', 'phone': '(912) 555-6677',
        'address': '22 Abercorn St, Savannah, GA 31401', 'dob': date(1949, 11, 30),
        'medicaid': 'GA-GAMIS-88349201', 'status': 'active', 'start_date': date(2026, 1, 10),
        'notes': 'SOURCE waiver program. High fall risk; gait stabilization and meal assistance.'
    },
    {
        'email': 'reginald.foster.ga@caregiverplatform.com', 'state': ga,
        'first_name': 'Reginald', 'last_name': 'Foster', 'phone': '(706) 555-4820',
        'address': '1210 Walton Way, Augusta, GA 30904', 'dob': date(1955, 4, 16),
        'medicaid': 'GA-GAMIS-77192348', 'status': 'discharged', 'start_date': date(2025, 6, 1),
        'notes': 'Discharged successfully following full rehabilitation after orthopedic surgery.'
    },
]

clients_map = {}
for cd in clients_data:
    u, _ = User.objects.update_or_create(
        email=cd['email'].lower(),
        defaults={
            'role': roles['client'],
            'state': cd['state'],
            'status': 'active' if cd['status'] != 'discharged' else 'inactive',
            'is_active': cd['status'] != 'discharged',
        }
    )
    u.set_password('password123')
    u.save()

    cl, _ = Client.objects.update_or_create(
        id=u,
        defaults={
            'state': cd['state'],
            'first_name': cd['first_name'],
            'last_name': cd['last_name'],
            'date_of_birth': cd['dob'],
            'phone': cd['phone'],
            'address': cd['address'],
            'medicaid_number': cd['medicaid'],
            'status': cd['status'],
            'service_start_date': cd['start_date'],
            'admission_notes': cd['notes'],
            'admitted_by': state_admins[cd['state'].code] if cd['status'] in ('active', 'approved', 'discharged') else None,
            'admitted_at': timezone.now() - timedelta(days=60) if cd['status'] in ('active', 'approved', 'discharged') else None,
            'signed_name': f"{cd['first_name']} {cd['last_name']}",
            'signed_at': timezone.now() - timedelta(days=65),
        }
    )
    clients_map[cd['email']] = cl

    # Client Care Agreement
    ClientAgreement.objects.update_or_create(
        client=cl.id,
        agreement_key='general_care_terms_v1',
        defaults={
            'state': cd['state'],
            'title': f"{cd['state'].code} Home Health Services Agreement & Patient Bill of Rights",
            'version': 1,
            'body': f"Comprehensive care terms for {cd['first_name']} {cd['last_name']} under {cd['state'].name} Department of Health guidelines.",
            'signed_name': f"{cd['first_name']} {cd['last_name']}",
            'signed_at': timezone.now() - timedelta(days=65),
            'content_hash': 'a9b8c7d6e5f4a9b8c7d6e5f4',
        }
    )

# ---------------------------------------------------------
# 6. CRM Inbound Referrals & Leads Pipeline
# ---------------------------------------------------------
print("6. Seeding CRM referrals pipeline...")
referrals_data = [
    # FL Leads
    {
        'state': fl, 'first_name': 'Esther', 'last_name': 'Greenberg', 'phone': '(305) 555-7788',
        'email': 'egreenberg.lead@gmail.com', 'referral_source': 'hospital_discharge',
        'status': 'new', 'notes': 'Mount Sinai Medical Center discharge planner referral. Needs PCA 30 hrs/wk.',
        'assigned_to': fl_admin, 'handled_notes': ''
    },
    {
        'state': fl, 'first_name': 'Mateo', 'last_name': 'Alvarez', 'phone': '(813) 555-1209',
        'email': 'mateo.alvarez@outlook.com', 'referral_source': 'family',
        'status': 'contacted', 'notes': 'Daughter reached out regarding memory care support for father in Tampa.',
        'assigned_to': fl_admin, 'handled_notes': 'Spoke with daughter Sofia; intake paperwork emailed; follow-up call on Thursday.'
    },
    {
        'state': fl, 'first_name': 'Robert', 'last_name': 'Smith', 'phone': '(305) 555-8731',
        'email': 'client.fl@caregiverplatform.com', 'referral_source': 'physician',
        'status': 'converted', 'notes': 'Referred by Dr. Kenneth Cole, Geriatrics.',
        'assigned_to': fl_admin, 'handled_notes': 'Successfully admitted and enrolled in SMMC LTC program.',
        'converted_client': clients_map['client.fl@caregiverplatform.com']
    },
    # IN Leads
    {
        'state': in_st, 'first_name': 'Walter', 'last_name': 'Kowalski', 'phone': '(317) 555-6622',
        'email': 'walter.k.lead@gmail.com', 'referral_source': 'insurance',
        'status': 'new', 'notes': 'Anthem Indiana Medicaid case manager inquiry. Assessing waiver tier.',
        'assigned_to': in_admin, 'handled_notes': ''
    },
    {
        'state': in_st, 'first_name': 'Grace', 'last_name': 'Hopper', 'phone': '(260) 555-3341',
        'email': 'grace.hopper@in-care.org', 'referral_source': 'community_event',
        'status': 'contacted', 'notes': 'Met at Fort Wayne Senior Health Expo. Interested in respite care.',
        'assigned_to': in_admin, 'handled_notes': 'Left voicemail; sent program overview brochure.'
    },
    {
        'state': in_st, 'first_name': 'Dorothy', 'last_name': 'Miller', 'phone': '(317) 555-6611',
        'email': 'client.in@caregiverplatform.com', 'referral_source': 'family',
        'status': 'converted', 'notes': 'Referred by son Mark Miller.',
        'assigned_to': in_admin, 'handled_notes': 'Conducted in-home assessment; care plan active.',
        'converted_client': clients_map['client.in@caregiverplatform.com']
    },
    # GA Leads
    {
        'state': ga, 'first_name': 'Curtis', 'last_name': 'Mayfield', 'phone': '(404) 555-9081',
        'email': 'curtis.mayfield@gmail.com', 'referral_source': 'website',
        'status': 'new', 'notes': 'Web intake lead submitted from Georgia landing page. Inquiring about CCSP eligibility.',
        'assigned_to': ga_admin, 'handled_notes': ''
    },
    {
        'state': ga, 'first_name': 'Lucille', 'last_name': 'Bluth', 'phone': '(912) 555-1144',
        'email': 'lucille.b@coastalga.net', 'referral_source': 'physician',
        'status': 'contacted', 'notes': 'Memorial Health Savannah discharge coordinator.',
        'assigned_to': ga_admin, 'handled_notes': 'First phone assessment completed. Awaiting physician order for physical therapy.'
    },
    {
        'state': ga, 'first_name': 'Arthur', 'last_name': 'Davis', 'phone': '(404) 555-7319',
        'email': 'client.ga@caregiverplatform.com', 'referral_source': 'insurance',
        'status': 'converted', 'notes': 'Amerigroup GA Medicaid direct case management referral.',
        'assigned_to': ga_admin, 'handled_notes': 'Approved and assigned to Caregiver Elena Rostova.',
        'converted_client': clients_map['client.ga@caregiverplatform.com']
    },
]

for ref in referrals_data:
    ClientReferral.objects.update_or_create(
        email=ref['email'],
        state=ref['state'],
        defaults={
            'first_name': ref['first_name'],
            'last_name': ref['last_name'],
            'phone': ref['phone'],
            'referral_source': ref['referral_source'],
            'status': ref['status'],
            'notes': ref['notes'],
            'assigned_to': ref['assigned_to'],
            'handled_notes': ref['handled_notes'],
            'converted_client': ref.get('converted_client'),
        }
    )

# ---------------------------------------------------------
# 7. Care Plans & Activities for Active Clients
# ---------------------------------------------------------
print("7. Seeding care plans & nursing activities...")
active_client_pairs = [
    # (Client Email, Caregiver Email, Primary Nurse, Weekly Hours)
    ('client.fl@caregiverplatform.com', 'caregiver.fl@caregiverplatform.com', 'Maria Gonzalez, RN (FL #RN938210)', 25),
    ('beatrice.morales.fl@caregiverplatform.com', 'marcus.vance.fl@caregiverplatform.com', 'Maria Gonzalez, RN (FL #RN938210)', 20),
    ('client.in@caregiverplatform.com', 'caregiver.in@caregiverplatform.com', 'Brenda Taylor, RN (IN #RN554129)', 30),
    ('harold.pemberton.in@caregiverplatform.com', 'abigail.clark.in@caregiverplatform.com', 'Brenda Taylor, RN (IN #RN554129)', 20),
    ('client.ga@caregiverplatform.com', 'caregiver.ga@caregiverplatform.com', 'Tamika Reynolds, RN (GA #RN772910)', 28),
    ('gwendolyn.hayes.ga@caregiverplatform.com', 'devon.washington.ga@caregiverplatform.com', 'Tamika Reynolds, RN (GA #RN772910)', 24),
]

for cl_email, cg_email, nurse, hours in active_client_pairs:
    client_obj = clients_map[cl_email]
    cg_obj = caregivers_map[cg_email]
    admin_obj = state_admins[client_obj.state.code]

    # Care Plan
    plan, _ = CarePlan.objects.update_or_create(
        client=client_obj.id,
        defaults={
            'state': client_obj.state,
            'caregiver': cg_obj,
            'status': 'active',
            'effective_date': client_obj.service_start_date or date(2026, 1, 1),
            'primary_nurse': nurse,
            'emergency_protocol': f"Call 911 immediately in severe medical crisis. Notify {client_obj.state.code} Clinical Supervisor at (555) 900-CARE.",
            'created_by': admin_obj,
        }
    )

    plan.activities.all().delete()
    activities = [
        ("Daily Medication Reminders & Administration Support", "Daily - 8:00 AM & 6:00 PM", "Observe client taking prescribed cardiac & diabetes medications with food."),
        ("Assistance with Mobility, Transfers & Gait Safety", "Daily - As Needed", "Use walker and gait belt during all room transitions. High fall prevention protocols."),
        ("Nutritional Meal Planning & Low-Sodium Preparation", "Twice Daily", "Prepare balanced meals compliant with diabetic dietary guidelines."),
        ("Personal Hygiene, Bathing & Dressing Support", "Mon / Wed / Fri", "Standby assistance in walk-in shower; ensure dry floor and grab bar usage."),
        ("Vital Signs Monitoring & Fluid Tracking", "Daily - 2:00 PM", "Record blood pressure, pulse, and daily fluid intake in client chart."),
    ]
    for idx, (task, freq, notes) in enumerate(activities):
        CarePlanActivity.objects.create(
            care_plan=plan,
            task=task,
            frequency=freq,
            notes=notes,
            sort_order=idx + 1,
        )

    # Assignment Record
    CaregiverClientAssignment.objects.update_or_create(
        caregiver=cg_obj,
        client=client_obj,
        defaults={
            'role': 'primary_caregiver',
            'assigned_by': admin_obj,
            'assigned_at': timezone.now() - timedelta(days=50),
            'ended_at': None,
        }
    )

# ---------------------------------------------------------
# 8. Service Authorizations (Medicaid HCPCS Codes)
# ---------------------------------------------------------
print("8. Seeding Medicaid authorizations...")
authorizations_data = [
    # FL Authorizations
    {
        'client': clients_map['client.fl@caregiverplatform.com'],
        'cg': caregivers_map['caregiver.fl@caregiverplatform.com'],
        'state': fl,
        'auth_num': 'AUTH-FL-2026-9941', 'hcpcs': 'T1019',
        'desc': 'Personal Care Services, per 15 minutes',
        'total_units': 1200, 'used_units': 480, 'max_weekly_hours': 25.0,
        'start': date(2026, 1, 1), 'end': date(2026, 12, 31),
        'status': 'active', 'source': 'provider_request',
    },
    {
        'client': clients_map['beatrice.morales.fl@caregiverplatform.com'],
        'cg': caregivers_map['marcus.vance.fl@caregiverplatform.com'],
        'state': fl,
        'auth_num': 'AUTH-FL-2026-3829', 'hcpcs': 'S5125',
        'desc': 'Attendant Care Services, per 15 minutes',
        'total_units': 960, 'used_units': 240, 'max_weekly_hours': 20.0,
        'start': date(2026, 2, 1), 'end': date(2026, 12, 31),
        'status': 'active', 'source': 'state_portal',
    },
    {
        'client': clients_map['gerald.fontaine.fl@caregiverplatform.com'],
        'cg': None,
        'state': fl,
        'auth_num': 'AUTH-FL-2026-1024', 'hcpcs': 'T1019',
        'desc': 'Personal Care Services, per 15 minutes',
        'total_units': 800, 'used_units': 0, 'max_weekly_hours': 20.0,
        'start': date(2026, 11, 1), 'end': date(2027, 4, 30),
        'status': 'pending', 'source': 'provider_request',
    },
    # IN Authorizations
    {
        'client': clients_map['client.in@caregiverplatform.com'],
        'cg': caregivers_map['caregiver.in@caregiverplatform.com'],
        'state': in_st,
        'auth_num': 'AUTH-IN-2026-8812', 'hcpcs': 'T1019',
        'desc': 'Personal Care Services, per 15 minutes (Pathways for Aging)',
        'total_units': 1440, 'used_units': 520, 'max_weekly_hours': 30.0,
        'start': date(2026, 1, 15), 'end': date(2026, 12, 31),
        'status': 'active', 'source': 'state_portal',
    },
    {
        'client': clients_map['harold.pemberton.in@caregiverplatform.com'],
        'cg': caregivers_map['abigail.clark.in@caregiverplatform.com'],
        'state': in_st,
        'auth_num': 'AUTH-IN-2026-4491', 'hcpcs': 'S5130',
        'desc': 'Homemaker Service, per 15 minutes',
        'total_units': 800, 'used_units': 180, 'max_weekly_hours': 20.0,
        'start': date(2026, 3, 1), 'end': date(2026, 12, 31),
        'status': 'active', 'source': 'provider_request',
    },
    # GA Authorizations
    {
        'client': clients_map['client.ga@caregiverplatform.com'],
        'cg': caregivers_map['caregiver.ga@caregiverplatform.com'],
        'state': ga,
        'auth_num': 'AUTH-GA-2026-5590', 'hcpcs': 'T1019',
        'desc': 'Personal Support Services (PSS) - CCSP Waiver',
        'total_units': 1344, 'used_units': 420, 'max_weekly_hours': 28.0,
        'start': date(2026, 2, 15), 'end': date(2026, 12, 31),
        'status': 'active', 'source': 'state_portal',
    },
    {
        'client': clients_map['gwendolyn.hayes.ga@caregiverplatform.com'],
        'cg': caregivers_map['devon.washington.ga@caregiverplatform.com'],
        'state': ga,
        'auth_num': 'AUTH-GA-2026-1288', 'hcpcs': 'T1019',
        'desc': 'Personal Support Services (PSS) - SOURCE Waiver',
        'total_units': 1152, 'used_units': 360, 'max_weekly_hours': 24.0,
        'start': date(2026, 1, 10), 'end': date(2026, 12, 31),
        'status': 'active', 'source': 'state_portal',
    },
]

for auth in authorizations_data:
    Authorization.objects.update_or_create(
        authorization_number=auth['auth_num'],
        defaults={
            'client': auth['client'],
            'caregiver': auth['cg'],
            'state': auth['state'],
            'hcpcs_code': auth['hcpcs'],
            'service_description': auth['desc'],
            'unit_type': '15_min',
            'total_units_authorized': auth['total_units'],
            'units_used': auth['used_units'],
            'max_weekly_hours': auth['max_weekly_hours'],
            'start_date': auth['start'],
            'end_date': auth['end'],
            'status': auth['status'],
            'source': auth['source'],
            'reviewed_by': state_admins[auth['state'].code],
            'reviewed_at': timezone.now() - timedelta(days=40),
        }
    )

# ---------------------------------------------------------
# 9. Recurring Weekly Care Schedules
# ---------------------------------------------------------
print("9. Seeding weekly care schedules...")
days_map = {1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday'}

for cl_email, cg_email, _, hours in active_client_pairs[:4]:
    client_obj = clients_map[cl_email]
    cg_obj = caregivers_map[cg_email]
    
    # Schedule Monday, Wednesday, Friday
    for dow in [1, 3, 5]:
        CareSchedule.objects.update_or_create(
            client=client_obj.id,
            caregiver=cg_obj,
            day_of_week=dow,
            defaults={
                'state': client_obj.state,
                'start_time': '08:30:00',
                'end_time': '13:30:00',
                'service': 'Personal Care & Mobility Assistance',
                'notes': f"Assigned visit for {client_obj.first_name}. Check-in via electronic visit verification.",
                'status': 'scheduled',
            }
        )

# ---------------------------------------------------------
# 10. Announcements & System Notifications
# ---------------------------------------------------------
print("10. Seeding announcements & notifications...")
announcements_data = [
    {
        'state': fl,
        'title': 'Florida SMMC Policy Update: EVV Timestamping Guidelines',
        'body': 'AHCA requires all home health aides to log check-in/out timestamps strictly within GPS-fenced client premises beginning next month.',
        'audience': 'all',
        'created_by': fl_admin,
    },
    {
        'state': in_st,
        'title': 'Indiana Pathways for Aging Transition Complete',
        'body': 'All active client authorizations have transitioned under the Indiana Family and Social Services Administration (FSSA) Pathways network.',
        'audience': 'caregivers',
        'created_by': in_admin,
    },
    {
        'state': ga,
        'title': 'Georgia Medicaid Provider Re-enrollment Notice',
        'body': 'Annual re-enrollment audits for CCSP and SOURCE service providers are currently underway. Verify all CPR and TB screenings are up to date.',
        'audience': 'all',
        'created_by': ga_admin,
    },
    {
        'state': None,
        'title': 'System-wide HIPAA Security Protocol Reminder',
        'body': 'All staff and caregivers must ensure patient identifiers and Medicaid numbers remain strictly within protected platform workflows.',
        'audience': 'all',
        'created_by': super_admin,
    },
]

for ann in announcements_data:
    Announcement.objects.update_or_create(
        title=ann['title'],
        defaults={
            'state': ann['state'],
            'body': ann['body'],
            'audience': ann['audience'],
            'active': True,
            'created_by': ann['created_by'],
        }
    )

# Notifications for Admins & Caregivers
notifications_data = [
    {
        'user': fl_admin,
        'type': 'referral',
        'title': 'New Lead Received',
        'body': 'Mount Sinai Hospital submitted referral for Esther Greenberg (FL).',
        'read': False,
    },
    {
        'user': in_admin,
        'type': 'admission',
        'title': 'Pending Client Intake',
        'body': 'Evelyn Kane (Evansville, IN) intake completed. Ready for clinical review.',
        'read': False,
    },
    {
        'user': ga_admin,
        'type': 'compliance',
        'title': 'Document Awaiting Review',
        'body': 'Caregiver Kendra Bell uploaded new Level 2 Background Check.',
        'read': True,
    },
    {
        'user': caregivers_map['caregiver.fl@caregiverplatform.com'].id,
        'type': 'schedule',
        'title': 'Shift Confirmed',
        'body': 'Upcoming visit with Robert Smith scheduled for Monday 8:30 AM.',
        'read': False,
    },
]

for n in notifications_data:
    Notification.objects.create(
        user=n['user'],
        type=n['type'],
        title=n['title'],
        body=n['body'],
        read=n['read'],
    )

# ---------------------------------------------------------
# 11. Comprehensive Audit Logs
# ---------------------------------------------------------
print("11. Seeding audit logs...")
audit_events = [
    {"user": fl_admin, "action": "ADMIT_CLIENT", "table_name": "clients", "record_id": str(clients_map['client.fl@caregiverplatform.com'].pk), "state": fl, "new": {"status": "active", "service_start_date": "2026-01-01"}},
    {"user": fl_admin, "action": "APPROVE_CAREGIVER", "table_name": "caregivers", "record_id": str(caregivers_map['caregiver.fl@caregiverplatform.com'].pk), "state": fl, "new": {"status": "approved"}},
    {"user": in_admin, "action": "ADMIT_CLIENT", "table_name": "clients", "record_id": str(clients_map['client.in@caregiverplatform.com'].pk), "state": in_st, "new": {"status": "active", "service_start_date": "2026-01-15"}},
    {"user": in_admin, "action": "ISSUE_AUTHORIZATION", "table_name": "authorizations", "record_id": "AUTH-IN-2026-8812", "state": in_st, "new": {"hcpcs_code": "T1019", "total_units": 1440}},
    {"user": ga_admin, "action": "ADMIT_CLIENT", "table_name": "clients", "record_id": str(clients_map['client.ga@caregiverplatform.com'].pk), "state": ga, "new": {"status": "active", "service_start_date": "2026-02-15"}},
    {"user": ga_admin, "action": "ASSIGN_CAREGIVER", "table_name": "caregiver_client_assignments", "record_id": str(clients_map['client.ga@caregiverplatform.com'].pk), "state": ga, "new": {"caregiver": "Elena Rostova", "role": "primary_caregiver"}},
    {"user": super_admin, "action": "CREATE_ANNOUNCEMENT", "table_name": "announcements", "record_id": "hipaa-security-reminder", "state": None, "new": {"title": "System-wide HIPAA Security Protocol Reminder"}},
]

for ev in audit_events:
    AuditLog.objects.create(
        user=ev["user"],
        action=ev["action"],
        table_name=ev["table_name"],
        record_id=ev["record_id"],
        entity_state=ev["state"],
        new_values=ev["new"],
        ip_address="127.0.0.1",
        user_agent="CaregiverPlatform/ComprehensiveSeed",
    )

print("\n=== Seeding Finished Successfully ===")
print(f"Total Users: {User.objects.count()}")
print(f"Total Caregivers: {Caregiver.objects.count()}")
print(f"Total Clients: {Client.objects.count()}")
print(f"Total Referrals: {ClientReferral.objects.count()}")
print(f"Total Authorizations: {Authorization.objects.count()}")
print(f"Total Care Plans: {CarePlan.objects.count()}")
print(f"Total Schedules: {CareSchedule.objects.count()}")
print(f"Total Documents: {Document.objects.count()}")
print(f"Total Enrollments: {TrainingEnrollment.objects.count()}")
print(f"Total Announcements: {Announcement.objects.count()}")
print(f"Total Audit Logs: {AuditLog.objects.count()}")

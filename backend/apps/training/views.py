from datetime import date, timedelta
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.core.permissions import IsCaregiver
from apps.caregivers.models import Caregiver
from .models import TrainingCourse, TrainingEnrollment
from .serializers import TrainingCourseSerializer, TrainingEnrollmentSerializer
from .services import generate_certificate_pdf

class TrainingCoursesListView(APIView):
    """GET /api/v1/training/courses - Lists active continuing education courses."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        courses = TrainingCourse.objects.filter(active=True)
        return Response(TrainingCourseSerializer(courses, many=True).data)

class MyEnrollmentsView(APIView):
    """GET /api/v1/training/my-enrollments - Caregiver's course enrollments & progress."""
    permission_classes = [IsCaregiver]

    def get(self, request):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        enrollments = TrainingEnrollment.objects.filter(caregiver=caregiver).select_related("course")
        return Response(TrainingEnrollmentSerializer(enrollments, many=True).data)

class CourseEnrollView(APIView):
    """POST /api/v1/training/courses/{id}/enroll"""
    permission_classes = [IsCaregiver]

    def post(self, request, id):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        course = get_object_or_404(TrainingCourse, id=id, active=True)
        
        enrollment, created = TrainingEnrollment.objects.get_or_create(
            caregiver=caregiver,
            course=course,
            defaults={
                "status": "in_progress",
                "due_at": date.today() + timedelta(days=course.validity_months * 30),
            }
        )
        return Response(
            TrainingEnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

from apps.compliance.audit import record_audit_log

class CourseCompleteView(APIView):
    """POST /api/v1/training/courses/{id}/complete"""
    permission_classes = [IsCaregiver]

    def post(self, request, id):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        course = get_object_or_404(TrainingCourse, id=id)
        enrollment = get_object_or_404(
            TrainingEnrollment,
            caregiver=caregiver,
            course=course,
        )
        if enrollment.status == "completed":
            return Response(TrainingEnrollmentSerializer(enrollment).data, status=status.HTTP_200_OK)

        enrollment.status = "completed"
        enrollment.completed_at = timezone.now()
        enrollment.save()

        record_audit_log(
            action="COMPLETE_TRAINING_COURSE",
            table_name="training_enrollments",
            record_id=enrollment.id,
            request=request,
            entity_state=caregiver.state,
            new_values={
                "course_name": course.name,
                "completed_at": str(enrollment.completed_at),
            },
        )
        return Response(TrainingEnrollmentSerializer(enrollment).data, status=status.HTTP_200_OK)


class CourseCertificateView(APIView):
    """GET /api/v1/training/courses/{id}/certificate - Returns dynamic binary PDF."""
    permission_classes = [IsCaregiver]

    def get(self, request, id):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        enrollment = get_object_or_404(
            TrainingEnrollment,
            caregiver=caregiver,
            course_id=id,
            status="completed",
        )
        pdf_bytes = generate_certificate_pdf(enrollment)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="certificate_{enrollment.id}.pdf"'
        return response

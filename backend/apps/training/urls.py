from django.urls import path
from .views import (
    TrainingCoursesListView,
    MyEnrollmentsView,
    CourseEnrollView,
    CourseCompleteView,
    CourseCertificateView,
)

urlpatterns = [
    path("courses", TrainingCoursesListView.as_view(), name="training_courses"),
    path("my-enrollments", MyEnrollmentsView.as_view(), name="training_my_enrollments"),
    path("courses/<int:id>/enroll", CourseEnrollView.as_view(), name="training_course_enroll"),
    path("courses/<int:id>/complete", CourseCompleteView.as_view(), name="training_course_complete"),
    path("courses/<int:id>/certificate", CourseCertificateView.as_view(), name="training_course_certificate"),
]

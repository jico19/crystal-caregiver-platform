import io
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from .models import TrainingEnrollment

def generate_certificate_pdf(enrollment: TrainingEnrollment) -> bytes:
    """Generates a dynamic PDF certificate of completion using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        alignment=1, # Center
        textColor=colors.HexColor("#1e3a8a"),
    )
    subtitle_style = ParagraphStyle(
        "CertSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=14,
        leading=18,
        alignment=1,
        textColor=colors.HexColor("#475569"),
    )
    recipient_style = ParagraphStyle(
        "CertRecipient",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=30,
        alignment=1,
        textColor=colors.HexColor("#0f172a"),
    )
    body_style = ParagraphStyle(
        "CertBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        alignment=1,
        textColor=colors.HexColor("#334155"),
    )

    story = []
    story.append(Spacer(1, 40))
    story.append(Paragraph("CERTIFICATE OF COMPLETION", title_style))
    story.append(Spacer(1, 15))
    story.append(Paragraph("This is proudly presented to", subtitle_style))
    story.append(Spacer(1, 20))
    
    caregiver_name = f"{enrollment.caregiver.first_name} {enrollment.caregiver.last_name}"
    story.append(Paragraph(caregiver_name, recipient_style))
    story.append(Spacer(1, 20))
    
    completion_text = (
        f"for successfully completing continuing education course "
        f"<b>{enrollment.course.name}</b> ({enrollment.course.duration_hours} Credit Hours) "
        f"in compliance with state home healthcare regulatory standards."
    )
    story.append(Paragraph(completion_text, body_style))
    story.append(Spacer(1, 30))

    date_str = enrollment.completed_at.strftime("%B %d, %Y") if enrollment.completed_at else "Verified"
    cert_id_str = f"Certificate ID: CERT-{enrollment.id}"
    story.append(Paragraph(f"Completed on: {date_str} &nbsp;&nbsp;|&nbsp;&nbsp; {cert_id_str}", subtitle_style))

    doc.build(story)
    pdf_value = buffer.getvalue()
    buffer.close()
    return pdf_value

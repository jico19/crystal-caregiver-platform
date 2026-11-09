"""Published schema definitions and version-bound answer validation."""

from rest_framework.exceptions import ValidationError

EXPERIENCE = {"none": "No prior experience", "under_one_year": "Under one year", "one_to_three_years": "One to three years", "over_three_years": "Over three years"}
AVAILABILITY = {"weekdays": "Weekdays", "weekends": "Weekends", "daytime": "Daytime", "evenings": "Evenings"}
EXTENDED_SCHEMA = {"fields": ["name", "email", "demo_acknowledged", "experience", "availability"], "choices": {"experience": EXPERIENCE, "availability": AVAILABILITY}}


def application_answers(version, data):
    fields = version.field_schema.get("fields", [])
    extended = "experience" in fields
    if extended:
        choices = version.field_schema.get("choices", {})
        if data.get("experience") not in choices.get("experience", {}):
            raise ValidationError({"experience": "Select a published experience option."})
        values = data.get("availability", [])
        if not values or len(values) != len(set(values)) or any(v not in choices.get("availability", {}) for v in values):
            raise ValidationError({"availability": "Select unique published availability options."})
    elif "experience" in data or "availability" in data:
        raise ValidationError("This legacy form does not accept extended answers.")
    answers = {"name": data["name"].strip(), "demo_acknowledged": True}
    if extended:
        answers.update(email=data["email"], experience=data["experience"], availability=data["availability"])
    return answers

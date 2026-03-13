"""
ATLAS HL7 v2 ADT Message Parser

Parses HL7 v2.5 ADT messages (A01 admit, A03 discharge) into
structured patient data for downstream FHIR conversion.

HIPAA: Only initials are stored — never full patient names.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ParsedPatient:
    mrn: str
    display_name: str
    age: int
    sex: str
    bed: str
    admit_time: datetime
    discharge_time: Optional[datetime]
    attending: str
    event_type: str


EVENT_TYPE_MAP = {
    "A01": "admit",
    "A02": "transfer",
    "A03": "discharge",
    "A04": "register",
    "A08": "update",
}


def _to_initials(family: str, given: str) -> str:
    """Convert name parts to HIPAA-safe initials like 'J.D.'"""
    first_initial = given[0].upper() if given else "?"
    last_initial = family[0].upper() if family else "?"
    return f"{first_initial}.{last_initial}."


def _parse_datetime(hl7_dt: str) -> Optional[datetime]:
    """Parse HL7 datetime format YYYYMMDDHHMMSS."""
    if not hl7_dt or len(hl7_dt) < 8:
        return None
    fmt = "%Y%m%d%H%M%S" if len(hl7_dt) >= 14 else "%Y%m%d"
    return datetime.strptime(hl7_dt[:len(fmt.replace("%", "").replace("Y", "0").replace("m", "0").replace("d", "0").replace("H", "0").replace("M", "0").replace("S", "0"))], fmt)


def _parse_datetime_safe(raw: str) -> Optional[datetime]:
    """Parse HL7 datetime, handling variable lengths."""
    raw = raw.strip()
    if not raw:
        return None
    if len(raw) >= 14:
        return datetime.strptime(raw[:14], "%Y%m%d%H%M%S")
    if len(raw) >= 8:
        return datetime.strptime(raw[:8], "%Y%m%d")
    return None


def _compute_age(dob: datetime, reference: Optional[datetime] = None) -> int:
    """Compute age in years from date of birth."""
    ref = reference or datetime.now()
    age = ref.year - dob.year
    if (ref.month, ref.day) < (dob.month, dob.day):
        age -= 1
    return age


def _get_field(segment_text: str, index: int) -> str:
    """Get field at 1-based index from a pipe-delimited HL7 segment."""
    parts = segment_text.split("|")
    if index < len(parts):
        return parts[index]
    return ""


def _get_component(field: str, index: int) -> str:
    """Get component at 0-based index from a caret-delimited field."""
    parts = field.split("^")
    if index < len(parts):
        return parts[index]
    return ""


def parse_hl7_message(raw: str) -> ParsedPatient:
    """
    Parse HL7 v2 ADT message into a ParsedPatient.

    Supports:
      - ADT^A01 (admit)
      - ADT^A03 (discharge)

    Segments used:
      - MSH-9: message type → event_type
      - PID-3: MRN
      - PID-5: patient name → initials only (HIPAA)
      - PID-7: DOB → age
      - PID-8: sex
      - PV1-3: bed location
      - PV1-7: attending physician → initials only
      - PV1-44: admit datetime
      - PV1-45: discharge datetime (A03 only)
    """
    segments: dict[str, str] = {}
    for line in raw.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        seg_type = line[:3]
        segments[seg_type] = line

    msh = segments.get("MSH", "")
    pid = segments.get("PID", "")
    pv1 = segments.get("PV1", "")

    # MSH field numbering: MSH-1 is the field separator "|" itself,
    # so MSH|^~\&|...|ADT^A01| has MSH-9 at split index 8
    msg_type_field = _get_field(msh, 8)
    trigger = _get_component(msg_type_field, 1)
    event_type = EVENT_TYPE_MAP.get(trigger, "unknown")

    pid3 = _get_field(pid, 3)
    mrn = _get_component(pid3, 0)

    pid5 = _get_field(pid, 5)
    family = _get_component(pid5, 0)
    given = _get_component(pid5, 1)
    display_name = _to_initials(family, given)

    pid7 = _get_field(pid, 7)
    dob = _parse_datetime_safe(pid7)

    pid8 = _get_field(pid, 8).strip()
    sex = pid8 if pid8 in ("M", "F") else "U"

    pv1_3 = _get_field(pv1, 3)
    bed_raw = _get_component(pv1_3, 1)
    bed = bed_raw.lstrip("0") if bed_raw else "WR"

    pv1_7 = _get_field(pv1, 7)
    att_family = _get_component(pv1_7, 1)
    att_given = _get_component(pv1_7, 2)
    attending = _to_initials(att_family, att_given) if att_family else "Unknown"

    pv1_44 = _get_field(pv1, 44)
    admit_time = _parse_datetime_safe(pv1_44) or datetime.now()

    pv1_45 = _get_field(pv1, 45) if len(pv1.split("|")) > 45 else ""
    discharge_time = _parse_datetime_safe(pv1_45)

    age = _compute_age(dob, admit_time) if dob else 0

    return ParsedPatient(
        mrn=mrn,
        display_name=display_name,
        age=age,
        sex=sex,
        bed=bed,
        admit_time=admit_time,
        discharge_time=discharge_time,
        attending=attending,
        event_type=event_type,
    )

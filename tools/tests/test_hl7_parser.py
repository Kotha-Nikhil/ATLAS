"""Tests for HL7 v2 ADT message parser."""

import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from hl7_parser import parse_hl7_message, ParsedPatient


SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_hl7"


class TestAdtA01Admit:
    """Test parsing of ADT^A01 (admit) message."""

    def setup_method(self) -> None:
        raw = (SAMPLE_DIR / "adt_a01_admit.hl7").read_text()
        self.patient = parse_hl7_message(raw)

    def test_mrn(self) -> None:
        assert self.patient.mrn == "PT123456"

    def test_display_name_is_initials(self) -> None:
        assert self.patient.display_name == "J.D."

    def test_display_name_never_contains_full_name(self) -> None:
        assert "DOE" not in self.patient.display_name
        assert "JOHN" not in self.patient.display_name

    def test_age_computed_from_dob(self) -> None:
        # DOB: 19640315, admit: 20260310 → age should be 61
        assert self.patient.age == 61

    def test_sex(self) -> None:
        assert self.patient.sex == "M"

    def test_bed(self) -> None:
        assert self.patient.bed == "4"

    def test_event_type_admit(self) -> None:
        assert self.patient.event_type == "admit"

    def test_attending_is_initials(self) -> None:
        assert "CHEN" not in self.patient.attending
        assert "SARAH" not in self.patient.attending
        assert "." in self.patient.attending

    def test_admit_time_parsed(self) -> None:
        assert isinstance(self.patient.admit_time, datetime)
        assert self.patient.admit_time.year == 2026

    def test_discharge_time_none_for_admit(self) -> None:
        assert self.patient.discharge_time is None


class TestAdtA03Discharge:
    """Test parsing of ADT^A03 (discharge) message."""

    def setup_method(self) -> None:
        raw = (SAMPLE_DIR / "adt_a03_discharge.hl7").read_text()
        self.patient = parse_hl7_message(raw)

    def test_event_type_discharge(self) -> None:
        assert self.patient.event_type == "discharge"

    def test_mrn_same_patient(self) -> None:
        assert self.patient.mrn == "PT123456"

    def test_discharge_time_parsed(self) -> None:
        assert self.patient.discharge_time is not None
        assert isinstance(self.patient.discharge_time, datetime)


class TestEdgeCases:
    """Test edge cases and HIPAA compliance."""

    def test_empty_name_fields(self) -> None:
        raw = (
            "MSH|^~\\&|TEST|TST|ATLAS|ED|20260310120000||ADT^A01|MSG099|P|2.5\r\n"
            "EVN|A01|20260310120000\r\n"
            "PID|1||MRN999^^^TST^MR||^^^||20000101|F\r\n"
            "PV1|1|E|ED^WR^A||||||||ED|||||||V01|||||||||||||||||||||20260310120000\r\n"
        )
        patient = parse_hl7_message(raw)
        assert patient.mrn == "MRN999"
        assert "." in patient.display_name

    def test_parsed_patient_dataclass(self) -> None:
        raw = (SAMPLE_DIR / "adt_a01_admit.hl7").read_text()
        patient = parse_hl7_message(raw)
        assert isinstance(patient, ParsedPatient)

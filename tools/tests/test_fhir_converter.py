"""Tests for FHIR R4 conversion."""

import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from hl7_parser import ParsedPatient
from fhir_converter import to_fhir_bundle, to_fhir_patient, to_fhir_encounter


def make_test_patient() -> ParsedPatient:
    return ParsedPatient(
        mrn="PT999",
        display_name="T.P.",
        age=45,
        sex="F",
        bed="7",
        admit_time=datetime(2026, 3, 10, 12, 0, 0),
        discharge_time=None,
        attending="S.C.",
        event_type="admit",
    )


class TestFhirBundle:
    """Test FHIR R4 Bundle generation."""

    def setup_method(self) -> None:
        self.patient = make_test_patient()
        self.bundle = to_fhir_bundle(self.patient)

    def test_resource_type_is_bundle(self) -> None:
        assert self.bundle["resourceType"] == "Bundle"

    def test_bundle_type_is_transaction(self) -> None:
        assert self.bundle["type"] == "transaction"

    def test_bundle_has_two_entries(self) -> None:
        assert len(self.bundle["entry"]) == 2

    def test_contains_patient_resource(self) -> None:
        types = [e["resource"]["resourceType"] for e in self.bundle["entry"]]
        assert "Patient" in types

    def test_contains_encounter_resource(self) -> None:
        types = [e["resource"]["resourceType"] for e in self.bundle["entry"]]
        assert "Encounter" in types

    def test_entries_have_request(self) -> None:
        for entry in self.bundle["entry"]:
            assert "request" in entry
            assert "method" in entry["request"]


class TestFhirPatient:
    """Test FHIR Patient resource."""

    def setup_method(self) -> None:
        self.patient = make_test_patient()
        self.fhir = to_fhir_patient(self.patient)

    def test_resource_type(self) -> None:
        assert self.fhir["resourceType"] == "Patient"

    def test_identifier_has_mrn(self) -> None:
        assert self.fhir["identifier"][0]["value"] == "PT999"
        assert self.fhir["identifier"][0]["system"] == "urn:bch:mrn"

    def test_name_uses_anonymous(self) -> None:
        assert self.fhir["name"][0]["use"] == "anonymous"
        assert self.fhir["name"][0]["text"] == "T.P."

    def test_name_never_contains_full_name(self) -> None:
        name_text = self.fhir["name"][0]["text"]
        assert len(name_text) <= 5

    def test_gender_mapping(self) -> None:
        assert self.fhir["gender"] == "female"

    def test_bed_extension(self) -> None:
        bed_ext = next(
            e for e in self.fhir["extension"] if e["url"] == "http://atlas.ed/fhir/bed"
        )
        assert bed_ext["valueString"] == "7"

    def test_age_extension(self) -> None:
        age_ext = next(
            e for e in self.fhir["extension"] if e["url"] == "http://atlas.ed/fhir/age"
        )
        assert age_ext["valueInteger"] == 45


class TestFhirEncounter:
    """Test FHIR Encounter resource."""

    def setup_method(self) -> None:
        self.patient = make_test_patient()
        self.encounter = to_fhir_encounter(self.patient)

    def test_resource_type(self) -> None:
        assert self.encounter["resourceType"] == "Encounter"

    def test_class_code_emer(self) -> None:
        assert self.encounter["class"]["code"] == "EMER"

    def test_status_in_progress(self) -> None:
        assert self.encounter["status"] == "in-progress"

    def test_location(self) -> None:
        assert self.encounter["location"][0]["location"]["display"] == "Bed 7"

    def test_participant_attending(self) -> None:
        assert self.encounter["participant"][0]["individual"]["display"] == "S.C."

    def test_period_start(self) -> None:
        assert "start" in self.encounter["period"]

    def test_discharge_encounter(self) -> None:
        discharged = make_test_patient()
        discharged.event_type = "discharge"
        discharged.discharge_time = datetime(2026, 3, 10, 18, 0, 0)
        enc = to_fhir_encounter(discharged)
        assert enc["status"] == "finished"
        assert "end" in enc["period"]

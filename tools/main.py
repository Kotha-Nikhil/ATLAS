"""
ATLAS HL7 Pipeline CLI

Parses HL7 v2 ADT messages, converts to FHIR R4 bundles,
and imports patients into the ATLAS ED Command Center.

Usage:
  python main.py --file sample_hl7/adt_a01_admit.hl7
  python main.py --watch ./hl7_drop/

The --watch mode monitors a directory for new .hl7 files and
processes them automatically as they appear.
"""

import argparse
import json
import sys
import time
from pathlib import Path

from hl7_parser import parse_hl7_message
from fhir_converter import to_fhir_bundle
from atlas_importer import import_to_atlas


def process_file(filepath: Path, do_import: bool = True) -> None:
    """Process a single HL7 file through the full pipeline."""
    print(f"\n{'='*50}")
    print(f"  Processing: {filepath.name}")
    print(f"{'='*50}")

    raw = filepath.read_text(encoding="utf-8")

    patient = parse_hl7_message(raw)
    print(f"  \u2713 Parsed: {patient.display_name} / Bed {patient.bed} / Age {patient.age} / {'Male' if patient.sex == 'M' else 'Female'}")
    print(f"    MRN: {patient.mrn} / Event: {patient.event_type} / Attending: {patient.attending}")

    bundle = to_fhir_bundle(patient)
    entry_count = len(bundle.get("entry", []))
    resource_types = [e["resource"]["resourceType"] for e in bundle.get("entry", [])]
    print(f"  \u2713 FHIR Bundle generated ({' + '.join(resource_types)})")

    if do_import:
        try:
            patient_id = import_to_atlas(bundle)
            print(f"  \u2713 Imported to ATLAS \u2192 Patient ID: {patient_id}")
            print(f"  \u2713 Dashboard updated in real time")
        except Exception as e:
            print(f"  \u2717 Import failed: {e}")
            print(f"    (Is the ATLAS backend running? Check .env settings)")
    else:
        print(f"  \u2139 Dry run \u2014 FHIR Bundle (not imported):")
        print(json.dumps(bundle, indent=2, default=str))


def watch_directory(dirpath: Path, do_import: bool = True) -> None:
    """Watch a directory for new .hl7 files and process them."""
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler, FileCreatedEvent
    except ImportError:
        print("Error: watchdog not installed. Run: pip install watchdog")
        sys.exit(1)

    class HL7Handler(FileSystemEventHandler):
        def on_created(self, event: FileCreatedEvent) -> None:  # type: ignore[override]
            if not event.is_directory and event.src_path.endswith(".hl7"):
                time.sleep(0.5)
                process_file(Path(event.src_path), do_import=do_import)

    dirpath.mkdir(parents=True, exist_ok=True)

    observer = Observer()
    observer.schedule(HL7Handler(), str(dirpath), recursive=False)
    observer.start()

    print(f"\n  Watching {dirpath}/ for new HL7 files...")
    print(f"  Drop .hl7 files into this folder to process them.")
    print(f"  Press Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ATLAS HL7 Pipeline \u2014 Parse HL7 v2 ADT messages, convert to FHIR R4, import to ATLAS",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --file sample_hl7/adt_a01_admit.hl7
  python main.py --file sample_hl7/adt_a01_admit.hl7 --dry-run
  python main.py --watch ./hl7_drop/
        """,
    )
    parser.add_argument("--file", type=Path, help="Path to a single HL7 file")
    parser.add_argument("--watch", type=Path, help="Directory to watch for new HL7 files")
    parser.add_argument("--dry-run", action="store_true", help="Parse and convert but do not import")

    args = parser.parse_args()

    if not args.file and not args.watch:
        parser.print_help()
        sys.exit(1)

    print("\n  ATLAS HL7 Pipeline")
    print("  HL7 v2 \u2192 FHIR R4 \u2192 ATLAS ED Command Center\n")

    do_import = not args.dry_run

    if args.file:
        if not args.file.exists():
            print(f"  Error: File not found: {args.file}")
            sys.exit(1)
        process_file(args.file, do_import=do_import)

    if args.watch:
        watch_directory(args.watch, do_import=do_import)


if __name__ == "__main__":
    main()

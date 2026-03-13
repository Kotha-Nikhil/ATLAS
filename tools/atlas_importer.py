"""
ATLAS FHIR Importer

Posts FHIR R4 Bundles to the ATLAS backend API.
Handles JWT authentication, error handling, and retry logic.
"""

import os
import time
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2


def get_config() -> tuple[str, str | None]:
    """Load API URL and JWT token from environment."""
    base_url = os.getenv("ATLAS_API_URL", "http://localhost:8080")
    token = os.getenv("ATLAS_JWT_TOKEN")
    return base_url, token


def import_to_atlas(bundle: dict[str, Any]) -> str:
    """
    POST a FHIR Bundle to the ATLAS backend.

    Returns the created patient ID on success.
    Retries up to 3 times on transient failures.

    Raises:
        RuntimeError: if import fails after all retries
        ValueError: if the bundle is missing required data
    """
    base_url, token = get_config()
    url = f"{base_url}/api/fhir/Patient"

    headers: dict[str, str] = {
        "Content-Type": "application/fhir+json",
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(url, json=bundle, headers=headers, timeout=10)

            if resp.status_code == 201:
                data = resp.json()
                return data.get("id", "unknown")

            if resp.status_code == 401:
                raise RuntimeError(
                    "Authentication failed. Check ATLAS_JWT_TOKEN in .env"
                )

            if resp.status_code == 422:
                body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                raise ValueError(
                    f"Validation error: {body.get('error', resp.text)}"
                )

            if resp.status_code >= 500:
                raise RuntimeError(f"Server error {resp.status_code}: {resp.text}")

            raise RuntimeError(
                f"Unexpected response {resp.status_code}: {resp.text}"
            )

        except (requests.ConnectionError, requests.Timeout) as e:
            last_error = e
            if attempt < MAX_RETRIES:
                print(f"  ⚠ Connection failed (attempt {attempt}/{MAX_RETRIES}), retrying in {RETRY_DELAY_SECONDS}s...")
                time.sleep(RETRY_DELAY_SECONDS)
            continue

        except (RuntimeError, ValueError):
            raise

    raise RuntimeError(
        f"Failed to import after {MAX_RETRIES} attempts: {last_error}"
    )

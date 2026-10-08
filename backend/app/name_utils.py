"""Helper utilities for splitting and combining user names (CP2 Zero-Downtime Migration)."""


def split_name(full_name: str | None) -> tuple[str, str]:
    """Split a full name into (first_name, last_name). Handles single names, extra spaces, and empty strings."""
    if not full_name:
        return "", ""
    parts = full_name.strip().split(maxsplit=1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return parts[0].strip(), ""


def combine_name(first_name: str | None, last_name: str | None, fallback: str | None = None) -> str:
    """Combine first_name and last_name into a full name, with fallback to legacy name."""
    first = (first_name or "").strip() if first_name is not None else ""
    last = (last_name or "").strip() if last_name is not None else ""
    combined = f"{first} {last}".strip()
    if combined:
        return combined
    return (fallback or "").strip()

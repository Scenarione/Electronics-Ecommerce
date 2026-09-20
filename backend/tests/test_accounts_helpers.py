"""Unit tests for account helper behavior.

These tests do not require a database connection.
"""
from app.accounts import normalize_email


def test_normalize_email_trims_and_lowercases():
    assert normalize_email("  USER@Example.COM ") == "user@example.com"

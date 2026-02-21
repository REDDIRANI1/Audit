"""
Unit tests for workers.tasks.maintenance

Tests cleanup_expired_data with mocked DB and S3 to avoid
requiring live PostgreSQL or MinIO.
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch, call


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_call(call_id: int, days_ago: int, s3_path: str = "recordings/test.wav"):
    """Build a mock Call object."""
    call = MagicMock()
    call.id = call_id
    call.user_id = 1
    call.s3_path = s3_path
    call.created_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
    call.media_files = []
    return call


# ---------------------------------------------------------------------------
# cleanup_expired_data tests
# ---------------------------------------------------------------------------

class TestCleanupExpiredData:
    @patch("workers.tasks.maintenance._delete_s3_object")
    @patch("workers.tasks.maintenance.get_sync_db")
    def test_deletes_old_calls(self, mock_get_db, mock_s3_delete):
        """Calls older than DEFAULT_RETENTION_DAYS (365) are deleted."""
        old_call = make_call(1, days_ago=400)
        recent_call = make_call(2, days_ago=10)

        mock_db = MagicMock()
        mock_db.__enter__ = MagicMock(return_value=mock_db)
        mock_db.__exit__ = MagicMock(return_value=False)
        mock_db.query.return_value.all.return_value = []  # No clients
        mock_db.query.return_value.filter.return_value.all.return_value = [old_call, recent_call]

        mock_get_db.return_value = mock_db

        # Import task after patching
        from workers.tasks.maintenance import cleanup_expired_data

        # Directly call the underlying function (bypass Celery)
        result = cleanup_expired_data.__wrapped__(MagicMock())

        # Old call S3 should be purged
        mock_s3_delete.assert_called()
        args_list = [c.args[0] for c in mock_s3_delete.call_args_list]
        assert old_call.s3_path in args_list

    @patch("workers.tasks.maintenance._delete_s3_object")
    @patch("workers.tasks.maintenance.get_sync_db")
    def test_skips_recent_calls(self, mock_get_db, mock_s3_delete):
        """Calls within retention window are NOT deleted."""
        recent_call = make_call(2, days_ago=30)

        mock_db = MagicMock()
        mock_db.__enter__ = MagicMock(return_value=mock_db)
        mock_db.__exit__ = MagicMock(return_value=False)
        mock_db.query.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.all.return_value = [recent_call]

        mock_get_db.return_value = mock_db

        from workers.tasks.maintenance import cleanup_expired_data
        result = cleanup_expired_data.__wrapped__(MagicMock())

        # Recent call should NOT trigger S3 deletion
        for c in mock_s3_delete.call_args_list:
            assert recent_call.s3_path not in c.args

    @patch("workers.tasks.maintenance._delete_s3_object")
    @patch("workers.tasks.maintenance.get_sync_db")
    def test_returns_counts(self, mock_get_db, mock_s3_delete):
        """Return dict has the right keys."""
        mock_db = MagicMock()
        mock_db.__enter__ = MagicMock(return_value=mock_db)
        mock_db.__exit__ = MagicMock(return_value=False)
        mock_db.query.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.all.return_value = []
        mock_get_db.return_value = mock_db

        from workers.tasks.maintenance import cleanup_expired_data
        result = cleanup_expired_data.__wrapped__(MagicMock())

        assert "deleted_calls" in result
        assert "deleted_s3_objects" in result

    @patch("workers.tasks.maintenance._get_s3_client")
    def test_s3_delete_swallows_exceptions(self, mock_s3_client):
        """S3 failures should not crash the task."""
        mock_s3_client.return_value.delete_object.side_effect = Exception("S3 timeout")

        from workers.tasks.maintenance import _delete_s3_object
        # Should not raise
        _delete_s3_object("recordings/some.wav")


# ---------------------------------------------------------------------------
# S3 helper tests
# ---------------------------------------------------------------------------

class TestDeleteS3Object:
    @patch("workers.tasks.maintenance._get_s3_client")
    def test_calls_delete_object(self, mock_client_factory):
        mock_client = MagicMock()
        mock_client_factory.return_value = mock_client

        from workers.tasks.maintenance import _delete_s3_object
        _delete_s3_object("recordings/test.wav")

        mock_client.delete_object.assert_called_once()
        kwargs = mock_client.delete_object.call_args[1]
        assert kwargs["Key"] == "recordings/test.wav"

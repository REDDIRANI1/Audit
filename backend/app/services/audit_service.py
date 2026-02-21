from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog


async def log_action(
    db: AsyncSession,
    user_id: int,
    action_type: str,
    resource_id: str = None,
    ip_address: str = None,
    user_agent: str = None,
    details: str = None,
):
    """Create a write-once audit log entry for SOC2 compliance."""
    log = AuditLog(
        user_id=user_id,
        action_type=action_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
    )
    db.add(log)
    await db.flush()

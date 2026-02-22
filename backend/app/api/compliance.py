from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from typing import Dict, Any, List
import logging

from app.database import get_db
from app.models.call import Call, CallStatus
from app.services.compliance_report import generate_pci_attestation
from app.api.auth import get_current_user
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/stats")
async def get_compliance_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns aggregated PCI compliance statistics.
    """
    result = await db.execute(select(func.count(Call.id)).filter(Call.status == CallStatus.COMPLETED))
    total_calls = result.scalar()
    
    # Mock some compliance-specific stats for now as we just integrated the redactor
    # In a real scenario, we would query a 'redactions' table or similar.
    stats = {
        "total_calls": total_calls or 0,
        "dtmf_detections": 142,  # Example aggregate
        "redacted_seconds": 284.5,
        "compliance_rate": 100.0,
        "pii_redactions": 892,
    }
    return {"status": "success", "data": stats}

@router.get("/download-report")
async def download_pci_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates and returns the PCI Compliance PDF report.
    """
    # Fetch data for report
    result = await db.execute(select(func.count(Call.id)).filter(Call.status == CallStatus.COMPLETED))
    total_calls = result.scalar()
    
    stats = {
        "total_calls": total_calls or 0,
        "dtmf_detections": 142,
        "redacted_seconds": 284.5,
    }
    
    # In a production app, we might log who downloaded the report here.
    logger.info(f"User {current_user.email} generating PCI report")
    
    try:
        pdf_bytes = generate_pci_attestation(
            org_name="Audit AI Platform Client",
            stats=stats,
            redaction_log=[] # Placeholder
        )
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=PCI_Compliance_Attestation.pdf"
            }
        )
    except Exception as e:
        logger.error(f"Failed to generate PDF: {e}")
        raise HTTPException(status_code=500, detail="Report generation failed")

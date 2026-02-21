from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.scoring_template import ScoringTemplate
from app.schemas.template import TemplateCreate, TemplateResponse, TemplateListResponse

router = APIRouter(prefix="/api/templates", tags=["Scoring Templates"])


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active scoring templates."""
    result = await db.execute(
        select(ScoringTemplate)
        .where(ScoringTemplate.is_active == 1)
        .order_by(ScoringTemplate.name)
    )
    templates = result.scalars().all()

    return TemplateListResponse(
        templates=[TemplateResponse.model_validate(t) for t in templates],
        total=len(templates),
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific scoring template."""
    result = await db.execute(
        select(ScoringTemplate).where(ScoringTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateResponse.model_validate(template)


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    body: TemplateCreate,
    current_user: User = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.CXO)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new scoring template (Manager+ only)."""
    template = ScoringTemplate(
        name=body.name,
        vertical=body.vertical,
        system_prompt=body.system_prompt,
        json_schema=body.json_schema,
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return TemplateResponse.model_validate(template)


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    body: TemplateCreate,
    current_user: User = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.CXO)),
    db: AsyncSession = Depends(get_db),
):
    """Update a scoring template (creates a new version)."""
    result = await db.execute(
        select(ScoringTemplate).where(ScoringTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.name = body.name
    template.vertical = body.vertical
    template.system_prompt = body.system_prompt
    template.json_schema = body.json_schema
    template.version += 1

    await db.flush()
    await db.refresh(template)
    return TemplateResponse.model_validate(template)

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserRole
from app.utils.security import hash_password, verify_password, create_access_token


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    """Authenticate a user by email and password."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


async def create_user(
    db: AsyncSession,
    email: str,
    password: str,
    full_name: str,
    role: UserRole = UserRole.agent,
    department: str = None,
    client_id: int = None,
) -> User:
    """Create a new user with hashed password."""
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        department=department,
        client_id=client_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


def generate_user_token(user: User) -> str:
    """Generate a JWT token for a user."""
    return create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "full_name": user.full_name,
        }
    )


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """Get a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Get a user by email."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

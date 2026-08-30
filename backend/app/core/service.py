from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.models import User
from app.core.security import verify_password


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core import service
from app.core.dependencies import get_current_user, require_role
from app.core.models import Business, Role, User
from app.core.schemas import LoginRequest, TokenResponse, UserCreate, UserOut
from app.core.security import create_access_token, hash_password
from app.database import get_db

router = APIRouter()


def _to_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.name,
        is_active=user.is_active,
    )


@router.get("/businesses")
def list_businesses(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    businesses = db.scalars(select(Business).where(Business.is_active.is_(True))).all()
    return [{"code": b.code, "name": b.name, "icon": b.icon} for b in businesses]


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = service.authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/auth/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return _to_user_out(user)


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_role("owner"))):
    return [_to_user_out(u) for u in db.scalars(select(User)).all()]


@router.post("/users", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("owner")),
):
    role = db.scalar(select(Role).where(Role.name == payload.role_name))
    if role is None:
        raise HTTPException(
            status_code=400, detail=f"Role '{payload.role_name}' tidak ditemukan"
        )
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=400, detail="Email sudah dipakai user lain")
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role_id=role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_user_out(user)

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session
from app.core.models import User
from app.core.security import decode_access_token
from app.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/core/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau sudah kadaluarsa, silakan login ulang",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError as err:
        raise credentials_exception from err

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_role(*allowed_roles: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Kamu tidak punya akses untuk aksi ini",
            )
        return user

    return checker

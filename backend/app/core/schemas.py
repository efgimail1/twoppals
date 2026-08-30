from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role_name: str = "staff"

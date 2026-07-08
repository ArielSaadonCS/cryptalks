import re

from pydantic import BaseModel, EmailStr, model_validator

ALLOWED_SPECIAL_CHARS = "!@#$%^&*_-?"
_ALLOWED_CHARS_PATTERN = re.compile(rf"^[A-Za-z0-9{re.escape(ALLOWED_SPECIAL_CHARS)}]+$")
_SPECIAL_CHAR_PATTERN = re.compile(rf"[{re.escape(ALLOWED_SPECIAL_CHARS)}]")


def validate_password(password: str, name: str, email: str) -> None:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one number")
    if not _SPECIAL_CHAR_PATTERN.search(password):
        raise ValueError(
            f"Password must contain at least one special character ({' '.join(ALLOWED_SPECIAL_CHARS)})"
        )
    if not _ALLOWED_CHARS_PATTERN.match(password):
        raise ValueError(
            f"Password may only contain English letters, numbers, and these symbols: "
            f"{' '.join(ALLOWED_SPECIAL_CHARS)}"
        )

    name_part = name.strip().lower()
    if name_part and name_part in password.lower():
        raise ValueError("Password must not contain your name")

    email_username = email.split("@")[0].strip().lower()
    if email_username and email_username in password.lower():
        raise ValueError("Password must not contain the email username")


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @model_validator(mode="after")
    def check_password_policy(self):
        validate_password(self.password, self.name, self.email)
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    onboardingCompleted: bool = False

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

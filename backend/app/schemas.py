import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

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


ALLOWED_ASSETS = {"BTC", "ETH", "SOL", "ADA", "XRP", "DOGE", "AVAX", "LINK", "MATIC", "DOT"}
ALLOWED_INVESTOR_TYPES = {"HODLer", "Day Trader", "NFT Collector", "Beginner", "Researcher"}
ALLOWED_CONTENT_TYPES = {"Market News", "Charts", "AI Insights", "Fun"}
ALLOWED_RISK_LEVELS = {"Low", "Medium", "High"}


class PreferenceCreateOrUpdate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "assets": ["BTC", "ETH", "SOL"],
                "investorType": "HODLer",
                "contentTypes": ["Market News", "Charts", "Fun"],
                "riskLevel": "Medium",
            }
        },
    )

    assets: list[str]
    investor_type: str = Field(alias="investorType")
    content_types: list[str] = Field(alias="contentTypes")
    risk_level: str = Field(alias="riskLevel")

    @field_validator("assets")
    @classmethod
    def validate_assets(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("At least one asset is required")
        invalid = sorted(set(value) - ALLOWED_ASSETS)
        if invalid:
            raise ValueError(f"Invalid asset(s): {', '.join(invalid)}. Allowed: {', '.join(sorted(ALLOWED_ASSETS))}")
        return value

    @field_validator("investor_type")
    @classmethod
    def validate_investor_type(cls, value: str) -> str:
        if value not in ALLOWED_INVESTOR_TYPES:
            raise ValueError(f"Invalid investorType. Allowed: {', '.join(sorted(ALLOWED_INVESTOR_TYPES))}")
        return value

    @field_validator("content_types")
    @classmethod
    def validate_content_types(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("At least one content type is required")
        invalid = sorted(set(value) - ALLOWED_CONTENT_TYPES)
        if invalid:
            raise ValueError(
                f"Invalid content type(s): {', '.join(invalid)}. Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
            )
        return value

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, value: str) -> str:
        if value not in ALLOWED_RISK_LEVELS:
            raise ValueError(f"Invalid riskLevel. Allowed: {', '.join(sorted(ALLOWED_RISK_LEVELS))}")
        return value


class PreferenceResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    assets: list[str]
    investor_type: str = Field(alias="investorType")
    content_types: list[str] = Field(alias="contentTypes")
    risk_level: str = Field(alias="riskLevel")
    onboarding_completed: bool = Field(alias="onboardingCompleted")

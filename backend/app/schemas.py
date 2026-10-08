from decimal import Decimal
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Register(StrictModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str | None = Field(default=None, max_length=120)
    first_name: str | None = Field(default=None, max_length=60)
    last_name: str | None = Field(default=None, max_length=60)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return value.lower()

    @model_validator(mode="after")
    def validate_name_fields(self):
        if not self.name and not self.first_name:
            raise ValueError("Either name or first_name must be provided")
        if not self.first_name and self.name:
            parts = self.name.strip().split(maxsplit=1)
            self.first_name = parts[0]
            self.last_name = parts[1] if len(parts) > 1 else ""
        elif self.first_name and not self.name:
            self.name = f"{self.first_name} {self.last_name or ''}".strip()
        return self


class Login(StrictModel):
    email: EmailStr
    password: str = Field(max_length=128)


class Profile(StrictModel):
    name: str | None = Field(default=None, max_length=120)
    first_name: str | None = Field(default=None, max_length=60)
    last_name: str | None = Field(default=None, max_length=60)

    @model_validator(mode="after")
    def validate_name_fields(self):
        if not self.name and not self.first_name:
            raise ValueError("Either name or first_name must be provided")
        if not self.first_name and self.name:
            parts = self.name.strip().split(maxsplit=1)
            self.first_name = parts[0]
            self.last_name = parts[1] if len(parts) > 1 else ""
        elif self.first_name and not self.name:
            self.name = f"{self.first_name} {self.last_name or ''}".strip()
        return self


class ProductInput(StrictModel):
    id: UUID = Field(default_factory=uuid4)
    sku: str = Field(min_length=1, max_length=60, pattern=r"^[A-Za-z0-9_-]+$")
    slug: str = Field(min_length=1, max_length=200, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=1, max_length=200)
    brand: str = Field(min_length=1, max_length=80)
    category: str
    description: str = Field(max_length=5000)
    images: list[HttpUrl] = Field(default_factory=list, max_length=8)
    specifications: dict
    price: Decimal = Field(ge=0, le=99999999, max_digits=12, decimal_places=2)
    quantity: int = Field(ge=0, le=1000000, strict=True)


class ProductEdit(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    brand: str = Field(min_length=1, max_length=80)
    description: str = Field(max_length=5000)
    images: list[HttpUrl] = Field(default_factory=list, max_length=8)
    specifications: dict


class CommerceEdit(StrictModel):
    price: Decimal = Field(ge=0, le=99999999, max_digits=12, decimal_places=2)
    active: bool


class StockAdjustment(StrictModel):
    delta: int = Field(ge=-1000000, le=1000000, strict=True)


class Address(StrictModel):
    recipient: str = Field(min_length=1, max_length=120)
    line1: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    postal_code: str = Field(pattern=r"^\d{5}$")
    country: Literal["TH"] = "TH"


from .builder_catalog import LEGACY_BUILDER_ID_MAP


class CartLine(StrictModel):
    item_id: UUID
    quantity: int = Field(ge=1, le=100, strict=True)

    @field_validator("item_id", mode="before")
    @classmethod
    def normalize_item_id(cls, value):
        if isinstance(value, str) and value in LEGACY_BUILDER_ID_MAP:
            return UUID(LEGACY_BUILDER_ID_MAP[value])
        return value



class Checkout(StrictModel):
    items: list[CartLine] = Field(min_length=1, max_length=100)
    shipping_address: Address
    simulation: Literal["success", "failure"] = "success"

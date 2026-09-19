from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Register(StrictModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    name: str = Field(min_length=1, max_length=120)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return value.lower()


class Login(StrictModel):
    email: EmailStr
    password: str = Field(max_length=128)


class Profile(StrictModel):
    name: str = Field(min_length=1, max_length=120)


class ProductInput(StrictModel):
    id: UUID
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


class CartLine(StrictModel):
    item_id: UUID
    quantity: int = Field(ge=1, le=100, strict=True)


class Checkout(StrictModel):
    items: list[CartLine] = Field(min_length=1, max_length=100)
    shipping_address: Address
    simulation: Literal["success", "failure"] = "success"

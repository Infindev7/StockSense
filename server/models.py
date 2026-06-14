from pydantic import BaseModel, Field
from typing import List, Optional

class Product(BaseModel):
    product_id: str
    name: str
    category: str
    price: float
    unit: str
    quantity: int
    min_threshold: int
    status: Optional[str] = "ok"

class Summary(BaseModel):
    total_products: int
    low_stock: int
    warning: int
    inventory_value: float

class InventoryResponse(BaseModel):
    success: bool
    count: int
    summary: Summary
    products: List[Product]

class CheckoutItem(BaseModel):
    productId: str
    name: str
    quantitySold: int
    pricePerUnit: float

class CheckoutPayload(BaseModel):
    timestamp: str
    cashierId: str
    totalAmount: float
    items: List[CheckoutItem]

class RestockPayload(BaseModel):
    product_id: str
    quantity_added: int

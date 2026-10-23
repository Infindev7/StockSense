import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from main import app
from models import Product, Summary, CheckoutItem, CheckoutPayload, RestockPayload

client = TestClient(app)

def test_root_endpoint():
    """Verify that root endpoint returns HTTP 200 with online status."""
    response = client.get("/")
    assert response.status_code == 200 #This line is supposed to be changed to demonstrate error (Marked by Soham)
    data = response.json()
    assert data["status"] == "ok"
    assert "StockSense Backend API" in data["message"]

def test_health_endpoint():
    """Verify that /health returns HTTP 200 and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "StockSense Backend API"

def test_product_model_validation():
    """Verify Product pydantic model enforces required schema and default values."""
    prod = Product(
        product_id="prod_001",
        name="Basmati Rice 1kg",
        category="Grains",
        price=120.0,
        unit="pack",
        quantity=25,
        min_threshold=10
    )
    assert prod.product_id == "prod_001"
    assert prod.price == 120.0
    assert prod.status == "ok"

    # Missing required field must raise ValidationError
    with pytest.raises(ValidationError):
        Product(
            product_id="prod_002",
            name="Incomplete Product",
            # missing category, price, unit, quantity, min_threshold
        )

def test_checkout_payload_validation():
    """Verify CheckoutPayload model validates items, quantities, and totals."""
    item = CheckoutItem(
        productId="prod_001",
        name="Basmati Rice 1kg",
        quantitySold=2,
        pricePerUnit=120.0
    )
    payload = CheckoutPayload(
        timestamp="2026-10-23T00:00:00Z",
        cashierId="CASHIER_01",
        totalAmount=240.0,
        items=[item]
    )
    assert len(payload.items) == 1
    assert payload.totalAmount == 240.0
    assert payload.items[0].quantitySold == 2

    # Negative quantity sold or invalid data structure
    with pytest.raises(ValidationError):
        CheckoutPayload(
            timestamp="2026-10-23T00:00:00Z",
            cashierId="CASHIER_01",
            totalAmount="invalid_number",  # type mismatch
            items=[]
        )

def test_restock_payload_validation():
    """Verify RestockPayload enforces product ID and integer quantity."""
    restock = RestockPayload(product_id="prod_001", quantity_added=50)
    assert restock.product_id == "prod_001"
    assert restock.quantity_added == 50

    with pytest.raises(ValidationError):
        RestockPayload(product_id="prod_001", quantity_added="not_an_int")

def test_inventory_threshold_and_summary_logic():
    """Verify calculation logic for low stock, warning levels, and total inventory value."""
    sample_products = [
        {"name": "Item A", "quantity": 4, "min_threshold": 10, "price": 100.0},  # < 10 -> low
        {"name": "Item B", "quantity": 12, "min_threshold": 10, "price": 50.0},  # < 15 -> warning
        {"name": "Item C", "quantity": 30, "min_threshold": 10, "price": 20.0},  # >= 15 -> ok
    ]

    low_stock = 0
    warning = 0
    total_val = 0.0

    for p in sample_products:
        q = p["quantity"]
        thresh = p["min_threshold"]
        price = p["price"]
        total_val += q * price

        if q < thresh:
            low_stock += 1
        elif q < thresh * 1.5:
            warning += 1

    summary = Summary(
        total_products=len(sample_products),
        low_stock=low_stock,
        warning=warning,
        inventory_value=total_val
    )

    assert summary.total_products == 3
    assert summary.low_stock == 1
    assert summary.warning == 1
    assert summary.inventory_value == (4 * 100.0 + 12 * 50.0 + 30 * 20.0)

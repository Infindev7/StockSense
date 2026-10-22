import os
import httpx
from fastapi import APIRouter
from database import db
from models import CheckoutPayload

router = APIRouter()

@router.post("/checkout")
async def process_checkout(payload: CheckoutPayload):
    # Register the sale
    await db.sales.insert_one(payload.model_dump())
    
    has_low_stock_in_order = False

    for item in payload.items:
        product = await db.products.find_one({"product_id": item.productId})
        if product:
            current_qty = product.get("quantity", 0)
            min_thresh = product.get("min_threshold", 10)

            new_qty = max(0, current_qty - item.quantitySold)
            
            new_status = "ok"
            if new_qty < min_thresh:
                new_status = "low"
            elif new_qty < min_thresh * 1.5:
                new_status = "warning"
                
            await db.products.update_one(
                {"product_id": item.productId},
                {"$set": {"quantity": new_qty, "status": new_status}}
            )
            
            # Trigger alert if any item in the order is low in stock
            if new_status == "low":
                has_low_stock_in_order = True
                print(f"Product in order needs restock: {product.get('name')} (stock: {new_qty}, min: {min_thresh})")

    alert_fired = False
    low_stock_count = 0
    webhook_status = None
    webhook_message = None

    # Storewide scan: query all products in the database that currently need restocking
    cursor = db.products.find({
        "$or": [
            {"status": "low"},
            {"$expr": {"$lt": ["$quantity", "$min_threshold"]}}
        ]
    })
    all_low_docs = await cursor.to_list(length=1000)

    restock_alerts = []
    for doc in all_low_docs:
        doc.pop('_id', None)
        if 'id' in doc and 'product_id' not in doc:
            doc['product_id'] = doc['id']
        doc['status'] = 'low'
        restock_alerts.append(doc)

    low_stock_count = len(restock_alerts)

    # If there are products needing restock, send alert via n8n
    if restock_alerts:
        print(f"Storewide scan: {low_stock_count} products currently need restocking")
        from dotenv import load_dotenv
        load_dotenv(override=True)
        
        webhook_url = os.getenv("N8N_RESTOCK_WEBHOOK_URL")
        print(f"Webhook URL: {webhook_url}")
        
        if webhook_url:
            async with httpx.AsyncClient() as client:
                try:
                    print(f"Sending payload: {{'needs_restock': {len(restock_alerts)} items}}")
                    response = await client.post(webhook_url, json={"needs_restock": restock_alerts}, timeout=10.0)
                    webhook_status = response.status_code
                    webhook_message = response.text
                    print(f"Webhook response: {response.status_code} - {response.text}")
                    if response.status_code < 400:
                        alert_fired = True
                except Exception as e:
                    webhook_message = str(e)
                    print(f"Failed to send restock webhook: {e}")
        else:
            webhook_message = "N8N_RESTOCK_WEBHOOK_URL is not set"
            print("ERROR: N8N_RESTOCK_WEBHOOK_URL is None. The .env file was not loaded correctly.")
    
    return {
        "success": True,
        "message": "Checkout processed",
        "alert_fired": alert_fired,
        "has_low_stock": (low_stock_count > 0),
        "low_stock_count": low_stock_count,
        "webhook_status": webhook_status,
        "webhook_message": webhook_message
    }

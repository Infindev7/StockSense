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
    
    restock_alerts = []

    for item in payload.items:
        product = await db.products.find_one({"product_id": item.productId})
        if product:
            new_qty = max(0, product.get("quantity", 0) - item.quantitySold)
            min_thresh = product.get("min_threshold", 10)
            
            new_status = "ok"
            if new_qty < min_thresh:
                new_status = "low"
            elif new_qty < min_thresh * 1.5:
                new_status = "warning"
                
            await db.products.update_one(
                {"product_id": item.productId},
                {"$set": {"quantity": new_qty, "status": new_status}}
            )
            
            if new_status == "low":
                product.pop('_id', None)
                product['quantity'] = new_qty
                product['status'] = new_status
                restock_alerts.append(product)
                print(f"Added to restock alert: {product.get('name')}")

    if restock_alerts:
        # Force load the env variables in case uvicorn didn't reload the .env file
        from dotenv import load_dotenv
        load_dotenv(override=True)
        
        webhook_url = os.getenv("N8N_RESTOCK_WEBHOOK_URL")
        print(f"Webhook URL resolved to: {webhook_url}")
        
        if webhook_url:
            async with httpx.AsyncClient() as client:
                try:
                    print(f"Sending payload: {{'needs_restock': {restock_alerts}}}")
                    response = await client.post(webhook_url, json={"needs_restock": restock_alerts})
                    print(f"Webhook response status: {response.status_code}")
                except Exception as e:
                    print(f"Failed to send restock webhook: {e}")
        else:
            print("ERROR: N8N_RESTOCK_WEBHOOK_URL is None. The .env file was not loaded correctly.")
        
    return {"success": True, "message": "Checkout processed"}

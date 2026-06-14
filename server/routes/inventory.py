from fastapi import APIRouter
from database import db
from models import InventoryResponse, Summary, Product, RestockPayload
from typing import List
from fastapi import HTTPException

router = APIRouter()

@router.get("/inventory", response_model=List[InventoryResponse])
async def get_inventory():
    products_cursor = db.products.find({})
    products = await products_cursor.to_list(length=1000)
    
    # Process products and calculate summary
    total_products = len(products)
    low_stock = 0
    warning = 0
    inventory_value = 0.0
    
    formatted_products = []
    
    for p in products:
        # Avoid _id mapping issues by popping it
        p.pop('_id', None)
        
        qty = p.get('quantity', 0)
        min_thresh = p.get('min_threshold', 10)
        price = p.get('price', 0.0)
        
        status = "ok"
        if qty < min_thresh:
            status = "low"
            low_stock += 1
        elif qty < min_thresh * 1.5:
            status = "warning"
            warning += 1
            
        inventory_value += qty * price
        
        p['status'] = status
        # Ensure product_id exists if it was saved as id
        if 'id' in p and 'product_id' not in p:
            p['product_id'] = p['id']
            
        formatted_products.append(Product(**p))

    summary = Summary(
        total_products=total_products,
        low_stock=low_stock,
        warning=warning,
        inventory_value=inventory_value
    )
    
    return [
        InventoryResponse(
            success=True,
            count=total_products,
            summary=summary,
            products=formatted_products
        )
    ]

@router.post("/inventory")
async def add_product(product: Product):
    product_dict = product.model_dump()
    
    existing = await db.products.find_one({"product_id": product_dict["product_id"]})
    if existing:
        await db.products.update_one({"product_id": product_dict["product_id"]}, {"$set": product_dict})
        return {"success": True, "message": "Product updated"}
        
    await db.products.insert_one(product_dict)
    return {"success": True, "message": "Product added"}

@router.post("/inventory/restock")
async def restock_product(payload: RestockPayload):
    product = await db.products.find_one({"product_id": payload.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    new_qty = product.get("quantity", 0) + payload.quantity_added
    min_thresh = product.get("min_threshold", 10)
    
    new_status = "ok"
    if new_qty < min_thresh:
        new_status = "low"
    elif new_qty < min_thresh * 1.5:
        new_status = "warning"
        
    await db.products.update_one(
        {"product_id": payload.product_id},
        {"$set": {"quantity": new_qty, "status": new_status}}
    )
    
    return {"success": True, "message": f"Restocked {payload.quantity_added} units"}

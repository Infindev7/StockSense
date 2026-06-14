from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routes import inventory, checkout

app = FastAPI(title="StockSense API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router, prefix="/api", tags=["Inventory"])
app.include_router(checkout.router, prefix="/api", tags=["Checkout"])

@app.get("/")
async def root():
    return {"status": "ok", "message": "StockSense Backend API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

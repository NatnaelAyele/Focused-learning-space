from fastapi import FastAPI
from app.api.routes import router
from app.api.auth_routes import router as auth_router
from app.database.db import Base, engine
from app.models import models
from fastapi.middleware.cors import CORSMiddleware

# Create database tables at startup if they do not exist yet.
Base.metadata.create_all(bind=engine)


app = FastAPI(root_path="/api")

# set up CORS middle ware to allow communication between frontend and backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include API routes from different modules.
app.include_router(router)
app.include_router(auth_router)


@app.get("/health")
def check_health():
    """a simple health check endpoint to verify the backend is running."""
    return {"message": "Health check passed!"}
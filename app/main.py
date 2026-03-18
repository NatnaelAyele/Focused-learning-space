from fastapi import FastAPI
from app.api.routes import router
from app.api.auth_routes import router as auth_router
from app.database.db import Base, engine
from app.models import models
from app.api.test import app as test_router
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)
app.include_router(test_router)


@app.get("/health")
def check_health():
    return {"message": "Health check passed!"}
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm   
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.models import User
from app.security.auth import hash_password, authenticate_user, generate_token
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class RegisterRequest(BaseModel):
    """Payload model expected by the user registration endpoint."""
    username: str
    email: str
    password: str

@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Check if the username or email is already registered, if not create the new user"""
    registered_user = db.query(User).filter((User.username == request.username) | (User.email == request.email)).first()
    if registered_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    new_user = User(username=request.username, email=request.email, hashed_password=hash_password(request.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully"}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Validate credential, and if valid give accesstoken."""
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    # Include username and ID claims in the token.
    access_token = generate_token(data={"sub": user.username, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

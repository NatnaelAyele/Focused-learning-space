from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.database.db import get_db
from sqlalchemy.orm import Session
from app.models.models import User

load_dotenv()

secret_key = os.getenv("Secret_Key")
algorithm = "HS256"
bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
token_bearer = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(password: str):
    """Hash a plain-text password using bcrypt for secure storage."""
    return bcrypt_context.hash(password)

def authenticate_user(username:str, plain_password: str, db: Session):
    """Validate username/password credentials and return the matching user."""
    # Fetch user by username first. return False if not found.
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    # Compare the provided password against the stored hashed password.
    if not bcrypt_context.verify(plain_password, user.hashed_password):
        return False
    return user

def generate_token(data: dict):
    """Create a JWT access token."""
    pay_load = data.copy()
    expiry_time = datetime.now(timezone.utc) + timedelta(hours=8)
    pay_load.update({"exp": expiry_time})
    encoded_jwt = jwt.encode(pay_load, secret_key, algorithm=algorithm)
    return encoded_jwt

def get_current_user(token: str = Depends(token_bearer), db: Session = Depends(get_db)):
    """Decode bearer token, determine the authenticated user, and raise 401 on failure."""
    try:
        # Decode JWT, extract the claim used as username; if not found, raise a HTTPException.
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    # Confirm the user exists in the database.
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

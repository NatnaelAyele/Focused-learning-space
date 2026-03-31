import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

DATABASE_URL = "sqlite:///./focus_learn.db"  # Using SQLite for simplicity; can be changed to other databases as needed
engine = create_engine(DATABASE_URL)
sessionlocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Provide a SQLAlchemy session for each request and afterwards close it safely."""
    db = sessionlocal()
    try:
        yield db
    finally:
        db.close()
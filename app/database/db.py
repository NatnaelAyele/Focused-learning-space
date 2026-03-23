from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./focus_learn.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
sessionlocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Provide a SQLAlchemy session for each request and afterwards close it safely."""
    db = sessionlocal()
    try:
        yield db
    finally:
        db.close()
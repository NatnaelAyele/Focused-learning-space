from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.models import User
from app.security.auth import get_current_user
from app.services.youtube_service import search_youtube
from app.services.github_service import search_github_repositories
from app.models.models import Playlist, User

router = APIRouter()

@router.get("/search/videos")
def search_videos(query: str):
    results = search_youtube(query)
    return {"videos": results}

@router.get("/search/repositories")
def search_repositories(query: str):
    results = search_github_repositories(query)
    return {"repositories": results}


@router.post("/playlists/new")
def create_playlist(name: str, category: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    existing_playlist = db.query(Playlist).filter(Playlist.user_id == current_user.id,Playlist.name == name).first()

    if existing_playlist:
        raise HTTPException(status_code=400, detail="Playlist already exists")

    playlist = Playlist(
        name=name,
        category=category,
        user_id=current_user.id
    )

    db.add(playlist)
    db.commit()
    db.refresh(playlist)

    return playlist

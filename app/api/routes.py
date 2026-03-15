from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.models import User
from app.security.auth import get_current_user
from app.services.youtube_service import search_youtube
from app.services.github_service import search_github_repositories
from app.models.models import Playlist, User, PlaylistRepo, PlaylistVideo
from pydantic import BaseModel

router = APIRouter()

class Videomodel(BaseModel):
    youtube_video_id: str
    title: str
    channel: str
    thumbnail: str

class RepoCreate(BaseModel):
    name: str
    owner: str
    repo_url: str
    description: str
    stars: int

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

@router.get("/playlists")
def get_playlists(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    playlists = db.query(Playlist).filter(Playlist.user_id == current_user.id).all()
    return playlists

@router.post("/playlists/{playlist_id}/videos")
def add_video_to_playlist(playlist_id: int, video: Videomodel, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not db.query(Playlist).filter(Playlist.id == playlist_id and Playlist.user_id == current_user.id).first():
        raise HTTPException(status_code=404, detail="Playlist not found")
    if db.query(PlaylistVideo).filter(PlaylistVideo.playlist_id == playlist_id and PlaylistVideo.youtube_video_id == video.youtube_video_id).first():
        return HTTPException(status_code=400, detail="Video already in playlist")
    
    playlist_video = PlaylistVideo(
        playlist_id=playlist_id,
        youtube_video_id=video.youtube_video_id,
        title=video.title,
        channel=video.channel,
        thumbnail=video.thumbnail
    )

    db.add(playlist_video)
    db.commit()
    db.refresh(playlist_video)
    return playlist_video


@router.post("/playlists/{playlist_id}/repositories")
def add_repo_to_playlist(playlist_id: int, repo: RepoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not db.query(Playlist).filter(Playlist.id == playlist_id and Playlist.user_id == current_user.id).first():
        raise HTTPException(status_code=404, detail="Playlist not found")
    if db.query(PlaylistRepo).filter(PlaylistRepo.playlist_id == playlist_id and PlaylistRepo.repo_url == repo.repo_url).first():
        return HTTPException(status_code=400, detail="Repository already in playlist")
    
    playlist_repo = PlaylistRepo(
        playlist_id=playlist_id,
        name=repo.name,
        owner=repo.owner,
        repo_url=repo.repo_url,
        description=repo.description
    )

    db.add(playlist_repo)
    db.commit()
    db.refresh(playlist_repo)
    return playlist_repo

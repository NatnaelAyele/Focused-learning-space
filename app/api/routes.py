from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.database.db import get_db
from app.security.auth import get_current_user
from app.services.youtube_service import search_youtube
from app.services.github_service import search_github_repositories
from app.models.models import Playlist, User, PlaylistRepo, PlaylistVideo, Category
from pydantic import BaseModel
from typing import List, Optional

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
    description: Optional[str] = "No description"
    stars: Optional[int] = 0

class PlaylistVideoResponse(BaseModel):
    id: int
    youtube_video_id: str
    title: str
    channel: str
    thumbnail: str
    class Config:
        from_attributes = True 
class PlaylistRepoResponse(BaseModel):
    id: int
    name: str
    owner: str
    repo_url: str
    description: Optional[str] = None
    stars: Optional[int] = 0
    class Config:
        from_attributes = True

class PlaylistDetailResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    videos: List[PlaylistVideoResponse] = []
    repos: List[PlaylistRepoResponse] = []
    class Config:
        from_attributes = True

class LibraryPlaylistResult(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    class Config:
        from_attributes = True

class LibraryVideoResult(BaseModel):
    id: int
    youtube_video_id: str
    title: str
    channel: Optional[str] = None
    thumbnail: Optional[str] = None
    playlist_id: int
    playlist_name: str
    playlist_category: Optional[str] = None

class LibraryRepoResult(BaseModel):
    id: int
    name: str
    owner: Optional[str] = None
    repo_url: str
    description: Optional[str] = None
    stars: Optional[int] = 0
    playlist_id: int
    playlist_name: str
    playlist_category: Optional[str] = None

class LibrarySearchResponse(BaseModel):
    playlists: List[LibraryPlaylistResult] = []
    videos: List[LibraryVideoResult] = []
    repos: List[LibraryRepoResult] = []

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

@router.get("/categories")
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    return categories

@router.get("/playlists/{playlist_id}", response_model=PlaylistDetailResponse)
def get_playlist_detail(playlist_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    return playlist

@router.get("/library/search", response_model=LibrarySearchResponse)
def search_library(query: str, category: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not query:
        return {"playlists": [], "videos": [], "repos": []}

    match = f"%{query}%"

    playlist_query = db.query(Playlist).filter(Playlist.user_id == current_user.id)
    if category:
        playlist_query = playlist_query.filter(Playlist.category == category)
    matching_playlists = playlist_query.filter(Playlist.name.ilike(match)).all()

    video_query = (
        db.query(PlaylistVideo, Playlist)
        .join(Playlist, PlaylistVideo.playlist_id == Playlist.id)
        .filter(Playlist.user_id == current_user.id)
    )
    if category:
        video_query = video_query.filter(Playlist.category == category)
    video_query = video_query.filter(PlaylistVideo.title.ilike(match))

    repo_query = (
        db.query(PlaylistRepo, Playlist)
        .join(Playlist, PlaylistRepo.playlist_id == Playlist.id)
        .filter(Playlist.user_id == current_user.id)
    )
    if category:
        repo_query = repo_query.filter(Playlist.category == category)
    repo_query = repo_query.filter(
        or_(
            PlaylistRepo.name.ilike(match),
            func.coalesce(PlaylistRepo.description, "").ilike(match)
        )
    )

    videos = []
    for video, playlist in video_query.all():
        videos.append({
            "id": video.id,
            "youtube_video_id": video.youtube_video_id,
            "title": video.title,
            "channel": video.channel,
            "thumbnail": video.thumbnail,
            "playlist_id": playlist.id,
            "playlist_name": playlist.name,
            "playlist_category": playlist.category
        })

    repos = []
    for repo, playlist in repo_query.all():
        repos.append({
            "id": repo.id,
            "name": repo.name,
            "owner": repo.owner,
            "repo_url": repo.repo_url,
            "description": repo.description,
            "stars": repo.stars,
            "playlist_id": playlist.id,
            "playlist_name": playlist.name,
            "playlist_category": playlist.category
        })

    return {
        "playlists": matching_playlists,
        "videos": videos,
        "repos": repos
    }
@router.post("/playlists/{playlist_id}/videos")
def add_video_to_playlist(playlist_id: int, video: Videomodel, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first():
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    if db.query(PlaylistVideo).filter(PlaylistVideo.playlist_id == playlist_id, PlaylistVideo.youtube_video_id == video.youtube_video_id).first():
        raise HTTPException(status_code=400, detail="Video already in playlist")
    
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
    if not db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first():
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    if db.query(PlaylistRepo).filter(PlaylistRepo.playlist_id == playlist_id, PlaylistRepo.repo_url == repo.repo_url).first():
        raise HTTPException(status_code=400, detail="Repository already in playlist")
    
    playlist_repo = PlaylistRepo(
        playlist_id=playlist_id,
        name=repo.name,
        owner=repo.owner,
        repo_url=repo.repo_url,
        description=repo.description,
        stars=repo.stars
    )

    db.add(playlist_repo)
    db.commit()
    db.refresh(playlist_repo)
    return playlist_repo


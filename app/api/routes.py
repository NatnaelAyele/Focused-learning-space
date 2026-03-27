from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.database.db import get_db
from app.security.auth import get_current_user
from app.services.youtube_service import search_youtube, ExternalServiceError as YouTubeServiceError
from app.services.github_service import search_github_repositories, ExternalServiceError as GitHubServiceError
from app.models.models import Playlist, User, PlaylistRepo, PlaylistVideo, Category
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


@router.get("/analytics/videos/categories")
def get_video_category_breakdown(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return a breakdown of saved videos grouped by playlist category for the authenticated user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    results = (
        db.query(Playlist.category, func.count(PlaylistVideo.id))
        .join(PlaylistVideo, Playlist.id == PlaylistVideo.playlist_id)
        .filter(Playlist.user_id == current_user.id)
        .group_by(Playlist.category)
        .all()
    )

    breakdown = []
    total_videos = 0
    for category, count in results:
        label = category if category else "Uncategorized"
        breakdown.append({"category": label, "count": count})
        total_videos += count

    return {"total_videos": total_videos, "by_category": breakdown}

class Videomodel(BaseModel):
    """Payload model used when saving a YouTube video into a playlist."""
    youtube_video_id: str
    title: str
    channel: str
    thumbnail: str

class RepoCreate(BaseModel):
    """Payload model used when saving a GitHub repository into a playlist."""
    name: str
    owner: str
    repo_url: str
    description: Optional[str] = "No description"
    stars: Optional[int] = 0

class PlaylistVideoResponse(BaseModel):
    """model for a video item returned as part of playlist details."""
    id: int
    youtube_video_id: str
    title: str
    channel: str
    thumbnail: str
    class Config:
        from_attributes = True 
class PlaylistRepoResponse(BaseModel):
    """model for a repository item returned as part of playlist details."""
    id: int
    name: str
    owner: str
    repo_url: str
    description: Optional[str] = None
    stars: Optional[int] = 0
    class Config:
        from_attributes = True

class PlaylistDetailResponse(BaseModel):
    """model for a playlist response with videos and repositories."""
    id: int
    name: str
    category: Optional[str] = None
    videos: List[PlaylistVideoResponse] = []
    repos: List[PlaylistRepoResponse] = []
    class Config:
        from_attributes = True

class LibraryPlaylistResult(BaseModel):
    """Playlist-level match result used by library search."""
    id: int
    name: str
    category: Optional[str] = None
    class Config:
        from_attributes = True

class LibraryVideoResult(BaseModel):
    """model for a video match returned as part of a playlist search along with its parent playlist metadata."""
    id: int
    youtube_video_id: str
    title: str
    channel: Optional[str] = None
    thumbnail: Optional[str] = None
    playlist_id: int
    playlist_name: str
    playlist_category: Optional[str] = None

class LibraryRepoResult(BaseModel):
    """model for a repository match returned as part of a playlist search along with its parent playlist metadata."""
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
    """a response model for playlist search results categorized into playlists, videos, and repositories."""
    playlists: List[LibraryPlaylistResult] = []
    videos: List[LibraryVideoResult] = []
    repos: List[LibraryRepoResult] = []

@router.get("/search/videos")
def search_videos(query: str):
    """endpoint to request videos from the youtube API based on a search parameter."""
    try:
        results = search_youtube(query)
        return {"videos": results}
    except YouTubeServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=503, detail="YouTube service unavailable.")

@router.get("/search/repositories")
def search_repositories(query: str):
    """endpoint to request repository information from the GitHub API based on a search parameter."""
    try:
        results = search_github_repositories(query)
        return {"repositories": results}
    except GitHubServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=503, detail="GitHub service unavailable.")


@router.post("/playlists/new")
def create_playlist(name: str, category: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new playlist for an authenticated userafter checking for duplicates."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # check if a playlist with the same name already exist in the database.
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
    """List all playlists owned by the authenticated user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    playlists = db.query(Playlist).filter(Playlist.user_id == current_user.id).all()
    return playlists


@router.get("/categories")
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List saved categories scoped to the authenticated user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    return categories

@router.get("/playlists/{playlist_id}", response_model=PlaylistDetailResponse)
def get_playlist_detail(playlist_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return a playlist with its related videos and repositories."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # filter only the playlist owned by the current user.
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    return playlist

@router.delete("/playlists/{playlist_id}")
def delete_playlist(playlist_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a playlist and its saved items for the authenticated user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    db.query(PlaylistVideo).filter(PlaylistVideo.playlist_id == playlist_id).delete(synchronize_session=False)
    db.query(PlaylistRepo).filter(PlaylistRepo.playlist_id == playlist_id).delete(synchronize_session=False)
    db.delete(playlist)
    db.commit()

    return {"message": "Playlist deleted"}

@router.get("/library/search", response_model=LibrarySearchResponse)
def search_library(query: str, category: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """search for playlists, videos, and repositories in the user's playlist based on a query string and an optional category filter."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not query:
        return {"playlists": [], "videos": [], "repos": []}

    # Build a reusable SQL wildcard.
    match = f"%{query}%"

    # find Playlist-name matches.
    playlist_query = db.query(Playlist).filter(Playlist.user_id == current_user.id)
    if category:
        playlist_query = playlist_query.filter(Playlist.category == category)
    matching_playlists = playlist_query.filter(Playlist.name.ilike(match)).all()

    # find Video-title matches.
    video_query = (
        db.query(PlaylistVideo, Playlist)
        .join(Playlist, PlaylistVideo.playlist_id == Playlist.id)
        .filter(Playlist.user_id == current_user.id)
    )
    if category:
        video_query = video_query.filter(Playlist.category == category)
    video_query = video_query.filter(PlaylistVideo.title.ilike(match))

    # find Repository name/description matches.
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

    # change video query results into API response format.
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

    # change repository query results into API response format.
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
    """Save a video into a playlist for an authenticated user if same video doesn't already exist in the same playlist."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    # check that the playlist belongs to current user.
    if not db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first():
        raise HTTPException(status_code=404, detail="Playlist not found")
    # Prevent duplicate video entries in the same playlist.
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

@router.delete("/playlists/{playlist_id}/videos/{video_id}")
def delete_playlist_video(playlist_id: int, video_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove a saved video from a playlist owned by the authenticated user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    video = db.query(PlaylistVideo).filter(PlaylistVideo.id == video_id, PlaylistVideo.playlist_id == playlist_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    db.delete(video)
    db.commit()

    return {"message": "Video removed"}


@router.post("/playlists/{playlist_id}/repositories")
def add_repo_to_playlist(playlist_id: int, repo: RepoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Save a repository into a playlist for an authenticated user if same repository doesn't already exist in the same playlist."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    # check that the playlist belongs to current user.
    if not db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first():
        raise HTTPException(status_code=404, detail="Playlist not found")
    # Prevent duplicate repository entries in the same playlist.
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

@router.delete("/playlists/{playlist_id}/repositories/{repo_id}")
def delete_playlist_repo(playlist_id: int, repo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove a saved repository from a playlist owned by the authenticated user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    repo = db.query(PlaylistRepo).filter(PlaylistRepo.id == repo_id, PlaylistRepo.playlist_id == playlist_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    db.delete(repo)
    db.commit()

    return {"message": "Repository removed"}


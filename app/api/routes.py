from fastapi import APIRouter
from app.services.youtube_service import search_youtube
from app.services.github_service import search_github_repositories

router = APIRouter()

@router.get("/search/videos")
def search_videos(query: str):
    results = search_youtube(query)
    return {"videos": results}

@router.get("/search/repositories")
def search_repositories(query: str):
    results = search_github_repositories(query)
    return {"repositories": results}

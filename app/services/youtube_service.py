import requests
import os
from dotenv import load_dotenv

load_dotenv()
youtube_api_key = os.getenv("YOUTUBE_API_KEY")
youtube_search_url = "https://www.googleapis.com/youtube/v3/search"

def search_youtube(query):
    """Search YouTube videos and get view-count statistics for each result."""
    videos = []
    # fetch first page of matching videos.
    parameters = {
        "part": "snippet",
        "q": query,
        "key": youtube_api_key,
        "maxResults": 50,
        "type": "video"}
    
    response1 = requests.get(youtube_search_url, params=parameters)
    data1 = response1.json()
    
    items = data1.get("items", [])
    
    # fetch one additional page where next page token is available.
    if "nextPageToken" in data1:
        parameters["pageToken"] = data1["nextPageToken"]
        response2 = requests.get(youtube_search_url, params=parameters)
        data2 = response2.json()
        items.extend(data2.get("items", [])) 

    video_ids = []
    # Collect video IDs to request statistics from the videos endpoint.
    for item in items:
        vid = item.get("id", {}).get("videoId")
        if vid:
            video_ids.append(vid)

    view_counts = {}
    stats_url = "https://www.googleapis.com/youtube/v3/videos"
    
    # Request statistics in batches as the youtube API only allows up to 50 IDs per call.
    for i in range(0, len(video_ids), 50):
        chunk = video_ids[i:i + 50]
        stats_params = {
            "part": "statistics", 
            "id": ",".join(chunk), 
            "key": youtube_api_key
        }
        stats_response = requests.get(stats_url, params=stats_params).json()
        
        for v in stats_response.get("items", []):
            view_counts[v["id"]] = int(v["statistics"].get("viewCount", 0))

    # Normalize API fields into frontend-friendly response structure.
    for item in items:
        snippet = item.get("snippet", {})
        video_id = item.get("id", {}).get("videoId", "")
        
        if video_id:
            video = {
                "title": snippet.get("title", "No Title"),
                "channel": snippet.get("channelTitle", "Unknown Channel"),
                "video_id": video_id,
                "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
                "date": snippet.get("publishedAt", ""),
                "views": view_counts.get(video_id, 0) 
            }
            videos.append(video)

    return videos
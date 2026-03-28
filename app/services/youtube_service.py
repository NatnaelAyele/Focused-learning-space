import os
import re
import requests
from dotenv import load_dotenv


class ExternalServiceError(Exception):
    """Raised when an external API request fails or returns invalid data."""
    pass

load_dotenv()
youtube_api_key = os.getenv("YOUTUBE_API_KEY")
youtube_search_url = "https://www.googleapis.com/youtube/v3/search"

def search_youtube(query):
    """Search YouTube videos and get view-count statistics for each result."""
    if not youtube_api_key:
        raise ExternalServiceError("YouTube API key is not configured.")

    videos = []
    # fetch first page of matching videos.
    parameters = {
        "part": "snippet",
        "q": query,
        "key": youtube_api_key,
        "maxResults": 50,
        "type": "video"}

    try:
        response1 = requests.get(youtube_search_url, params=parameters, timeout=10)
        response1.raise_for_status()
        data1 = response1.json()
    except (requests.RequestException, ValueError) as exc:
        raise ExternalServiceError("YouTube search request failed.") from exc
    
    items = data1.get("items", [])
    
    # fetch one additional page where next page token is available.
    if "nextPageToken" in data1:
        parameters["pageToken"] = data1["nextPageToken"]
        try:
            response2 = requests.get(youtube_search_url, params=parameters, timeout=10)
            response2.raise_for_status()
            data2 = response2.json()
            items.extend(data2.get("items", []))
        except (requests.RequestException, ValueError) as exc:
            raise ExternalServiceError("YouTube pagination request failed.") from exc

    video_ids = []
    # Collect video IDs to request statistics from the videos endpoint.
    for item in items:
        vid = item.get("id", {}).get("videoId")
        if vid:
            video_ids.append(vid)

    view_counts = {}
    durations = {}
    stats_url = "https://www.googleapis.com/youtube/v3/videos"
    
    # Request statistics in batches as the youtube API only allows up to 50 IDs per call.
    for i in range(0, len(video_ids), 50):
        chunk = video_ids[i:i + 50]
        stats_params = {
            "part": "statistics",
            "id": ",".join(chunk),
            "key": youtube_api_key
        }
        try:
            stats_response = requests.get(stats_url, params=stats_params, timeout=10)
            stats_response.raise_for_status()
            stats_data = stats_response.json()
        except (requests.RequestException, ValueError) as exc:
            raise ExternalServiceError("YouTube stats request failed.") from exc

        for v in stats_data.get("items", []):
            view_counts[v["id"]] = int(v["statistics"].get("viewCount", 0))

    def parse_iso8601_duration(duration):
        # Convert ISO 8601 durations like PT2M30S into total seconds.
        match = re.match(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$", duration or "")
        if not match:
            return 0
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        return hours * 3600 + minutes * 60 + seconds

    # Request content details to filter out short videos (< 2 minutes).
    for i in range(0, len(video_ids), 50):
        chunk = video_ids[i:i + 50]
        details_params = {
            "part": "contentDetails",
            "id": ",".join(chunk),
            "key": youtube_api_key
        }
        try:
            details_response = requests.get(stats_url, params=details_params, timeout=10)
            details_response.raise_for_status()
            details_data = details_response.json()
        except (requests.RequestException, ValueError) as exc:
            raise ExternalServiceError("YouTube content details request failed.") from exc

        for v in details_data.get("items", []):
            duration = v.get("contentDetails", {}).get("duration", "")
            durations[v["id"]] = parse_iso8601_duration(duration)

    # Normalize API fields into frontend-friendly response structure.
    for item in items:
        snippet = item.get("snippet", {})
        video_id = item.get("id", {}).get("videoId", "")
        
        if video_id and durations.get(video_id, 0) >= 120:
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
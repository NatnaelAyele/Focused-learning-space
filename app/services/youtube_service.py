import requests
import os
from dotenv import load_dotenv

load_dotenv()
youtube_api_key = os.getenv("YOUTUBE_API_KEY")
youtube_search_url = "https://www.googleapis.com/youtube/v3/search"

def search_youtube(query):
    videos = []
    parameters = {
        "part": "snippet",
        "q": query,
        "key": youtube_api_key,
        "maxResults": 50,
        "type": "video"}
    
    response1 = requests.get(youtube_search_url, params=parameters)
    data1 = response1.json()
    
    items = data1.get("items", [])
    
    if "nextPageToken" in data1:
        parameters["pageToken"] = data1["nextPageToken"]
        response2 = requests.get(youtube_search_url, params=parameters)
        data2 = response2.json()
        items.extend(data2.get("items", [])) 

    for item in items:
        snippet = item.get("snippet", {})
        video = {
            "title": snippet.get("title", "No Title"),
            "channel": snippet.get("channelTitle", "Unknown Channel"),
            "video_id": item.get("id", {}).get("videoId", ""),
            "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url", "")
        }
        if video["video_id"]:
            videos.append(video)

    return videos
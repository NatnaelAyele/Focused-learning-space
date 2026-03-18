import requests
import os
from dotenv import load_dotenv

load_dotenv()
youtube_api_key = os.getenv("YOUTUBE_API_KEY")
youtube_search_url = "https://www.googleapis.com/youtube/v3/search"

def search_youtube(query):
    paramaters = {
        "part": "snippet",
        "q": query,
        "key": youtube_api_key,
        "maxResults": 50,
        "type": "video"}
    
    response = requests.get(youtube_search_url, params=paramaters)
    data = response.json()

    videos = []

    for item in data.get("items", []):
        video = {
            "title": item["snippet"]["title"],
            "channel": item["snippet"]["channelTitle"],
            "video_id": item["id"]["videoId"],
            "thumbnail": item["snippet"]["thumbnails"]["medium"]["url"]
        }
        videos.append(video)

    return videos
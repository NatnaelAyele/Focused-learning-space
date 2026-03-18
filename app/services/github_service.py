import requests
import os
from dotenv import load_dotenv
load_dotenv()

github_token = os.getenv("Github_Token")
github_search_url = "https://api.github.com/search/repositories"
if github_token:
    headers = {"Authorization": f"token {github_token}"}
else:
    headers = {}

def search_github_repositories(query):
    parameters = {
        "q": query,
        "sort": "stars",
        "order": "desc",
        "per_page": 50
    }
    
    response = requests.get(github_search_url, params=parameters, headers=headers)
    data = response.json()

    repositories = []

    for item in data.get("items", []):
        repo = {
            "name": item["name"],
            "owner": item["owner"]["login"],
            "stars": item["stargazers_count"],
            "repo_url": item["html_url"],
            "description": item["description"]
        }
        repositories.append(repo)

    return repositories
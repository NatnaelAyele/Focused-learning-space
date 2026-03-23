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
    """Search GitHub repositories and return a list of the results for the frontend."""

    parameters = {
        "q": query,
        "sort": "stars",
        "order": "desc",
        "per_page": 100
    }
    
    response = requests.get(github_search_url, params=parameters, headers=headers)
    data = response.json()

    repositories = []

    # minimize the GitHub API response into a the minimal set of fields required.
    for item in data.get("items", []):
        repo = {
            "name": item["name"],
            "owner": item["owner"]["login"],
            "stars": item["stargazers_count"],
            "forks": item["forks_count"],
            "updated": item["updated_at"],
            "repo_url": item["html_url"],
            "description": item["description"]
        }
        repositories.append(repo)

    return repositories
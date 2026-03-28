# Focus Time

A focused learning companion that lets you search YouTube videos and GitHub repositories, then save items into playlists with analytics.

## Features
- Search YouTube videos and GitHub repositories by topic.
- YouTube results avoid Shorts by excluding videos under 2 minutes.
- Save items into playlists with categories.
- Analytics dashboard for saved videos by category.
- Authentication (register/login) with JWT.

## Tech Stack
- Backend: FastAPI, SQLAlchemy, PostgreSQL, Uvicorn
- Frontend: HTML, CSS, JavaScript
- Charts: Chart.js

## Prerequisites
- Python 3.10+ recommended
- PostgreSQL database
- YouTube Data API key and (optional) GitHub token

## Environment Variables
Create a .env file in the project root (it is already gitignored) with:

```
YOUTUBE_API_KEY=your_youtube_api_key
Github_Token=your_github_token_optional
Secret_Key=your_jwt_secret
DATABASE_URL=postgresql://user:password@host:port/dbname
```

Notes:
- Github_Token is optional but increases GitHub API rate limits.
- Secret_Key should be a long, random string for JWT signing.

## Install Dependencies
From the project root:

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Run the Backend (API)
```
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:
- http://127.0.0.1:8000/api/health

FastAPI docs:
- http://127.0.0.1:8000/docs

## Run the Frontend
The frontend is static and lives in frontend/index.html.

Option 1: Use a simple static server from the project root:
```
python -m http.server 5173
```
Then open:
- http://127.0.0.1:5173/frontend/index.html

Option 2: Open frontend/index.html directly in a browser.

Important: The frontend uses API_BASE_URL = "/api". If your frontend is not served from the same origin as the backend, update frontend/js/config.js to point to the full backend URL, for example:

```
const API_BASE_URL = "http://127.0.0.1:8000/api";
```

## Deployment Notes
- Set the same environment variables on your host (DATABASE_URL, YOUTUBE_API_KEY, Secret_Key, and optional Github_Token).
- Run the API with a production server (for example, Uvicorn behind a process manager).
- Serve frontend/index.html from the same domain or configure CORS and API_BASE_URL accordingly.

## Deployment and Load Balancer Configuration

This application can be deployed using a multi-server architecture with two application servers and one load balancer to ensure high availability, scalability, and proper separation of concerns.

### Architecture Overview
- App servers: Each server runs a full instance of the application (frontend + FastAPI backend).
- Load balancer: HAProxy distributes incoming traffic between app servers.
- Database: PostgreSQL is hosted on one node and accessed remotely by the others.

### Backend Deployment (Web-01 and Web-02)

1. Project setup
   - Copy the full application (frontend + backend) to both servers (with scp).
   - Create a Python virtual environment on each server:

     ```bash
     python3 -m venv venv
     source venv/bin/activate
     pip install -r requirements.txt
     ```

2. Database configuration
   - PostgreSQL is used to allow shared access across servers.
  - Configured the backend (db.py to be specific) with a shared PostgreSQL URL:

     ```python
    DATABASE_URL = "postgresql://<db_user>:<db_password>@<db_host>:5432/<db_name>"
     ```

  - PostgreSQL was configured to accept remote connections from the other app servers.

3. Running the backend
   - Serve the FastAPI app using Gunicorn with Uvicorn workers:

     ```bash
     gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 127.0.0.1:8000
     ```

4. Process management
  - A systemd service keeps the backend running and restarts it automatically:

     ```ini
     [Unit]
     Description=FastAPI Service
     After=network.target

     [Service]
    User=<app_user>
    WorkingDirectory=/path/to/Focus-time
    Environment="PATH=/path/to/Focus-time/venv/bin"
    ExecStart=/path/to/Focus-time/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 127.0.0.1:8000
     Restart=always

     [Install]
     WantedBy=multi-user.target
     ```

### Frontend and Reverse Proxy (Nginx)

Nginx was configured on both Web-01 and Web-02 to serve the frontend and proxy API requests to the backend.

```nginx
server {
    listen 80;
    server_name <your_domain>;

    root /path/to/Focus-time/frontend;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Key points:
- Static frontend files are served directly by Nginx.
- Requests to /api/ are proxied to the local FastAPI backend.
- The frontend uses:

  ```javascript
  const API_BASE_URL = "/api";
  ```

- FastAPI uses:

  ```python
  app = FastAPI(root_path="/api")
  ```

  This ensures correct routing behind the reverse proxy.

### Load Balancer Configuration (HAProxy on lb-01)

HAProxy distributes traffic between app servers using round-robin.

```haproxy
frontend http_in
    bind *:80
    bind *:443 ssl crt /path/to/ssl/cert.pem
    mode http

    redirect scheme https if !{ ssl_fc }
    default_backend web_servers

backend web_servers
    mode http
    balance roundrobin
    option forwardfor

    server web01 <APP_SERVER_1_IP>:80 check
    server web02 <APP_SERVER_2_IP>:80 check
```

Key points:
- SSL termination happens at the load balancer.
- Round-robin load balancing distributes requests evenly.
- Health checks ensure only healthy servers receive traffic.
- option forwardfor preserves the original client IP.

### End-to-End Request Flow

1. A client sends a request to the load balancer via HTTP or HTTPS.
2. HAProxy forwards the request to one of the app servers.
3. Nginx on the selected server:
   - Serves static frontend files for /
   - Proxies /api/ requests to the local FastAPI backend
4. The backend processes the request and interacts with the shared PostgreSQL database.
5. The response is returned through Nginx to HAProxy and back to the client.

### Summary

This deployment ensures:
- High availability through multiple application servers
- Consistent data using a centralized PostgreSQL database
- Efficient request routing via HAProxy
- Clean separation of concerns between frontend, backend, and load balancing

## APIs Used and Attribution
- YouTube Data API v3
  - Docs: https://developers.google.com/youtube/v3/docs/search/list
  - Used for: video search and statistics.
  - Credit: Google / YouTube Developers.

- GitHub REST API (Search Repositories)
  - Docs: https://docs.github.com/en/rest/search/search?apiVersion=2022-11-28#search-repositories
  - Used for: repository search.
  - Credit: GitHub.

## Libraries and Resources
- FastAPI: https://fastapi.tiangolo.com/
- SQLAlchemy: https://www.sqlalchemy.org/
- Uvicorn: https://www.uvicorn.org/
- Chart.js: https://www.chartjs.org/
- python-jose (JWT): https://python-jose.readthedocs.io/
- passlib (bcrypt): https://passlib.readthedocs.io/
- Requests: https://requests.readthedocs.io/

## Project Structure
```
app/           # FastAPI backend
frontend/      # Static frontend
requirements.txt
```

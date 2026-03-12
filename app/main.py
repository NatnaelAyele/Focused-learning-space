from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def check_health():
    return {"message": "Health check passed!"}
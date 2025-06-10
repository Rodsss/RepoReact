# minimal_test.py
from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
async def read_root():
    # This returns a simple HTML string directly.
    # It does NOT use templates or static files.
    return "<html><body><h1>Server is Running!</h1></body></html>"
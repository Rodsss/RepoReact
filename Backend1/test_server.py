# test_server.py (Corrected Version)

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()

# This line creates the "/static" route and links it to the folder named "static".
# This is what allows url_for('static', ...) to work.
app.mount("/static", StaticFiles(directory="static"), name="static")

# This tells FastAPI where your HTML templates are.
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_test_page(request: Request):
    try:
        # Now, this template rendering will succeed.
        return templates.TemplateResponse("base.html", {"request": request})
    except Exception as e:
        return HTMLResponse(content=f"<h1>Error rendering template</h1><p>{e}</p>", status_code=500)
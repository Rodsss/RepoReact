# final_test.py (Direct Access Test)

import os
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_path = os.path.join(BASE_DIR, "static")

app = FastAPI()

# This is the line we are testing. Is it successfully creating a route at /static?
app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_direct_test_page():
    # This HTML tries to load the CSS file directly, without using url_for.
    # This isolates the test to the app.mount functionality.
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Direct Static File Test</title>
        <link rel="stylesheet" href="/static/css/main_style.css">
        <style>
            body { border: 5px solid red; } /* This style is inline */
        </style>
    </head>
    <body>
        <h1>Direct Access Test</h1>
        <p>This page has a red border from an inline style.</p>
        <p>Open the browser's Developer Tools (F12), go to the "Network" tab, and reload the page.</p>
        <p>Check if the request for <strong>main_style.css</strong> was successful (Status 200) or failed (Status 404).</p>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
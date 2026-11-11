from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
import secrets
import string
from pydantic import BaseModel

app = FastAPI()

class URLRequest(BaseModel):
    url: str

def generate_short_code():
    characters = string.digits
    code = ''.join(secrets.choice(characters) for _ in range(6))
    return code

url_store: dict[str, str] = {}

@app.post('/shorten')
def shorten_url(request: URLRequest):
    short_code = generate_short_code()
    url_store[short_code] = request.url
    return {"short_url": f"http://localhost:8000/{short_code}"}

@app.get('/{short_code}')
def get_url(short_code: str):
    if short_code in url_store:
        return RedirectResponse(url=url_store[short_code])
    else:
        raise HTTPException(status_code=404, detail="URL not found.")
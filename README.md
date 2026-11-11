# FastShort — Minimalist FastAPI URL Shortener

A lightweight, zero-database URL shortener built with **FastAPI**, **HTML**, **Tailwind CSS**, and the standard **Fetch API**.

Instead of relying on an external database, `FastShort` stores mappings in an in-memory Python dictionary (`url_store: dict[str, str] = {}`) and generates cryptographically random 6-digit numeric short codes using Python's `secrets` module.

---

## Features

- **In-Memory Storage (`url_store`)**: Zero database setup or ORM overhead—ideal for lightweight local usage, learning FastAPI, or ephemeral link sharing.
- **Cryptographically Random 6-Digit Codes**: Uses `secrets.choice(string.digits)` to generate 6-digit numeric short codes (e.g., `http://localhost:8000/482910`).
- **Standard Fetch API Integration**: Connects the frontend directly to `POST /shorten` and `GET /{short_code}` using native browser `fetch()`.
- **Midnight Terminal UI**: Minimalist dark-slate interface with URL validation, one-click clipboard copy, live session store filtering, and a `307 Temporary Redirect` lookup tester.

---

## Architecture & API Endpoints

### 1. `POST /shorten`
Accepts a JSON payload containing the destination URL, generates a 6-digit short code, stores it in `url_store`, and returns the shortened URL.

**Request:**
```http
POST /shorten HTTP/1.1
Content-Type: application/json

{
  "url": "https://fastapi.tiangolo.com/tutorial/first-steps/"
}
```

**Response (`200 OK`):**
```json
{
  "short_url": "http://localhost:8000/482910"
}
```

### 2. `GET /{short_code}`
Looks up `short_code` in `url_store`.
- **Found**: Returns an HTTP `307 Temporary Redirect` (`RedirectResponse`) to the original URL.
- **Not Found**: Raises an HTTP `404 Not Found` (`{"detail": "URL not found."}`).

---

## Backend Implementation (`main.py`)

To allow your browser frontend to call `http://localhost:8000/shorten` via the Fetch API without Cross-Origin Resource Sharing (CORS) errors, enable `CORSMiddleware` in `main.py`:

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import secrets
import string
from pydantic import BaseModel

app = FastAPI(title="FastShort URL Shortener")

# Enable CORS so the frontend Fetch API can communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLRequest(BaseModel):
    url: str

def generate_short_code() -> str:
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
```

---

## Frontend Fetch API Integration

The frontend communicates with the FastAPI backend using standard `fetch()`:

```javascript
async function shortenUrl(longUrl) {
  const response = await fetch('http://localhost:8000/shorten', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: longUrl }),
  });

  if (!response.ok) {
    throw new Error('Failed to shorten URL');
  }

  const data = await response.json();
  return data.short_url; // e.g. "http://localhost:8000/482910"
}
```

---

## Getting Started

### 1. Run the FastAPI Backend
Install FastAPI and Uvicorn, then start the server on port `8000`:

```bash
pip install fastapi uvicorn pydantic
uvicorn main:app --reload --port 8000
```

Your FastAPI backend will be live at `http://localhost:8000` (interactive Swagger docs at `http://localhost:8000/docs`).

### 2. Run the Frontend Workspace
Install Node dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. Use the **Fetch Target Endpoint** toggle in the top card to switch between:
- **Same-Origin (`/shorten`)** — Uses the built-in preview mirror of `url_store`.
- **`http://localhost:8000`** — Sends `fetch()` requests directly to your running local FastAPI server.

---

## Running Unit Tests

Core URL validation, 6-digit code generation, and short-code extraction logic are unit-tested using Node's native test runner:

```bash
npx tsx --test src/utils/shortener.test.ts
```

---

## License

Apache-2.0

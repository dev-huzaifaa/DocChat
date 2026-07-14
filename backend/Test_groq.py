import os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

api_key = os.getenv("GROQ_API_KEY", "").strip()
if not api_key:
    raise RuntimeError("GROQ_API_KEY is missing. Add it to backend/.env or your environment.")

client = OpenAI(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1",
)

try:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Say hello in one sentence."}],
    )
    print(response.choices[0].message.content)
except Exception as exc:
    raise RuntimeError(f"Groq request failed: {exc}") from exc
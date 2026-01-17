import os
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai


TOKEN_COMPANY_API_KEY = os.environ.get("TOKEN_COMPANY_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")


app = FastAPI()


class EMSRequest(BaseModel):
    call_text: str
    aggressiveness: Optional[float] = 0.5


class EMSReportResponse(BaseModel):
    compressed_text: str
    ai_response: str


def compress_text_with_token_company(text: str, aggressiveness: float) -> str:
    if not TOKEN_COMPANY_API_KEY:
        raise HTTPException(status_code=500, detail="TOKEN_COMPANY_API_KEY is not configured")

    url = "https://api.thetokencompany.com/v1/compress"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN_COMPANY_API_KEY}",
    }
    payload = {
        "model": "bear-1",
        "compression_settings": {
            "aggressiveness": 0.5,
            "max_output_tokens": None,
            "min_output_tokens": None,
        },
        "input": text,
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Error calling compression service") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Compression service returned an error")

    data = response.json()
    output = data.get("output")
    if not isinstance(output, str):
        raise HTTPException(status_code=502, detail="Invalid response from compression service")

    return output


def generate_ems_report_with_gemini(compressed_text: str) -> str:
    if not GEMINI_API_KEY and not os.environ.get("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    client = genai.Client()

    prompt = (
        "You are assisting Emergency Medical Services (EMS). "
        "You are given compressed text from a 911 call describing a scene. "
        "Generate a concise, structured scene report for EMS responders. "
        "Keep it focused, factual, and free of speculation. "
        "Include at least these sections with short bullet-style lines:\n"
        "- Chief complaint / reason for call\n"
        "- Patient(s) details (age, sex, key conditions)\n"
        "- Scene safety issues and hazards\n"
        "- Mechanism of injury or illness details\n"
        "- Pertinent history and medications mentioned\n"
        "- Dispatch information (location, caller relationship if known, timing)\n"
        "- Any instructions already given to caller\n"
        "Use clear, concise language that can be quickly read on scene.\n\n"
        f"Compressed 911 call text:\n{compressed_text}"
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Error calling Gemini API") from exc

    text = getattr(response, "text", None)
    if callable(text):
        text = response.text()

    if not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=502, detail="Invalid response from Gemini API")

    return text


@app.post("/ems/report", response_model=EMSReportResponse)
def create_ems_report(payload: EMSRequest) -> EMSReportResponse:
    if not payload.call_text or not payload.call_text.strip():
        raise HTTPException(status_code=400, detail="call_text is required")

    aggressiveness = payload.aggressiveness if payload.aggressiveness is not None else 0.5
    if not 0.0 <= aggressiveness <= 1.0:
        raise HTTPException(status_code=400, detail="aggressiveness must be between 0.0 and 1.0")

    compressed_text = compress_text_with_token_company(payload.call_text, aggressiveness)
    report = generate_ems_report_with_gemini(compressed_text)

    return EMSReportResponse(compressed_text=compressed_text, ai_response=report)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("voice:app", host="0.0.0.0", port=8000, reload=True)

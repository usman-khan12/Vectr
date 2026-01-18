import base64
import os
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel


TOKEN_COMPANY_API_KEY = os.environ.get("TOKEN_COMPANY_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
WISPR_API_KEY = os.environ.get("WISPR_API_KEY")
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get(
    "VITE_GOOGLE_MAPS_API_KEY"
)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class EMSRequest(BaseModel):
    call_text: str
    aggressiveness: Optional[float] = 0.5


class EMSReportResponse(BaseModel):
    compressed_text: str
    ai_response: str


class EMSIntakeRequest(BaseModel):
    audio_base64: str
    aggressiveness: Optional[float] = 0.5


class EMSIntakeResponse(BaseModel):
    transcription: str
    compressed_text: str
    ai_response: str


class SceneAnalysisRequest(BaseModel):
    lat: float
    lng: float
    address: str


class SceneAnalysisResponse(BaseModel):
    analysis: str


def compress_text_with_token_company(text: str, aggressiveness: float) -> str:
    if not TOKEN_COMPANY_API_KEY:
        raise HTTPException(
            status_code=500, detail="TOKEN_COMPANY_API_KEY is not configured"
        )

    url = "https://api.thetokencompany.com/v1/compress"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN_COMPANY_API_KEY}",
    }
    payload = {
        "model": "bear-1",
        "compression_settings": {
            "aggressiveness": aggressiveness,
            "max_output_tokens": None,
            "min_output_tokens": None,
        },
        "input": text,
    }

    try:
        response = requests.post(url, headers=headers,
                                 json=payload, timeout=30)
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502, detail="Error calling compression service"
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=502, detail="Compression service returned an error"
        )

    data = response.json()
    output = data.get("output")
    if not isinstance(output, str):
        raise HTTPException(
            status_code=502, detail="Invalid response from compression service"
        )

    return output


def generate_ems_report_with_gemini(compressed_text: str) -> str:
    if not GEMINI_API_KEY and not os.environ.get("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=500, detail="GEMINI_API_KEY is not configured"
        )

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
        raise HTTPException(
            status_code=502, detail="Error calling Gemini API") from exc

    text = getattr(response, "text", None)
    if callable(text):
        text = response.text()

    if not isinstance(text, str) or not text.strip():
        raise HTTPException(
            status_code=502, detail="Invalid response from Gemini API"
        )

    return text


def transcribe_with_wispr(audio_base64: str) -> str:
    if not WISPR_API_KEY:
        raise HTTPException(
            status_code=500, detail="WISPR_API_KEY is not configured"
        )

    url = "https://api.wisprflow.ai/api"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {WISPR_API_KEY}",
    }
    payload = {
        "audio": audio_base64,
        "language": ["en"],
        "context": {
            "app": {
                "name": "Vectr Dispatch",
                "type": "other",
            }
        },
    }

    try:
        response = requests.post(url, headers=headers,
                                 json=payload, timeout=60)
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502, detail="Error calling Wispr API") from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=502, detail="Wispr API returned an error"
        )

    data = response.json()
    text = data.get("text")
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(
            status_code=502, detail="Invalid response from Wispr API"
        )

    return text


def fetch_static_satellite_image(lat: float, lng: float) -> bytes:
    api_key = GOOGLE_MAPS_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=500, detail="GOOGLE_MAPS_API_KEY is not configured"
        )
    url = (
        "https://maps.googleapis.com/maps/api/staticmap"
        f"?center={lat},{lng}&zoom=19&size=640x640&maptype=satellite&key={api_key}"
    )
    try:
        response = requests.get(url, timeout=30)
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502, detail="Error fetching static map image"
        ) from exc
    if response.status_code != 200:
        raise HTTPException(
            status_code=502, detail="Failed to fetch static map image"
        )
    return response.content


def analyze_scene_with_gemini(
    address: str, lat: float, lng: float, image_bytes: bytes
) -> str:
    if not GEMINI_API_KEY and not os.environ.get("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=500, detail="GEMINI_API_KEY is not configured"
        )
    client = genai.Client()
    prompt = (
        "You are helping Emergency Medical Services (EMS). "
        f"Address: {address}. "
        f"Coordinates: {lat}, {lng}. "
        "Analyze this satellite image and identify:\n"
        "- Best approach route for emergency vehicles\n"
        "- Parking locations for ambulances and fire apparatus\n"
        "- Potential hazards that could affect access or safety\n"
        "- Likely building access points and entrances\n"
        "- Yard or driveway obstacles that may slow access\n"
        "Respond with concise, tactical bullet-style guidance."
    )
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    contents = [
        {
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": "image/png",
                        "data": image_b64,
                    }
                },
            ]
        }
    ]
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=contents,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail="Error calling Gemini API") from exc
    text = getattr(response, "text", None)
    if callable(text):
        text = response.text()
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(
            status_code=502, detail="Invalid response from Gemini API"
        )
    return text


@app.post("/ems/report", response_model=EMSReportResponse)
def create_ems_report(payload: EMSRequest) -> EMSReportResponse:
    if not payload.call_text or not payload.call_text.strip():
        raise HTTPException(status_code=400, detail="call_text is required")

    aggressiveness = payload.aggressiveness if payload.aggressiveness is not None else 0.5
    if not 0.0 <= aggressiveness <= 1.0:
        raise HTTPException(
            status_code=400,
            detail="aggressiveness must be between 0.0 and 1.0",
        )

    compressed_text = compress_text_with_token_company(
        payload.call_text, aggressiveness
    )
    report = generate_ems_report_with_gemini(compressed_text)

    return EMSReportResponse(compressed_text=compressed_text, ai_response=report)


@app.post("/ems/intake", response_model=EMSIntakeResponse)
def create_ems_report_from_audio(payload: EMSIntakeRequest) -> EMSIntakeResponse:
    if not payload.audio_base64 or not payload.audio_base64.strip():
        raise HTTPException(status_code=400, detail="audio_base64 is required")

    transcription = transcribe_with_wispr(payload.audio_base64)

    aggressiveness = payload.aggressiveness if payload.aggressiveness is not None else 0.5
    if not 0.0 <= aggressiveness <= 1.0:
        raise HTTPException(
            status_code=400,
            detail="aggressiveness must be between 0.0 and 1.0",
        )

    compressed_text = compress_text_with_token_company(
        transcription, aggressiveness)
    report = generate_ems_report_with_gemini(compressed_text)

    return EMSIntakeResponse(
        transcription=transcription,
        compressed_text=compressed_text,
        ai_response=report,
    )


@app.post("/ems/scene-analysis", response_model=SceneAnalysisResponse)
def analyze_scene(payload: SceneAnalysisRequest) -> SceneAnalysisResponse:
    image_bytes = fetch_static_satellite_image(payload.lat, payload.lng)
    analysis = analyze_scene_with_gemini(
        payload.address, payload.lat, payload.lng, image_bytes
    )
    return SceneAnalysisResponse(analysis=analysis)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("voice:app", host="0.0.0.0", port=8000, reload=True)

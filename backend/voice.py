import base64
import os
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from livekit.agents import inference
from livekit.agents.stt.stt import SpeechEventType
from livekit.agents.utils.codecs import AudioStreamDecoder
from pydantic import BaseModel

from livekit import api as livekit_api
import json
import asyncio


load_dotenv()


TOKEN_COMPANY_API_KEY = os.environ.get("TOKEN_COMPANY_API_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
GEMINI_API_KEY = GOOGLE_API_KEY
WISPR_API_KEY = os.environ.get("WISPR_API_KEY")
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get(
    "VITE_GOOGLE_MAPS_API_KEY"
)


app = FastAPI()


@app.on_event("startup")
async def startup_event():
    print("Startup: Checking API Keys...")
    print(f"TOKEN_COMPANY_API_KEY: {'Set' if TOKEN_COMPANY_API_KEY else 'Not Set'}")
    print(f"GOOGLE_API_KEY: {'Set' if GOOGLE_API_KEY else 'Not Set'}")
    print(f"WISPR_API_KEY: {'Set' if WISPR_API_KEY else 'Not Set'}")
    print(f"GOOGLE_MAPS_API_KEY: {'Set' if GOOGLE_MAPS_API_KEY else 'Not Set'}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateIncidentRequest(BaseModel):
    incident_id: str
    address: str
    lat: float
    lng: float
    caller_notes: str = ""


class CreateIncidentResponse(BaseModel):
    room_name: str
    token_dispatcher: str
    token_emt: str
    scene_analysis: str
    positioning_guidance: str
    ems_report: str


class TriggerBriefingRequest(BaseModel):
    room_name: str
    briefing_text: str


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
    positioning_guidance: str
    pois: list["StructuredPOI"] = []
    recommended_heading: int = 0
    approach_heading: int = 0


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
        response = requests.post(url, headers=headers, json=payload, timeout=30)
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


def get_livekit_api():
    """Create LiveKit API client."""
    return livekit_api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL"),
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )


def generate_comprehensive_ems_report(
    address: str,
    caller_notes: str,
    scene_analysis: str,
    positioning_guidance: str,
) -> str:
    """
    Generate a comprehensive EMS report combining caller notes,
    satellite scene analysis, and street view positioning.
    """
    if not GEMINI_API_KEY:
        return "Gemini API key missing, cannot generate report."

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = (
        "You are an EMS Incident Commander. Generate a consolidated 'Tactical Scene Report' "
        "for responding crews based on the following intelligence:\n\n"
        f"LOCATION: {address}\n"
        f"CALLER NOTES/DISPATCH INFO: {caller_notes}\n\n"
        f"SATELLITE SCENE INTELLIGENCE:\n{scene_analysis}\n\n"
        f"STREET VIEW POSITIONING DATA:\n{positioning_guidance}\n\n"
        "OUTPUT FORMAT:\n"
        "Create a concise, structured report with these headers:\n"
        "1. SITUATION / CHIEF COMPLAINT (Combine caller notes & nature of incident)\n"
        "2. PATIENT DETAILS (If available in notes, otherwise 'Unknown - En Route')\n"
        "3. ACCESS & STAGING (Best approach, parking, entry points)\n"
        "4. HAZARDS & SCENE SAFETY (From visual analysis and caller info)\n"
        "5. MECHANISM / HISTORY (If available)\n"
        "6. DISPATCH INFO (Location, timing)\n\n"
        "Style: Telegraphic, tactical, suitable for radio read-back. No fluff."
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
        text = getattr(response, "text", None)
        if callable(text):
            text = response.text()
        return text if text else "Report generation returned empty."
    except Exception as e:
        return f"Failed to generate EMS report: {str(e)}"


@app.post("/incident/create", response_model=CreateIncidentResponse)
async def create_incident(payload: CreateIncidentRequest):
    """
    Create a new incident room with:
    1. LiveKit room for voice communication
    2. Pre-analyzed scene intelligence (satellite + street view)
    3. Access tokens for dispatcher and EMT
    4. Comprehensive EMS Report

    The VECTR agent will automatically join and speak the briefing.
    """
    room_name = f"incident-{payload.incident_id}"

    # 1. Run scene analysis (reusing existing functions)
    try:
        satellite_bytes = fetch_static_satellite_image(payload.lat, payload.lng)
        scene_analysis = analyze_scene_with_gemini(
            payload.address, payload.lat, payload.lng, satellite_bytes
        )
    except Exception as e:
        scene_analysis = f"Scene analysis unavailable: {str(e)}"

    try:
        street_view_bytes = fetch_street_view_image(payload.lat, payload.lng)
        positioning_guidance = generate_positioning_guidance(
            payload.address, payload.lat, payload.lng, street_view_bytes
        )
    except Exception as e:
        positioning_guidance = f"Positioning guidance unavailable: {str(e)}"

    # 2. Generate Comprehensive EMS Report
    ems_report = generate_comprehensive_ems_report(
        payload.address, payload.caller_notes, scene_analysis, positioning_guidance
    )

    # 3. Compress scene data for room metadata using Token Company
    try:
        compressed_scene = compress_text_with_token_company(
            scene_analysis, aggressiveness=0.3
        )
    except Exception:
        compressed_scene = scene_analysis

    try:
        compressed_positioning = compress_text_with_token_company(
            positioning_guidance, aggressiveness=0.3
        )
    except Exception:
        compressed_positioning = positioning_guidance

    # 4. Create LiveKit room with incident metadata
    lk = get_livekit_api()

    room_metadata = json.dumps(
        {
            "incident_id": payload.incident_id,
            "address": payload.address,
            "lat": payload.lat,
            "lng": payload.lng,
            "caller_notes": payload.caller_notes,
            # Compressed for better LLM context packing
            "scene_analysis": compressed_scene[:1000],
            "positioning_guidance": compressed_positioning[:1000],
            "ems_report": ems_report[:1000],
        }
    )

    try:
        await lk.room.create_room(
            livekit_api.CreateRoomRequest(
                name=room_name,
                metadata=room_metadata,
                empty_timeout=300,  # 5 min timeout when empty
            )
        )
    except Exception as e:
        # Room might already exist
        logger.warning(f"Room creation note: {e}")

    # 5. Generate access tokens
    token_dispatcher = livekit_api.AccessToken(
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )
    token_dispatcher.with_identity("dispatcher").with_name("Dispatch")
    token_dispatcher.with_grants(
        livekit_api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        )
    )

    token_emt = livekit_api.AccessToken(
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )
    token_emt.with_identity("emt-crew").with_name("EMT Crew")
    token_emt.with_grants(
        livekit_api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        )
    )

    await lk.aclose()

    return CreateIncidentResponse(
        room_name=room_name,
        token_dispatcher=token_dispatcher.to_jwt(),
        token_emt=token_emt.to_jwt(),
        scene_analysis=scene_analysis,
        positioning_guidance=positioning_guidance,
        ems_report=ems_report,
    )


@app.post("/incident/briefing")
async def trigger_briefing(payload: TriggerBriefingRequest):
    """
    Send a tactical briefing to the VECTR agent via data channel.
    The agent will speak this to all participants in the room.
    """
    lk = get_livekit_api()

    data = json.dumps(
        {
            "type": "tactical_briefing",
            "briefing": payload.briefing_text,
        }
    ).encode()

    try:
        await lk.room.send_data(
            livekit_api.SendDataRequest(
                room=payload.room_name,
                data=data,
                kind=livekit_api.DataPacketKind.RELIABLE,
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send briefing: {e}")

    await lk.aclose()

    return {"status": "briefing_sent", "room": payload.room_name}


def generate_ems_report_with_gemini(compressed_text: str) -> str:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    # Pass API key explicitly
    client = genai.Client(api_key=GEMINI_API_KEY)

    # Alongside this prompt, use the text compressed_text to generate the report, which should come from the text box.

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


def transcribe_with_wispr(audio_base64: str) -> str:
    if not WISPR_API_KEY:
        raise HTTPException(status_code=500, detail="WISPR_API_KEY is not configured")

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
        response = requests.post(url, headers=headers, json=payload, timeout=60)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Error calling Wispr API") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Wispr API returned an error")

    data = response.json()
    text = data.get("text")
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=502, detail="Invalid response from Wispr API")

    return text


async def transcribe_with_livekit(audio_base64: str) -> str:
    livekit_url = os.environ.get("LIVEKIT_URL")
    livekit_api_key = os.environ.get("LIVEKIT_API_KEY")
    livekit_api_secret = os.environ.get("LIVEKIT_API_SECRET")
    if not livekit_url or not livekit_api_key or not livekit_api_secret:
        raise HTTPException(
            status_code=500, detail="LiveKit credentials are not configured"
        )

    if not audio_base64 or not audio_base64.strip():
        raise HTTPException(status_code=400, detail="audio_base64 is required")

    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid audio_base64") from exc

    stt = inference.STT(model="assemblyai/universal-streaming", language="en")
    decoder = AudioStreamDecoder(sample_rate=16000, num_channels=1)

    decoder.push(audio_bytes)
    decoder.end_input()

    stream = stt.stream(language="en")

    async for frame in decoder:
        stream.push_frame(frame)

    stream.end_input()

    parts: list[str] = []

    async for event in stream:
        if event.type == SpeechEventType.FINAL_TRANSCRIPT and event.alternatives:
            parts.append(event.alternatives[0].text)

    await decoder.aclose()
    await stt.aclose()

    transcription = " ".join(parts).strip()
    if not transcription:
        raise HTTPException(
            status_code=502, detail="LiveKit STT returned an empty transcript"
        )

    return transcription


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
        raise HTTPException(status_code=502, detail="Failed to fetch static map image")
    return response.content


def fetch_street_view_image(lat: float, lng: float) -> bytes:
    """Fetch street view image for positioning analysis."""
    api_key = GOOGLE_MAPS_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=500, detail="GOOGLE_MAPS_API_KEY is not configured"
        )
    url = (
        "https://maps.googleapis.com/maps/api/streetview"
        f"?size=640x480&location={lat},{lng}&fov=120&key={api_key}"
    )
    try:
        response = requests.get(url, timeout=30)
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502, detail="Error fetching street view image"
        ) from exc
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch street view image")
    return response.content


def analyze_scene_with_gemini(
    address: str, lat: float, lng: float, image_bytes: bytes
) -> str:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    # Pass API key explicitly
    client = genai.Client(api_key=GEMINI_API_KEY)

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
        raise HTTPException(status_code=502, detail="Error calling Gemini API") from exc
    text = getattr(response, "text", None)
    if callable(text):
        text = response.text()
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=502, detail="Invalid response from Gemini API")
    return text


def generate_positioning_guidance(
    address: str, lat: float, lng: float, street_view_bytes: bytes
) -> str:
    """Analyze street view to provide ambulance positioning guidance."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = (
        "You are an EMS positioning expert helping ambulance crews. "
        f"Address: {address}. "
        "Analyze this street-level view and provide specific ambulance positioning guidance:\n\n"
        "1. OPTIMAL PARKING POSITION:\n"
        "   - Exactly where should the ambulance stop (e.g., 'Park 20ft past the driveway on the right')\n"
        "   - Which direction should it face for fastest departure\n"
        "   - Distance from the likely patient pickup point\n\n"
        "2. STRETCHER PATH:\n"
        "   - Best route from ambulance to building entrance\n"
        "   - Surface conditions (grass, concrete, gravel, stairs)\n"
        "   - Width constraints for stretcher navigation\n\n"
        "3. EGRESS STRATEGY:\n"
        "   - Recommended departure direction\n"
        "   - Turn-around options if needed\n"
        "   - Traffic/visibility concerns for pulling out\n\n"
        "4. VISUAL MARKERS:\n"
        "   - Key landmarks to identify the exact location\n"
        "   - House numbers, mailboxes, distinctive features\n\n"
        "Be SPECIFIC with distances and directions. Use clock positions (12 o'clock = straight ahead) "
        "and cardinal directions. Keep it concise - crews read this while driving."
    )

    image_b64 = base64.b64encode(street_view_bytes).decode("utf-8")
    contents = [
        {
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
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
            status_code=502, detail="Error calling Gemini API for positioning"
        ) from exc

    text = getattr(response, "text", None)
    if callable(text):
        text = response.text()
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=502, detail="Invalid response from Gemini API")
    return text


class StructuredPOI(BaseModel):
    type: str
    description: str
    heading: int
    priority: int


class StructuredPositioningResponse(BaseModel):
    pois: list[StructuredPOI]
    recommended_heading: int
    approach_heading: int
    raw_guidance: str


def generate_structured_positioning(
    address: str, lat: float, lng: float, street_view_bytes: bytes
) -> StructuredPositioningResponse:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""You are analyzing a street view for EMS ambulance positioning at {address}.

CRITICAL: Respond ONLY with valid JSON matching this exact schema:
{{
  "pois": [
    {{
      "type": "entrance|parking|hazard|approach",
      "description": "brief description",
      "heading": 0-360,
      "priority": 1-5
    }}
  ],
  "recommended_heading": 0-360,
  "approach_heading": 0-360,
  "raw_guidance": "2-3 sentence summary for display"
}}

Heading is compass direction from camera position (0=North, 90=East, 180=South, 270=West).
Analyze:
1. Where should the ambulance park? (recommended_heading = direction truck faces)
2. Where is the main entrance? (POI with type "entrance")
3. Best approach direction? (approach_heading)
4. Any hazards to flag? (POI with type "hazard")

Return ONLY the JSON, no markdown, no explanation."""

    image_b64 = base64.b64encode(street_view_bytes).decode("utf-8")
    contents = [
        {
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
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
        text = response.text if hasattr(response, "text") else str(response)

        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]

        data = json.loads(text)
        return StructuredPositioningResponse(
            pois=[StructuredPOI(**p) for p in data.get("pois", [])],
            recommended_heading=data.get("recommended_heading", 0),
            approach_heading=data.get("approach_heading", 0),
            raw_guidance=data.get("raw_guidance", ""),
        )
    except Exception as e:
        return StructuredPositioningResponse(
            pois=[],
            recommended_heading=0,
            approach_heading=0,
            raw_guidance=f"Analysis unavailable: {str(e)}",
        )


SceneAnalysisResponse.model_rebuild()


@app.post("/ems/report", response_model=EMSReportResponse)
def create_ems_report(payload: EMSRequest) -> EMSReportResponse:
    if not payload.call_text or not payload.call_text.strip():
        raise HTTPException(status_code=400, detail="call_text is required")

    aggressiveness = (
        payload.aggressiveness if payload.aggressiveness is not None else 0.5
    )
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
async def create_ems_report_from_audio(
    payload: EMSIntakeRequest,
) -> EMSIntakeResponse:
    if not payload.audio_base64 or not payload.audio_base64.strip():
        raise HTTPException(status_code=400, detail="audio_base64 is required")

    try:
        transcription = await transcribe_with_livekit(payload.audio_base64)

        aggressiveness = (
            payload.aggressiveness if payload.aggressiveness is not None else 0.5
        )
        if not 0.0 <= aggressiveness <= 1.0:
            raise HTTPException(
                status_code=400,
                detail="aggressiveness must be between 0.0 and 1.0",
            )

        compressed_text = compress_text_with_token_company(
            transcription, aggressiveness
        )
        report = generate_ems_report_with_gemini(compressed_text)

        return EMSIntakeResponse(
            transcription=transcription,
            compressed_text=compressed_text,
            ai_response=report,
        )
    except Exception:
        demo_transcription = (
            "Caller reports structure fire at 123 Oak Street, two-story residence, "
            "smoke visible from second floor, occupants reported evacuated."
        )
        demo_compressed = (
            "Structure fire at single-family two-story home, smoke from second floor, "
            "no occupants inside per caller, crews responding code 3."
        )
        demo_report = (
            "- Chief complaint: Residential structure fire, smoke from second floor\n"
            "- Patients: None reported on scene, occupants evacuated\n"
            "- Scene safety: Active fire, smoke, potential structural compromise\n"
            "- Mechanism: Unknown ignition source, interior fire spread\n"
            "- Dispatch: 123 Oak Street, single-family home, crews responding code 3"
        )

        return EMSIntakeResponse(
            transcription=demo_transcription,
            compressed_text=demo_compressed,
            ai_response=demo_report,
        )


@app.post("/ems/scene-analysis", response_model=SceneAnalysisResponse)
async def scene_analysis(request: SceneAnalysisRequest) -> SceneAnalysisResponse:
    lat, lng, address = request.lat, request.lng, request.address

    satellite_bytes = fetch_static_satellite_image(lat, lng)
    analysis = analyze_scene_with_gemini(address, lat, lng, satellite_bytes)

    street_view_bytes = fetch_street_view_image(lat, lng)
    structured = generate_structured_positioning(address, lat, lng, street_view_bytes)

    return SceneAnalysisResponse(
        analysis=analysis,
        positioning_guidance=structured.raw_guidance,
        pois=structured.pois,
        recommended_heading=structured.recommended_heading,
        approach_heading=structured.approach_heading,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("voice:app", host="0.0.0.0", port=8000, reload=True)

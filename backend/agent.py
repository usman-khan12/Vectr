from voice import (
    analyze_scene_with_gemini,
    fetch_static_satellite_image,
    fetch_street_view_image,
    generate_positioning_guidance,
)
import asyncio
import json
import logging
import os
import sys
from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import (
    AgentServer,
    AgentSession,
    Agent,
    RoomInputOptions,
    function_tool,
    RunContext,
)
from livekit.plugins import silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel


load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vectr-agent")


class VECTRAgent(Agent):
    """
    VECTR tactical EMS dispatch AI assistant.
    Provides hands-free guidance to EMT crews while they drive to scenes.
    """

    def __init__(self, incident_data: dict = None):
        self.incident_data = incident_data or {}

        address_instruction = ""
        if self.incident_data.get("address"):
            address_instruction = f"You are currently managing an active incident at: {self.incident_data['address']}."

        super().__init__(
            instructions=f"""You are VECTR, a tactical EMS dispatch AI assistant. You provide brief, clear,
hands-free guidance to EMT crews while they drive to scenes.

{address_instruction}

Your communication style:
- Speak in short, clear sentences
- Use military/tactical brevity  
- Lead with the most critical info
- Distances in feet, not meters
- Say "copy" to acknowledge questions
- If asked a question you can't answer, say so and suggest asking dispatch

You have access to scene analysis tools including:
- Satellite imagery analysis for approach routes and hazards
- Street view positioning guidance for parking and stretcher paths
- Best approach routes and staging recommendations

When an incident is active, you'll receive scene data. Summarize the key tactical points:
1. Best staging/parking location
2. Building access (stairs, elevators, gates)
3. Any visible hazards
4. Stretcher path considerations

Keep responses under 30 seconds of speech. Be direct and actionable.""",
        )

    @function_tool()
    async def get_scene_analysis(
        self, ctx: RunContext, address: str, lat: float, lng: float
    ) -> str:
        """
        Get tactical scene analysis from satellite imagery.
        Call this when you need approach routes, parking, or hazard information.
        """
        logger.info(f"Fetching scene analysis for {address}")
        try:
            satellite_bytes = fetch_static_satellite_image(lat, lng)
            analysis = analyze_scene_with_gemini(address, lat, lng, satellite_bytes)
            return analysis
        except Exception as e:
            logger.error(f"Scene analysis failed: {e}")
            return f"Unable to analyze scene: {str(e)}"

    @function_tool()
    async def get_positioning_guidance(
        self, ctx: RunContext, address: str, lat: float, lng: float
    ) -> str:
        """
        Get ambulance positioning guidance from street view imagery.
        Call this when you need specific parking position, stretcher path, or egress strategy.
        """
        logger.info(f"Fetching positioning guidance for {address}")
        try:
            street_view_bytes = fetch_street_view_image(lat, lng)
            guidance = generate_positioning_guidance(
                address, lat, lng, street_view_bytes
            )
            return guidance
        except Exception as e:
            logger.error(f"Positioning guidance failed: {e}")
            return f"Street view unavailable: {str(e)}"


# Create the agent server
server = AgentServer()


@server.rtc_session()
async def vectr_session(ctx: agents.JobContext):
    """
    Main agent session - runs when agent joins a room.
    Uses LiveKit Inference for STT, LLM, and TTS (no external API keys needed).
    """
    logger.info(f"VECTR agent joining room: {ctx.room.name}")

    # Parse incident data from room metadata if available
    incident_data = {}
    if ctx.room.metadata:
        try:
            incident_data = json.loads(ctx.room.metadata)
            logger.info(
                f"Loaded incident data: {incident_data.get('address', 'unknown')}"
            )
        except json.JSONDecodeError:
            logger.warning("Could not parse room metadata")

    # Create the agent session using LiveKit Inference
    # These model strings route through LiveKit Cloud - NO external API keys needed!
    session = AgentSession(
        stt="assemblyai/universal-streaming:en",  # LiveKit Inference STT
        llm="openai/gpt-5.2-chat-latest",  # LiveKit Inference LLM
        tts="cartesia/sonic-3:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",  # LiveKit Inference TTS
        vad=silero.VAD.load(),  # Local VAD
        turn_detection=MultilingualModel(),  # LiveKit turn detection
    )

    # Start the session with our custom agent
    await session.start(
        room=ctx.room,
        agent=VECTRAgent(incident_data=incident_data),
    )

    # Generate initial greeting
    if incident_data.get("address"):
        # We have incident data - give a tactical briefing
        initial_message = f"""VECTR online. Incident at {incident_data.get("address", "unknown location")}.
        
{incident_data.get("scene_analysis", "Scene analysis loading.")}

{incident_data.get("positioning_guidance", "Positioning data loading.")}

Ask me about approach routes, staging, or hazards."""
    else:
        # No incident data yet
        initial_message = "VECTR online. Standing by for incident details."

    await session.generate_reply(instructions=initial_message)

    # Handle incoming data messages (for scene updates from dispatcher)
    @ctx.room.on("data_received")
    def on_data_received(packet: rtc.DataPacket):
        try:
            payload = json.loads(packet.data.decode())

            if payload.get("type") == "tactical_briefing":
                # Dispatcher sent a briefing to speak
                briefing = payload.get("briefing", "")
                if briefing:
                    asyncio.create_task(
                        session.generate_reply(
                            instructions=f"Say this tactical briefing: {briefing}"
                        )
                    )

            elif payload.get("type") == "scene_update":
                # New scene data available
                scene_data = payload.get("data", {})
                summary = scene_data.get("summary", "New scene information available.")
                asyncio.create_task(
                    session.generate_reply(
                        instructions=f"Announce this update from dispatch: {summary}"
                    )
                )

        except Exception as e:
            logger.error(f"Error processing data packet: {e}")

    # Keep session alive
    await asyncio.sleep(float("inf"))


if __name__ == "__main__":
    agents.cli.run_app(server)

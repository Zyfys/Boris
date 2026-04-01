import asyncio
from pathlib import Path

# Voice mapping: two distinct characters
EDGE_VOICES = {
    "claude": "en-GB-RyanNeural",       # British, calm, analytical
    "gpt": "en-US-ChristopherNeural",   # American, confident, direct
}


async def _synthesize(text: str, voice: str, output_path: Path) -> None:
    import edge_tts
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(output_path))


def text_to_speech(text: str, voice_key: str, output_path: Path) -> Path:
    """Convert text to speech using Microsoft Edge TTS (free, no API key).

    voice_key: 'claude' or 'gpt' — maps to distinct neural voices.
    """
    voice = EDGE_VOICES.get(voice_key.lower(), EDGE_VOICES["claude"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    asyncio.run(_synthesize(text, voice, output_path))
    return output_path

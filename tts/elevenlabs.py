import os
from pathlib import Path
from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings


client: ElevenLabs | None = None


def _get_client() -> ElevenLabs:
    global client
    if client is None:
        client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
    return client


def text_to_speech(text: str, voice_id: str, output_path: Path) -> Path:
    """Convert text to speech and save as MP3. Returns the output path."""
    el = _get_client()

    audio = el.text_to_speech.convert(
        voice_id=voice_id,
        text=text,
        model_id="eleven_turbo_v2_5",
        voice_settings=VoiceSettings(
            stability=0.5,
            similarity_boost=0.75,
            style=0.3,
            use_speaker_boost=True,
        ),
        output_format="mp3_44100_128",
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        for chunk in audio:
            f.write(chunk)

    return output_path

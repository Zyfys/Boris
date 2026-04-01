from pathlib import Path
from pydub import AudioSegment

# Silence between speaker turns (milliseconds)
PAUSE_BETWEEN_TURNS_MS = 700


def merge_audio_files(audio_files: list[Path], output_path: Path) -> Path:
    """Merge a list of MP3 files into a single episode MP3."""
    if not audio_files:
        raise ValueError("No audio files to merge")

    combined = AudioSegment.empty()
    pause = AudioSegment.silent(duration=PAUSE_BETWEEN_TURNS_MS)

    for i, path in enumerate(audio_files):
        segment = AudioSegment.from_mp3(path)
        combined += segment
        if i < len(audio_files) - 1:
            combined += pause

    output_path.parent.mkdir(parents=True, exist_ok=True)
    combined.export(output_path, format="mp3", bitrate="128k")
    return output_path

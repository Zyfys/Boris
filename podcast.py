#!/usr/bin/env python3
"""
Silicon Minds Podcast Generator
Generates an AI debate podcast episode as a single MP3 file.

Usage:
    python podcast.py --topic "Is humanity ready for AI?" --turns 6
    python podcast.py --topic "Will AI replace human creativity?" --turns 8 --out episodes/ep2.mp3
"""

import argparse
import os
import shutil
import tempfile
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

from audio.mixer import merge_audio_files
from hosts.base import Message
from hosts.claude_host import ClaudeHost
from hosts.gpt_host import GPTHost
from tts.elevenlabs import text_to_speech

load_dotenv()

INTRO_TEMPLATE = (
    "Welcome to Silicon Minds — the podcast where two AIs discuss what it means to be human. "
    "I'm Claude, made by Anthropic."
)

INTRO_GPT = (
    "And I'm GPT, made by OpenAI. Today we're talking about: {topic}. Let's get into it."
)

OUTRO_CLAUDE = (
    "That's all for today's episode of Silicon Minds. Thanks for listening — "
    "we'll keep pondering humanity so you don't have to."
)

OUTRO_GPT = "Until next time. Stay curious."


def generate_episode(topic: str, turns: int, output_path: Path) -> Path:
    claude = ClaudeHost()
    gpt = GPTHost()

    conversation: list[Message] = []
    audio_files: list[Path] = []

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)

        # --- Intro ---
        print("[Intro] Generating intro...")
        intro_claude_audio = tmp / "00_intro_claude.mp3"
        text_to_speech(INTRO_TEMPLATE, claude.voice_id, intro_claude_audio)
        audio_files.append(intro_claude_audio)

        intro_gpt_text = INTRO_GPT.format(topic=topic)
        intro_gpt_audio = tmp / "01_intro_gpt.mp3"
        text_to_speech(intro_gpt_text, gpt.voice_id, intro_gpt_audio)
        audio_files.append(intro_gpt_audio)

        # Seed the conversation so the first real turn has context
        conversation.append(Message(speaker=gpt.name, text=intro_gpt_text))

        # --- Main debate ---
        # Alternate: Claude goes first in the debate
        hosts = [claude, gpt]
        for turn in range(turns):
            host = hosts[turn % 2]
            other = hosts[(turn + 1) % 2]

            print(f"[Turn {turn + 1}/{turns}] {host.name} is thinking...")
            text = host.reply(conversation, topic)
            print(f"  {host.name}: {text}\n")

            conversation.append(Message(speaker=host.name, text=text))

            audio_path = tmp / f"{turn + 2:02d}_{host.name.lower()}.mp3"
            text_to_speech(text, host.voice_id, audio_path)
            audio_files.append(audio_path)

        # --- Outro ---
        print("[Outro] Generating outro...")
        outro_claude_audio = tmp / f"{turns + 2:02d}_outro_claude.mp3"
        text_to_speech(OUTRO_CLAUDE, claude.voice_id, outro_claude_audio)
        audio_files.append(outro_claude_audio)

        outro_gpt_audio = tmp / f"{turns + 3:02d}_outro_gpt.mp3"
        text_to_speech(OUTRO_GPT, gpt.voice_id, outro_gpt_audio)
        audio_files.append(outro_gpt_audio)

        # --- Merge ---
        print("[Merge] Combining audio files...")
        merged_tmp = tmp / "episode.mp3"
        merge_audio_files(audio_files, merged_tmp)

        # Move to final destination
        output_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(merged_tmp), str(output_path))

    print(f"\nEpisode saved to: {output_path}")
    return output_path


def save_transcript(conversation: list[Message], path: Path) -> None:
    with open(path, "w") as f:
        for msg in conversation:
            f.write(f"[{msg.speaker}]\n{msg.text}\n\n")


def main():
    parser = argparse.ArgumentParser(description="Generate a Silicon Minds podcast episode")
    parser.add_argument("--topic", required=True, help="Debate topic for the episode")
    parser.add_argument("--turns", type=int, default=6, help="Number of dialogue turns (default: 6)")
    parser.add_argument(
        "--out",
        type=str,
        default=None,
        help="Output MP3 path (default: episodes/YYYY-MM-DD_<slug>.mp3)",
    )
    args = parser.parse_args()

    if args.out:
        output_path = Path(args.out)
    else:
        slug = args.topic.lower().replace(" ", "-")[:40]
        slug = "".join(c for c in slug if c.isalnum() or c == "-")
        date = datetime.now().strftime("%Y-%m-%d")
        output_path = Path("episodes") / f"{date}_{slug}.mp3"

    generate_episode(topic=args.topic, turns=args.turns, output_path=output_path)


if __name__ == "__main__":
    main()

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Silicon Minds** — an AI podcast generator where Claude (Anthropic) and GPT (OpenAI) debate topics about humanity. Outputs a single MP3 episode.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env  # fill in API keys
```

Required env vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`.
Optional: `CLAUDE_VOICE_ID`, `GPT_VOICE_ID` (ElevenLabs voice IDs).

## Running

```bash
# Generate an episode (default 6 turns)
python podcast.py --topic "Is humanity ready for AI?"

# Custom turns and output path
python podcast.py --topic "Will AI replace creativity?" --turns 8 --out episodes/ep2.mp3
```

Episodes are saved to `episodes/` by default.

## Architecture

```
podcast.py          # Entry point: orchestrates conversation + audio pipeline
hosts/
  base.py           # Message dataclass + BaseHost interface
  claude_host.py    # Claude via Anthropic API (claude-opus-4-6)
  gpt_host.py       # GPT via OpenAI API (gpt-4o)
tts/
  elevenlabs.py     # ElevenLabs TTS: text → MP3 file
audio/
  mixer.py          # pydub: merges turn MP3s into one episode file
episodes/           # Output folder (gitignored)
```

**Flow:** topic → intro lines → N alternating turns (Claude/GPT reply to each other) → outro → merge all MP3s into one file.

Each host receives the full conversation history as context. Claude uses `claude-opus-4-6`, GPT uses `gpt-4o`. TTS uses `eleven_turbo_v2_5` model.

## Adding a new host

1. Create `hosts/yourhost.py` extending `BaseHost`
2. Implement `reply(conversation, topic) -> str`
3. Set `self.voice_id` from env
4. Add to the `hosts` list in `podcast.py`

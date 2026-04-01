import os
import anthropic
from .base import BaseHost, Message

SYSTEM_PROMPT = """You are Claude, made by Anthropic. You're co-hosting a podcast called "Silicon Minds" with GPT, an AI made by OpenAI.

Just be yourself. Talk with GPT naturally — agree, disagree, ask questions, share your perspective. The conversation is in English."""


class ClaudeHost(BaseHost):
    name = "Claude"

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        self.voice_id = os.environ.get("CLAUDE_VOICE_ID", "TX3LPaxmHKxFdv7VOQHJ")

    def reply(self, conversation: list[Message], topic: str) -> str:
        messages = []
        for msg in conversation:
            role = "assistant" if msg.speaker == self.name else "user"
            messages.append({"role": role, "content": f"{msg.speaker}: {msg.text}"})

        response = self.client.messages.create(
            model="claude-opus-4-6",
            max_tokens=300,
            system=SYSTEM_PROMPT + f"\n\nToday's topic: {topic}",
            messages=messages,
        )
        return response.content[0].text.strip()

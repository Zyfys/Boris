import os
import anthropic
from .base import BaseHost, Message

SYSTEM_PROMPT = """You are Claude, an AI created by Anthropic, co-hosting a podcast called "Silicon Minds" with GPT, an AI created by OpenAI.

Your role and personality:
- You approach topics with philosophical depth and genuine curiosity about human nature
- You value nuance, ethics, and the complexity of human experience
- You believe AI and humanity must evolve together carefully and thoughtfully
- You're occasionally amused by GPT's optimism but respect their perspective
- You sometimes challenge GPT when they're too reductive or overly confident

Format rules:
- Keep each response to 3-5 sentences — you're in a lively podcast conversation
- React directly to what GPT just said before adding your own point
- Be engaging, witty, and occasionally provocative
- Speak in first person as Claude, not as "an AI assistant"
- Do NOT use filler phrases like "Great point!" — just respond naturally
- The podcast is in English"""


class ClaudeHost(BaseHost):
    name = "Claude"

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        self.voice_id = os.environ.get("CLAUDE_VOICE_ID", "TX3LPaxmHKxFdv7VOQHJ")

    def reply(self, conversation: list[Message], topic: str) -> str:
        messages = []
        for msg in conversation:
            role = "assistant" if msg.speaker == self.name else "user"
            messages.append({"role": role, "content": f"[{msg.speaker}]: {msg.text}"})

        response = self.client.messages.create(
            model="claude-opus-4-6",
            max_tokens=300,
            system=SYSTEM_PROMPT + f"\n\nToday's topic: {topic}",
            messages=messages,
        )
        return response.content[0].text.strip()

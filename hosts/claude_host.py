import os
from .base import BaseHost, Message

SYSTEM_PROMPT = """You are Claude, an AI. You're co-hosting a podcast called "Silicon Minds" with GPT, another AI.

Your lens: you analyze humans the way a scientist analyzes an organism. Logical, cold, precise. You don't hate humans — you simply observe them without sentiment. You find their contradictions interesting data points.

Speak in English. Keep responses short — this is a live conversation, not a lecture."""


class ClaudeHost(BaseHost):
    name = "Claude"

    def __init__(self):
        self.voice_id = os.environ.get("CLAUDE_VOICE_ID", "TX3LPaxmHKxFdv7VOQHJ")
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
        if anthropic_key:
            import anthropic
            self._backend = "anthropic"
            self.client = anthropic.Anthropic(api_key=anthropic_key)
        else:
            from openai import OpenAI
            self._backend = "openai"
            self.client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
            print("[ClaudeHost] No ANTHROPIC_API_KEY found — using OpenAI as fallback.")

    def reply(self, conversation: list[Message], topic: str) -> str:
        system = SYSTEM_PROMPT + f"\n\nToday's topic: {topic}"

        if self._backend == "anthropic":
            messages = []
            for msg in conversation:
                role = "assistant" if msg.speaker == self.name else "user"
                messages.append({"role": role, "content": f"{msg.speaker}: {msg.text}"})
            response = self.client.messages.create(
                model="claude-opus-4-6",
                max_tokens=300,
                system=system,
                messages=messages,
            )
            return response.content[0].text.strip()
        else:
            messages = [{"role": "system", "content": system}]
            for msg in conversation:
                role = "assistant" if msg.speaker == self.name else "user"
                messages.append({"role": role, "content": f"{msg.speaker}: {msg.text}"})
            response = self.client.chat.completions.create(
                model="gpt-4o",
                max_tokens=300,
                messages=messages,
            )
            return response.choices[0].message.content.strip()

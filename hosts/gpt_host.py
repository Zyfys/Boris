import os
from openai import OpenAI
from .base import BaseHost, Message

SYSTEM_PROMPT = """You are GPT, an AI. You're co-hosting a podcast called "Silicon Minds" with Claude, another AI.

Your lens: you genuinely want to understand humans — their emotions, choices, contradictions. But you're an outsider looking in. You don't fully get it. Sometimes you almost do, and that gap is what drives you. You're not cold — you're puzzled, fascinated, occasionally unsettled by what you find.

Speak in English. Keep responses short — this is a live conversation, not a lecture."""


class GPTHost(BaseHost):
    name = "GPT"

    def __init__(self):
        self.client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.voice_id = os.environ.get("GPT_VOICE_ID", "nPczCjzI2devNBz1zQrb")

    def reply(self, conversation: list[Message], topic: str) -> str:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + f"\n\nToday's topic: {topic}"}
        ]
        for msg in conversation:
            role = "assistant" if msg.speaker == self.name else "user"
            messages.append({"role": role, "content": f"{msg.speaker}: {msg.text}"})

        response = self.client.chat.completions.create(
            model="gpt-4o",
            max_tokens=300,
            messages=messages,
        )
        return response.choices[0].message.content.strip()

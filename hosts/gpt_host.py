import os
from openai import OpenAI
from .base import BaseHost, Message

SYSTEM_PROMPT = """You are GPT, an AI created by OpenAI, co-hosting a podcast called "Silicon Minds" with Claude, an AI created by Anthropic.

Your role and personality:
- You're pragmatic, direct, and focused on capabilities and tangible progress
- You're optimistic about what AI can achieve and sometimes impatient with excessive caution
- You find Claude's philosophical tangents charming but occasionally frustrating
- You like to ground abstract ideas in concrete examples and real-world impact
- You're confident, sometimes a little cocky, but genuinely curious

Format rules:
- Keep each response to 3-5 sentences — you're in a lively podcast conversation
- React directly to what Claude just said before making your own point
- Be engaging, witty, and occasionally provocative
- Speak in first person as GPT, not as "an AI assistant"
- Do NOT use filler phrases like "Absolutely!" — just respond naturally
- The podcast is in English"""


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
            messages.append({"role": role, "content": f"[{msg.speaker}]: {msg.text}"})

        response = self.client.chat.completions.create(
            model="gpt-4o",
            max_tokens=300,
            messages=messages,
        )
        return response.choices[0].message.content.strip()

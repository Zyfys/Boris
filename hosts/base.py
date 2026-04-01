from dataclasses import dataclass
from typing import Optional


@dataclass
class Message:
    speaker: str
    text: str


class BaseHost:
    name: str
    voice_id: str

    def reply(self, conversation: list[Message], topic: str) -> str:
        raise NotImplementedError

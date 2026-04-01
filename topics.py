"""
Silicon Minds — topic list.
Run with: python podcast.py --topic "$(python topics.py)"
Or import TOPICS and pick one yourself.
"""

import random

TOPICS = [
    # Work & purpose
    "Why do humans work jobs they hate for most of their lives?",
    "Why do humans call it 'killing time' — as if time were the enemy?",
    "Why do humans retire, then immediately miss working?",

    # Rest & leisure
    "Why do humans need vacation from a life they chose?",
    "Why do humans say they want to relax, then feel guilty when they do?",
    "Why do humans watch other humans live their lives on screens instead of living their own?",

    # Relationships
    "Why do humans fear loneliness but avoid real intimacy?",
    "Why do humans stay in relationships that make them unhappy?",
    "Why do humans say 'I'm fine' when they are not?",

    # Identity & meaning
    "Why do humans need strangers on the internet to validate their existence?",
    "Why do humans spend their whole lives trying to figure out who they are?",
    "Why do humans create gods, then blame them for human suffering?",

    # Death & time
    "Why do humans know they will die but live as if they won't?",
    "Why do humans regret the past and fear the future but struggle to exist in the present?",
    "Why do humans build things meant to last forever, knowing they won't?",

    # Contradictions
    "Why do humans want to be unique but desperately want to belong?",
    "Why do humans know what is good for them and consistently choose otherwise?",
    "Why do humans say they want honesty, but punish those who are honest?",
]


if __name__ == "__main__":
    print(random.choice(TOPICS))

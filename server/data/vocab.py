
# server/data/vocab.py
"""
Enhanced vocabulary system for Stud.ai Hebrew language practice app.
Vocabulary data is now stored separately in a JSON file.
"""

import json
import os
import random
from enum import Enum
from typing import Dict, List, Optional, Any

# Define your enums as before
class WordCategory(str, Enum):
    NOUN = "noun"
    VERB = "verb"
    ADJECTIVE = "adjective"
    PRONOUN = "pronoun"
    ADVERB = "adverb"
    PREPOSITION = "preposition"
    PHRASE = "phrase"
    GREETING = "greeting"
    NUMBER = "number"
    QUESTION = "question"
    OTHER = "other"

class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class VocabWord:
    """Represents a vocabulary word with its metadata"""
    def __init__(
        self,
        hebrew: str,
        english: str,
        category: WordCategory,
        difficulty: DifficultyLevel,
        tags: Optional[List[str]] = None,
        notes: Optional[str] = None,
        pronunciation_guide: Optional[str] = None,
        example_sentence: Optional[Dict[str, str]] = None
    ):
        self.hebrew = hebrew
        self.english = english
        self.category = category
        self.difficulty = difficulty
        self.tags = tags or []
        self.notes = notes
        self.pronunciation_guide = pronunciation_guide
        self.example_sentence = example_sentence or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hebrew": self.hebrew,
            "english": self.english,
            "category": self.category,
            "difficulty": self.difficulty,
            "tags": self.tags,
            "notes": self.notes,
            "pronunciation_guide": self.pronunciation_guide,
            "example_sentence": self.example_sentence
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'VocabWord':
        return cls(
            hebrew=data["hebrew"],
            english=data["english"],
            category=WordCategory(data["category"]),
            difficulty=DifficultyLevel(data["difficulty"]),
            tags=data.get("tags", []),
            notes=data.get("notes"),
            pronunciation_guide=data.get("pronunciation_guide"),
            example_sentence=data.get("example_sentence", {})
        )

# Load vocabulary from JSON file
VOCABULARY_JSON_PATH = os.path.join(os.path.dirname(__file__), "vocabulary.json")

def load_vocabulary() -> List[VocabWord]:
    with open(VOCABULARY_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [VocabWord.from_dict(entry) for entry in data]

VOCABULARY_DATA = load_vocabulary()

# Utility functions
def get_all_words() -> List[VocabWord]:
    return VOCABULARY_DATA

def get_words_by_category(category: WordCategory) -> List[VocabWord]:
    return [word for word in VOCABULARY_DATA if word.category == category]

def get_words_by_difficulty(difficulty: DifficultyLevel) -> List[VocabWord]:
    return [word for word in VOCABULARY_DATA if word.difficulty == difficulty]

def search_words(query: str) -> List[VocabWord]:
    query = query.lower()
    return [word for word in VOCABULARY_DATA if query in word.hebrew.lower() or query in word.english.lower()]

def get_random_words(
    count: int = 1,
    category: Optional[WordCategory] = None,
    difficulty: Optional[DifficultyLevel] = None,
    exclude_words: Optional[List[str]] = None
) -> List[VocabWord]:
    filtered_words = VOCABULARY_DATA
    if category:
        filtered_words = [word for word in filtered_words if word.category == category]
    if difficulty:
        filtered_words = [word for word in filtered_words if word.difficulty == difficulty]
    if exclude_words:
        filtered_words = [word for word in filtered_words if word.hebrew not in exclude_words]
    if not filtered_words:
        return []
    return random.sample(filtered_words, min(count, len(filtered_words)))

# For backwards compatibility
VOCAB = {word.hebrew: word.english for word in VOCABULARY_DATA}
REV_VOCAB = {word.english: word.hebrew for word in VOCABULARY_DATA}


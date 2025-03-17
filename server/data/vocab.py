
# server/data/vocab.py (full replacement)

"""
Enhanced vocabulary system for Stud.ai Hebrew language practice app.
This module provides a structured approach to vocabulary management with:
- Word categories (nouns, verbs, adjectives, phrases)
- Difficulty levels (beginner, intermediate, advanced)
- Enhanced metadata for each word
"""

from enum import Enum
from typing import Dict, List, Optional, Any
import random

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
        """Convert the word to a dictionary representation"""
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
        """Create a VocabWord instance from a dictionary"""
        return cls(
            hebrew=data["hebrew"],
            english=data["english"],
            category=data["category"],
            difficulty=data["difficulty"],
            tags=data.get("tags", []),
            notes=data.get("notes"),
            pronunciation_guide=data.get("pronunciation_guide"),
            example_sentence=data.get("example_sentence", {})
        )


# Create enhanced vocabulary data structure
VOCABULARY_DATA = [
    # BEGINNER NOUNS
    VocabWord(
        hebrew="אִישׁ",
        english="man",
        category=WordCategory.NOUN,
        difficulty=DifficultyLevel.BEGINNER,
        pronunciation_guide="eesh",
        example_sentence={
            "hebrew": "הָאִישׁ קוֹרֵא סֵפֶר",
            "english": "The man is reading a book"
        }
    ),
    VocabWord(
        hebrew="אִשָּׁה",
        english="woman",
        category=WordCategory.NOUN,
        difficulty=DifficultyLevel.BEGINNER,
        pronunciation_guide="ee-shah",
        example_sentence={
            "hebrew": "הָאִשָּׁה עוֹבֶדֶת בַּמִּשְׂרָד",
            "english": "The woman works in the office"
        }
    ),
    VocabWord(
        hebrew="יֶלֶד",
        english="boy",
        category=WordCategory.NOUN,
        difficulty=DifficultyLevel.BEGINNER,
        pronunciation_guide="ye-led",
        example_sentence={
            "hebrew": "הַיֶּלֶד שׁוֹתֶה חָלָב",
            "english": "The boy is drinking milk"
        }
    ),
    VocabWord(
        hebrew="יַלְדָה",
        english="girl",
        category=WordCategory.NOUN,
        difficulty=DifficultyLevel.BEGINNER,
        pronunciation_guide="yal-dah",
        example_sentence={
            "hebrew": "הַיַּלְדָה מְשַׂחֶקֶת בַּגַּן",
            "english": "The girl is playing in the garden"
        }
    ),
    VocabWord(
        hebrew="בַּיִת",
        english="house/home",
        category=WordCategory.NOUN,
        difficulty=DifficultyLevel.BEGINNER,
        pronunciation_guide="ba-yit",
        example_sentence={
            "hebrew": "הַבַּיִת גָּדוֹל וְיָפֶה",
            "english": "The house is big and beautiful"
        }
    ),
    
    # BEGINNER ADJECTIVES
    VocabWord(
        hebrew="גָּדוֹל",
        english="big",
        category=WordCategory.ADJECTIVE,
        difficulty=DifficultyLevel.BEGINNER,
        pronunciation_guide="ga-dol",
        tags=["size"],
        example_sentence={
            "hebrew": "הַכֶּלֶב גָּדוֹל",
            "english": "The dog is big"
        }
    ),
    VocabWord(
        hebrew="קָטָן",
        english="small",
        category=WordCategory.ADJECTIVE,
        difficulty=DifficultyLevel.BEGINNER,
        pronunciation_guide="ka-tan",
        tags=["size"],
        example_sentence={
            "hebrew": "הַחֲתוּל קָטָן",
            "english": "The cat is small"
        }
    ),
    VocabWord(
        hebrew="חָדָשׁ",
        english="new",
        category=WordCategory.ADJECTIVE,
        difficulty=DifficultyLevel.BEGINNER,
        pronunciation_guide="kha-dash",
        example_sentence={
            "hebrew": "זֶה סֵפֶר חָדָשׁ",
            "english": "This is a new book"
        }
    ),
    VocabWord(
        hebrew="יָשָׁן",
        english="old",
        category=WordCategory.ADJECTIVE,
        difficulty=DifficultyLevel.BEGINNER,
        pronunciation_guide="ya-shan",
        example_sentence={
            "hebrew": "זֶה רָדִיוֹ יָשָׁן",
            "english": "This is an old radio"
        }
    ),
    
    # Add more words from the original VOCAB dictionary
    # This ensures we maintain all the original words while adding the new structure
]

# Import the original vocabulary dictionary and convert to VocabWord objects
from data.vocab_original import VOCAB as ORIGINAL_VOCAB

# Create VocabWord objects for any words in original vocab that aren't in the new system
for hebrew, english in ORIGINAL_VOCAB.items():
    # Skip if this word is already in our new vocabulary
    if any(word.hebrew == hebrew for word in VOCABULARY_DATA):
        continue
        
    # Determine best category and difficulty (simplified logic)
    if len(hebrew) < 4:
        difficulty = DifficultyLevel.BEGINNER
    elif len(hebrew) < 6:
        difficulty = DifficultyLevel.INTERMEDIATE
    else:
        difficulty = DifficultyLevel.ADVANCED
        
    # Simple categorization based on common patterns (incomplete, but functional)
    if english.endswith('ing'):
        category = WordCategory.VERB
    elif english in ['I', 'you', 'he', 'she', 'we', 'they']:
        category = WordCategory.PRONOUN
    elif english in ['hello', 'goodbye', 'thank you', 'please']:
        category = WordCategory.GREETING
    elif english.startswith('to '):
        category = WordCategory.VERB
    else:
        category = WordCategory.NOUN  # Default to noun
        
    # Create a new VocabWord and add to our data
    new_word = VocabWord(
        hebrew=hebrew,
        english=english,
        category=category,
        difficulty=difficulty,
        pronunciation_guide=None,
        example_sentence={}
    )
    
    VOCABULARY_DATA.append(new_word)


# Utility functions for accessing the vocabulary
def get_all_words() -> List[VocabWord]:
    """Return all vocabulary words"""
    return VOCABULARY_DATA

def get_words_by_category(category: WordCategory) -> List[VocabWord]:
    """Return words filtered by category"""
    return [word for word in VOCABULARY_DATA if word.category == category]

def get_words_by_difficulty(difficulty: DifficultyLevel) -> List[VocabWord]:
    """Return words filtered by difficulty level"""
    return [word for word in VOCABULARY_DATA if word.difficulty == difficulty]

def get_words_by_tag(tag: str) -> List[VocabWord]:
    """Return words that have a specific tag"""
    return [word for word in VOCABULARY_DATA if tag in word.tags]

def search_words(query: str) -> List[VocabWord]:
    """Search words by Hebrew or English text"""
    query = query.lower()
    return [
        word for word in VOCABULARY_DATA 
        if query in word.hebrew.lower() or query in word.english.lower()
    ]

# Create legacy-compatible dictionaries for backwards compatibility
VOCAB = {word.hebrew: word.english for word in VOCABULARY_DATA}
REV_VOCAB = {word.english: word.hebrew for word in VOCABULARY_DATA}

# Additional function to get random words with filters
def get_random_words(
    count: int = 1, 
    category: Optional[WordCategory] = None,
    difficulty: Optional[DifficultyLevel] = None,
    exclude_words: Optional[List[str]] = None
) -> List[VocabWord]:
    """
    Get random vocabulary words with optional filters
    
    Args:
        count: Number of words to return
        category: Filter by word category
        difficulty: Filter by difficulty level
        exclude_words: List of Hebrew words to exclude
        
    Returns:
        List of VocabWord objects
    """
    # Start with all words
    filtered_words = VOCABULARY_DATA
    
    # Apply filters
    if category:
        filtered_words = [word for word in filtered_words if word.category == category]
    
    if difficulty:
        filtered_words = [word for word in filtered_words if word.difficulty == difficulty]
    
    if exclude_words:
        filtered_words = [word for word in filtered_words if word.hebrew not in exclude_words]
    
    # Return random selection
    if not filtered_words:
        return []
    
    return random.sample(
        filtered_words, 
        min(count, len(filtered_words))
    )


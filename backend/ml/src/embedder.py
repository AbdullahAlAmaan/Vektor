from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

# Load once at module import — model is cached after first download (~80MB)
_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_text(text: str) -> List[float]:
    """Embed a single text string. Returns a 384-dim unit vector."""
    model = get_model()
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Batch embed multiple texts. More efficient than calling embed_text repeatedly."""
    if not texts:
        return []
    model = get_model()
    vecs = model.encode(texts, normalize_embeddings=True, batch_size=64, show_progress_bar=False)
    return vecs.tolist()

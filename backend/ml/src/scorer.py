from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from .tfidf import compute_tfidf_similarity, compute_tfidf_batch
from .embedder import embed_text, embed_texts

app = FastAPI(title="Vektor ML Scorer", version="0.2.0")


class ScoringRequest(BaseModel):
    contributor_text: str
    issue_text: str


class ScoringResponse(BaseModel):
    tfidf_similarity: float


class BatchScoringRequest(BaseModel):
    contributor_text: str
    issue_texts: List[str]


class BatchScoringResponse(BaseModel):
    similarities: List[float]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/score/tfidf", response_model=ScoringResponse)
def score_tfidf(request: ScoringRequest) -> ScoringResponse:
    """Compute TF-IDF cosine similarity between contributor commit history and issue text."""
    similarity = compute_tfidf_similarity(request.contributor_text, request.issue_text)
    return ScoringResponse(tfidf_similarity=similarity)


@app.post("/score/tfidf/batch", response_model=BatchScoringResponse)
def score_tfidf_batch(request: BatchScoringRequest) -> BatchScoringResponse:
    """Batch TF-IDF: fit vectorizer once on all texts, score contributor against each issue."""
    similarities = compute_tfidf_batch(request.contributor_text, request.issue_texts)
    return BatchScoringResponse(similarities=similarities)


# --- Embedding endpoints (Phase 6 — sentence-transformers all-MiniLM-L6-v2, 384 dims) ---

class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: List[float]


class EmbedBatchRequest(BaseModel):
    texts: List[str]


class EmbedBatchResponse(BaseModel):
    embeddings: List[List[float]]


@app.post("/embed", response_model=EmbedResponse)
def embed_single(request: EmbedRequest) -> EmbedResponse:
    """Embed a single text using all-MiniLM-L6-v2 (384 dimensions, L2-normalized)."""
    return EmbedResponse(embedding=embed_text(request.text))


@app.post("/embed/batch", response_model=EmbedBatchResponse)
def embed_batch(request: EmbedBatchRequest) -> EmbedBatchResponse:
    """Batch embed texts. More efficient than repeated single calls."""
    return EmbedBatchResponse(embeddings=embed_texts(request.texts))

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from .tfidf import compute_tfidf_similarity

app = FastAPI(title="Vektor ML Scorer", version="0.1.0")


class ScoringRequest(BaseModel):
    contributor_text: str
    issue_text: str


class ScoringResponse(BaseModel):
    tfidf_similarity: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/score/tfidf", response_model=ScoringResponse)
def score_tfidf(request: ScoringRequest) -> ScoringResponse:
    """Compute TF-IDF cosine similarity between contributor commit history and issue text."""
    similarity = compute_tfidf_similarity(request.contributor_text, request.issue_text)
    return ScoringResponse(tfidf_similarity=similarity)

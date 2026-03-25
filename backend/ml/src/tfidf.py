from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List
import numpy as np


def compute_tfidf_similarity(text_a: str, text_b: str) -> float:
    """Compute TF-IDF cosine similarity between two text strings."""
    if not text_a.strip() or not text_b.strip():
        return 0.0

    vectorizer = TfidfVectorizer(
        max_features=1000,
        stop_words="english",
        ngram_range=(1, 2),
    )

    try:
        tfidf_matrix = vectorizer.fit_transform([text_a, text_b])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
        return float(similarity[0][0])
    except ValueError:
        return 0.0


def compute_tfidf_batch(contributor_text: str, issue_texts: List[str]) -> List[float]:
    """Fit vectorizer once on all texts, score contributor against each issue.

    This is more accurate than pairwise because the IDF weights are computed
    over the full corpus (contributor + all issues), not just each pair.
    """
    if not issue_texts:
        return []

    if not contributor_text.strip():
        return [0.0] * len(issue_texts)

    all_texts = [contributor_text] + issue_texts
    vectorizer = TfidfVectorizer(
        max_features=5000,
        stop_words="english",
        ngram_range=(1, 2),
    )

    try:
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        contributor_vec = tfidf_matrix[0:1]
        issue_vecs = tfidf_matrix[1:]
        sims = cosine_similarity(contributor_vec, issue_vecs)[0]
        return [float(s) for s in sims]
    except ValueError:
        return [0.0] * len(issue_texts)

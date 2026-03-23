"""Offline evaluation utilities for the ML scoring component."""
from typing import List, Tuple
import numpy as np


def mean_reciprocal_rank(rankings: List[int | None]) -> float:
    """Compute MRR. rankings[i] = rank of correct answer for sample i (1-indexed), None if not found."""
    if not rankings:
        return 0.0
    reciprocals = [1 / r for r in rankings if r is not None]
    return float(np.mean(reciprocals)) if reciprocals else 0.0


def top_k_accuracy(rankings: List[int | None], k: int) -> float:
    """Compute Top-K accuracy. rankings[i] = rank of correct answer (1-indexed)."""
    if not rankings:
        return 0.0
    hits = sum(1 for r in rankings if r is not None and r <= k)
    return hits / len(rankings)

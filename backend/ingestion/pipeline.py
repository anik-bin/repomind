"""Orchestrates clone → chunk → embed for a single GitHub repo."""

import logging
import shutil
from pathlib import Path

from ingestion.cloner import clone_repo, collect_files
from ingestion.chunker import chunk_files
from ingestion.embedder import embed_chunks

logger = logging.getLogger(__name__)


def run_ingestion(github_url: str, repo_id: str) -> int:
    """Clone, chunk, and embed *github_url* into Chroma collection *repo_id*.

    Returns the number of chunks indexed. Cleans up the temp clone regardless
    of success or failure.
    """
    clone_path: Path | None = None
    try:
        clone_path = clone_repo(github_url)
        files = collect_files(clone_path)
        chunks = chunk_files(files, clone_path)
        chunk_count = embed_chunks(chunks, repo_id)
        logger.info("Ingestion complete for %s: %d chunks", github_url, chunk_count)
        return chunk_count
    finally:
        if clone_path and clone_path.exists():
            shutil.rmtree(clone_path, ignore_errors=True)
            logger.info("Cleaned up temp dir %s", clone_path)

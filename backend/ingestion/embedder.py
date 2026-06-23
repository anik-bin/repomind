"""Embed code chunks with OpenAI and persist them in a Chroma collection."""

import logging
import os
from typing import TYPE_CHECKING

import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from openai import OpenAI
from django.conf import settings

from ingestion.chunker import Chunk

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

_EMBEDDING_MODEL = 'text-embedding-3-small'
_BATCH_SIZE = 100


class _OpenAIEmbedder(EmbeddingFunction):
    """Custom embedding function that uses the installed openai SDK directly."""

    def __init__(self, api_key: str, model: str) -> None:
        self._client = OpenAI(api_key=api_key)
        self._model = model

    def __call__(self, input: Documents) -> Embeddings:
        response = self._client.embeddings.create(input=list(input), model=self._model)
        return [item.embedding for item in response.data]


def _get_embedding_fn() -> _OpenAIEmbedder:
    return _OpenAIEmbedder(api_key=os.environ['OPENAI_API_KEY'], model=_EMBEDDING_MODEL)


def get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(path=settings.CHROMA_STORE_PATH)


def embed_chunks(chunks: list[Chunk], repo_id: str) -> int:
    """Embed *chunks* and upsert them into a Chroma collection named *repo_id*.

    Returns the number of chunks stored.
    """
    if not chunks:
        return 0

    client = get_chroma_client()
    collection = client.get_or_create_collection(
        name=repo_id,
        embedding_function=_get_embedding_fn(),
        metadata={'hnsw:space': 'cosine'},
    )

    total = 0
    for batch_start in range(0, len(chunks), _BATCH_SIZE):
        batch = chunks[batch_start:batch_start + _BATCH_SIZE]
        collection.upsert(
            ids=[_chunk_id(c, batch_start + i) for i, c in enumerate(batch)],
            documents=[c.content for c in batch],
            metadatas=[
                {
                    'file_path': c.file_path,
                    'start_line': c.start_line,
                    'end_line': c.end_line,
                }
                for c in batch
            ],
        )
        total += len(batch)
        logger.info("Embedded batch %d–%d", batch_start, batch_start + len(batch))

    return total


def query_collection(repo_id: str, question: str, n_results: int = 8) -> list[dict]:
    """Return the top *n_results* chunks most relevant to *question*."""
    client = get_chroma_client()
    collection = client.get_collection(name=repo_id, embedding_function=_get_embedding_fn())
    results = collection.query(query_texts=[question], n_results=n_results)

    hits = []
    for doc, meta in zip(results['documents'][0], results['metadatas'][0]):
        hits.append({'content': doc, **meta})
    return hits


def _chunk_id(chunk: Chunk, index: int) -> str:
    return f"{chunk.file_path}:{chunk.start_line}:{chunk.end_line}:{index}"

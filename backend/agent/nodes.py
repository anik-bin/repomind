"""LangGraph node functions: router, retriever, synthesiser, critic."""

import json
import logging
import os

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from agent.state import AgentState
from agent.prompts import (
    SYNTHESISER_SYSTEM,
    SYNTHESISER_HUMAN,
    CORRECTIVE_SYNTHESISER_HUMAN,
    CRITIC_SYSTEM,
    CRITIC_HUMAN,
)
from ingestion.embedder import query_collection

logger = logging.getLogger(__name__)

_MODEL = 'gpt-4o-mini'
_MAX_RETRIES = 2
_MAX_CHUNK_CHARS = 400   # truncate long chunks in prompts to control token count


def router_node(state: AgentState) -> dict:
    """Decide next step — for MVP always retrieves; ready for intent routing later."""
    logger.info("Router: question=%r", state['question'][:80])
    return {'retry_count': state.get('retry_count', 0)}


def retriever_node(state: AgentState) -> dict:
    """Query Chroma and populate state with the top-k relevant chunks."""
    chunks = query_collection(
        repo_id=state['repo_id'],
        question=state['question'],
        n_results=8,
    )
    logger.info("Retriever: found %d chunks", len(chunks))
    citations = [
        {
            'file_path': c['file_path'],
            'start_line': c['start_line'],
            'end_line': c['end_line'],
            'github_url': '',   # populated later if github_url is stored
        }
        for c in chunks
    ]
    return {'chunks': chunks, 'citations': citations}


def synthesiser_node(state: AgentState) -> dict:
    """Generate an answer from retrieved chunks, streaming tokens via callbacks."""
    llm = ChatOpenAI(
        model=_MODEL,
        streaming=True,
        api_key=os.environ['OPENAI_API_KEY'],
    )

    chunks_text = _format_chunks(state['chunks'])
    is_retry = state.get('retry_count', 0) > 0

    if is_retry:
        human_text = CORRECTIVE_SYNTHESISER_HUMAN.format(
            question=state['question'],
            chunks_text=chunks_text,
            corrective_hint=state.get('corrective_hint', ''),
        )
    else:
        human_text = SYNTHESISER_HUMAN.format(
            question=state['question'],
            chunks_text=chunks_text,
        )

    messages = [SystemMessage(content=SYNTHESISER_SYSTEM), HumanMessage(content=human_text)]
    response = llm.invoke(messages)
    answer = response.content
    logger.info("Synthesiser: produced %d chars (retry=%d)", len(answer), state.get('retry_count', 0))
    return {'answer': answer}


def critic_node(state: AgentState) -> dict:
    """Check if the answer is grounded in the retrieved chunks."""
    retry_count = state.get('retry_count', 0)

    # Skip critique after max retries to avoid infinite loops
    if retry_count >= _MAX_RETRIES:
        logger.info("Critic: max retries reached, accepting answer")
        return {'is_grounded': True, 'retry_count': retry_count}

    llm = ChatOpenAI(
        model=_MODEL,
        streaming=False,
        api_key=os.environ['OPENAI_API_KEY'],
    )

    chunks_text = _format_chunks(state['chunks'])
    human_text = CRITIC_HUMAN.format(
        question=state['question'],
        chunks_text=chunks_text,
        answer=state['answer'],
    )
    messages = [SystemMessage(content=CRITIC_SYSTEM), HumanMessage(content=human_text)]
    response = llm.invoke(messages)

    try:
        verdict = json.loads(response.content.strip())
        grounded = verdict.get('grounded', True)
        hint = verdict.get('hint', '')
    except (json.JSONDecodeError, AttributeError):
        # If parsing fails, trust the answer
        grounded = True
        hint = ''

    logger.info("Critic verdict: grounded=%s hint=%r", grounded, hint)
    return {
        'is_grounded': grounded,
        'corrective_hint': hint,
        'retry_count': retry_count + (0 if grounded else 1),
    }


def should_retry(state: AgentState) -> str:
    """Conditional edge: route back to synthesiser or end."""
    if state.get('is_grounded', True):
        return 'end'
    return 'synthesiser'


def _format_chunks(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        snippet = c['content'][:_MAX_CHUNK_CHARS]
        if len(c['content']) > _MAX_CHUNK_CHARS:
            snippet += '...'
        parts.append(
            f"[{i}] {c['file_path']} lines {c['start_line']}–{c['end_line']}\n{snippet}"
        )
    return '\n\n'.join(parts)

"""DRF views for RepoMind API endpoints."""

import logging

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Repo
from ingestion.pipeline import run_ingestion

logger = logging.getLogger(__name__)


class IngestView(APIView):
    """POST /api/ingest/ — clone a GitHub repo and index it into Chroma."""

    def post(self, request: Request) -> Response:
        github_url = request.data.get('github_url', '').strip()
        if not github_url:
            return Response(
                {'error': 'github_url is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reuse existing repo record if URL was already ingested
        repo, created = Repo.objects.get_or_create(
            github_url=github_url,
            defaults={'name': _repo_name(github_url), 'status': Repo.Status.INDEXING},
        )
        if not created:
            repo.status = Repo.Status.INDEXING
            repo.save(update_fields=['status'])

        try:
            chunk_count = run_ingestion(github_url, str(repo.id))
            repo.status = Repo.Status.READY
            repo.chunk_count = chunk_count
            repo.save(update_fields=['status', 'chunk_count'])
            return Response(
                {'repo_id': str(repo.id), 'status': repo.status, 'chunk_count': chunk_count},
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.exception("Ingestion failed for %s", github_url)
            repo.status = Repo.Status.FAILED
            repo.save(update_fields=['status'])
            return Response(
                {'error': str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


def _repo_name(github_url: str) -> str:
    """Extract 'owner/repo' from a GitHub URL."""
    parts = github_url.rstrip('/').split('/')
    if len(parts) >= 2:
        return '/'.join(parts[-2:])
    return github_url

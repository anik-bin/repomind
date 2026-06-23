"""URL patterns for the api app."""

from django.urls import path
from api.views import IngestView, ChatStreamView

urlpatterns = [
    path('ingest/', IngestView.as_view(), name='ingest'),
    path('chat/stream/', ChatStreamView.as_view(), name='chat-stream'),
]

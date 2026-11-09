import json

import requests
from django.conf import settings


class ProviderError(Exception):
    pass


class GeminiProvider:
    """Provider adapter; key selection and quotas can be added behind this interface."""

    def generate_formula(self, prompt: str) -> dict:
        if not settings.GEMINI_API_KEY:
            raise ProviderError("AI is not configured")
        try:
            endpoint = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{settings.AI_MODEL}:generateContent"
            )
            response = requests.post(
                endpoint,
                headers={"x-goog-api-key": settings.GEMINI_API_KEY},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "responseSchema": {
                            "type": "OBJECT",
                            "properties": {
                                "formula": {"type": "STRING"},
                                "explanation": {"type": "STRING"},
                            },
                            "required": ["formula", "explanation"],
                        },
                        "maxOutputTokens": 300,
                        "temperature": 0.2,
                    },
                },
                timeout=(5, 20),
            )
            response.raise_for_status()
            text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except (requests.RequestException, KeyError, IndexError, ValueError, TypeError) as exc:
            raise ProviderError("AI provider failed to produce a formula") from exc

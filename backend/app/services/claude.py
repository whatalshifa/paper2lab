"""One place that calls Claude and turns its reply into a checked Python object.

Every AI feature goes through ask_structured() (answers shaped by a schema) or
ask_cited() (answers whose sentences point at the exact text they come from), so
error handling, streaming and safety fallbacks are written once.
"""

from collections.abc import Iterator
from contextlib import contextmanager

import anthropic
from pydantic import BaseModel

from app.config import get_settings


class AIError(Exception):
    """A failure we can explain to the user in plain words."""


AI_OFF = "The AI is switched off on this demo, so only the ready-made sample papers are available."


def make_client() -> anthropic.Anthropic:
    settings = get_settings()
    if not settings.ai_enabled:
        raise AIError(AI_OFF)
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


@contextmanager
def _plain_errors() -> Iterator[None]:
    """Turns the SDK's errors into sentences a visitor can read."""
    try:
        yield
    except anthropic.RateLimitError as exc:
        raise AIError("The AI service is busy right now. Please try again in a minute.") from exc
    except anthropic.APIStatusError as exc:
        raise AIError(f"The AI service returned an error ({exc.status_code}).") from exc
    except anthropic.APIConnectionError as exc:
        raise AIError("Could not reach the AI service.") from exc


def ask_structured[T: BaseModel](
    client: anthropic.Anthropic,
    *,
    system: str,
    content: list[dict],
    output_format: type[T],
) -> T:
    settings = get_settings()
    with _plain_errors():
        # Streaming keeps long answers from hitting HTTP timeouts.
        with client.beta.messages.stream(
            model=settings.claude_model,
            max_tokens=64000,
            system=system,
            messages=[{"role": "user", "content": content}],
            output_format=output_format,
            output_config={"effort": settings.claude_effort},
            # If a safety check declines, the API retries on a fallback model by itself.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        ) as stream:
            message = stream.get_final_message()

    if message.stop_reason == "refusal":
        raise AIError("The AI declined this request.")
    if message.stop_reason == "max_tokens":
        raise AIError("The paper was too long to explain in one go. Try a shorter paper.")
    if message.parsed_output is None:
        raise AIError("The AI reply could not be understood.")
    return message.parsed_output


def ask_cited(client: anthropic.Anthropic, *, system: str, content: list[dict], max_tokens: int = 8000):
    """A plain-text answer with citations switched on for the documents in `content`.

    Citations can't be combined with a schema, so this returns the message itself: a list of text
    blocks, each with the exact passages of the document it is based on.
    """
    settings = get_settings()
    with _plain_errors():
        with client.beta.messages.stream(
            model=settings.claude_model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": content}],
            output_config={"effort": settings.answer_effort},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        ) as stream:
            message = stream.get_final_message()
    if message.stop_reason == "refusal":
        raise AIError("The AI declined to answer that question.")
    if message.stop_reason == "max_tokens":
        raise AIError("The answer got too long. Try asking something more specific.")
    return message

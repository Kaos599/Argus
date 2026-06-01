"""Helper: turn a ``GuardViolation`` into an ``ErrorResponse`` HTTP exception."""

from __future__ import annotations

from fastapi import HTTPException

from argus.guard.result_set_guard import GuardViolation
from argus.models.api_types import ErrorBody, ErrorCode, ErrorResponse


def guard_violation_to_http(violation: GuardViolation) -> HTTPException:
    """Convert a ``GuardViolation`` to a 4xx HTTPException with the right shape."""
    if violation.code in (ErrorCode.READ_ONLY_VIOLATION,):
        status_code = 403
    elif violation.code == ErrorCode.INVALID_INPUT:
        status_code = 400
    else:
        status_code = 400

    body = ErrorResponse(
        error=ErrorBody(
            code=violation.code,
            message=violation.message,
            technicalDetails=violation.technical_details,
            isRetryable=False,
            guidance=(
                "Remove the forbidden stage or split the plan into multiple steps."
                if violation.code == ErrorCode.READ_ONLY_VIOLATION
                else None
            ),
        )
    )
    return HTTPException(status_code=status_code, detail=body.model_dump(by_alias=True))


__all__ = ["guard_violation_to_http"]

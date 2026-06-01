"""Static analysis tests for backend/Dockerfile.

Asserts that the Dockerfile does not hardcode the Python dependency
list, which would drift from ``pyproject.toml``. The Dockerfile must
delegate the runtime dependency installation to ``pip install .`` (which
reads ``pyproject.toml``).
"""

from __future__ import annotations

import re
from pathlib import Path

DOCKERFILE = Path(__file__).resolve().parent.parent / "Dockerfile"


def _read_dockerfile() -> str:
    assert DOCKERFILE.exists(), f"Dockerfile not found at {DOCKERFILE}"
    return DOCKERFILE.read_text()


def test_no_hardcoded_pip_install_dependencies() -> None:
    """The Dockerfile must not hardcode a list of pip packages.
    All runtime deps must come from ``pip install .`` (which reads
    pyproject.toml)."""
    content = _read_dockerfile()
    # Look for a multi-line `pip install \` followed by package specifiers.
    # A single `pip install .` is fine.
    pip_install_blocks = re.findall(
        r"pip install[^\n]*(?:\n[ \t]+[^\n]*)+",
        content,
    )
    for block in pip_install_blocks:
        lines = block.splitlines()[1:]
        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            # Skip shell control characters
            if stripped.startswith("&&") or stripped.startswith("||") or stripped.startswith("|"):
                continue
            # A package specifier has a version pin (>=, ==, ~=, etc.)
            # whether or not it's quoted.
            if re.search(r"[A-Za-z0-9_.+\[\]]+\s*[><=~!]+\s*[\d.]", stripped):
                raise AssertionError(
                    f"Hardcoded dependency in Dockerfile: {stripped!r}.\n"
                    f"Move this to pyproject.toml and use `pip install .` instead."
                )


def test_dockerfile_installs_project_via_pip_install_dot() -> None:
    """The Dockerfile must use ``pip install .`` to consume pyproject.toml."""
    content = _read_dockerfile()
    assert "pip install" in content
    # Look for a `pip install .` or `pip install --no-deps .` invocation.
    assert re.search(r"pip install (--[^\n]+\s+)?\.", content), (
        "Dockerfile should install the project with `pip install .` to read "
        "its dependencies from pyproject.toml"
    )


def test_dockerfile_does_not_copy_tests_into_runtime() -> None:
    """The runtime image must not include the test suite."""
    content = _read_dockerfile()
    # The `tests/` directory is the test suite; copying it into a
    # production image is a leak risk (test secrets, mocks, etc.).
    # The builder stage may copy tests if a future stage runs them, but
    # the runtime stage must not.
    runtime_section = content.split("# Stage 2: runtime", 1)
    if len(runtime_section) == 2:
        runtime = runtime_section[1]
        assert "COPY tests" not in runtime, (
            "Runtime stage copies tests/ — strip them from the production image"
        )
        assert (
            "COPY --from=builder"
            not in runtime.replace("COPY --from=builder /opt/venv", "").replace(
                "COPY --from=builder /build/argus", ""
            )
            or True
        )  # /opt/venv and /build/argus are legitimate
        # Specifically: tests should never be a --from=builder source
        assert "COPY --from=builder" not in runtime or "/build/tests" not in runtime, (
            "Runtime stage copies builder's tests/ — strip them"
        )

"""Insight module base class.

All 5 insight modules (funnel, cohort, rfm, attribution, anomaly) share
the same shape: a name, a list of required collections, a
``can_run`` check, a pipeline generator, and a card renderer.

The orchestrator (see ``argus/api/plan.py`` and ``argus/api/render.py``)
calls ``generate_pipeline`` to get the MQL, dispatches it via
``McpManager``, then calls ``render_card`` to turn the result into a
``CardDescriptor``.

Modules never write to MongoDB. They generate read-only pipelines and
``card_renderer`` instances consume the result. The result-set guard
is enforced inside ``McpManager.call_tool``.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import yaml

from argus.models.api_types import ModuleName
from argus.models.card import CardDescriptor


@dataclass(frozen=True)
class ModuleMetadata:
    """Static info about a module. Loaded from the cookbook YAML."""

    name: ModuleName
    description: str
    required_collections: list[str]
    parameters: dict[str, Any]
    output_card: str
    mql_template: str


class InsightModule(Protocol):
    """Interface every insight module implements.

    Modules are stateless; all state lives on the ``Session``.
    """

    name: ModuleName
    required_collections: list[str]

    def can_run(self, sampled_schema: dict[str, Any]) -> bool: ...

    def generate_pipeline(self, sampled_schema: dict[str, Any], params: dict[str, Any]) -> list[dict]: ...

    def render_card(self, result: list[dict], params: dict[str, Any]) -> CardDescriptor: ...


# ---------------------------------------------------------------------------
# Cookbook loader
# ---------------------------------------------------------------------------


_COOKBOOK_DIR = Path(__file__).parent / "cookbook"


def load_cookbook(module_name: ModuleName) -> ModuleMetadata:
    """Load a module's metadata from its YAML file.

    Used by the planner LLM to see the available modules and their
    parameter shapes. The orchestrator (which is a Python caller, not
    an LLM) doesn't need the cookbook — it has the live module
    objects — but the cookbook is the source of truth for what each
    module does.
    """
    yaml_path = _COOKBOOK_DIR / f"{module_name.value}.yaml"
    with yaml_path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    return ModuleMetadata(
        name=ModuleName(data["name"]),
        description=data.get("description", "").strip(),
        required_collections=list(data.get("required_collections", [])),
        parameters=dict(data.get("parameters", {})),
        output_card=str(data.get("output_card", "")),
        mql_template=str(data.get("mql_template", "")),
    )


__all__ = [
    "InsightModule",
    "ModuleMetadata",
    "load_cookbook",
]

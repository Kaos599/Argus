import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorCard } from "./ErrorCard";

describe("ErrorCard — full-page read-only violation variant", () => {
  it("renders inline in a Card by default (no full-page wrapper)", () => {
    render(
      <ErrorCard
        title="Read-only violation"
        message="Cannot drop the users collection."
        errorCode="READ_ONLY_VIOLATION"
        isReadOnlyViolation
      />,
    );
    const card = screen.getByTestId("error-card-root");
    expect(card).toBeInTheDocument();
    expect(card).not.toHaveAttribute("data-full-page");
  });

  it("renders full-page when isFullPage and isReadOnlyViolation are both true", () => {
    render(
      <ErrorCard
        title="Argus is read-only by design"
        message="I cannot drop the users collection."
        errorCode="READ_ONLY_VIOLATION"
        isReadOnlyViolation
        isFullPage
      />,
    );
    const card = screen.getByTestId("error-card-root");
    expect(card).toHaveAttribute("data-full-page", "true");
  });

  it("ignores isFullPage when isReadOnlyViolation is false (only read-only can be full-page)", () => {
    render(
      <ErrorCard
        title="Network error"
        message="Backend unreachable"
        errorCode="CONNECTION_FAILED"
        isRetryable
        isFullPage
      />,
    );
    const card = screen.getByTestId("error-card-root");
    expect(card).not.toHaveAttribute("data-full-page");
  });

  it("full-page read-only ErrorCard shows the 3 layers of write protection", () => {
    render(
      <ErrorCard
        title="Argus is read-only by design"
        message="I cannot drop the users collection."
        errorCode="READ_ONLY_VIOLATION"
        isReadOnlyViolation
        isFullPage
      />,
    );
    expect(screen.getByText(/MCP server runs in read-only mode/i)).toBeInTheDocument();
    expect(screen.getByText(/read-only database user/i)).toBeInTheDocument();
    expect(screen.getByText(/planner-layer guard/i)).toBeInTheDocument();
  });
});

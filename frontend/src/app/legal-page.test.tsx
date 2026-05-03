import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LegalPage } from "./legal-page";

describe("LegalPage", () => {
  it("does not nest logo links", () => {
    const { container } = render(
      <LegalPage
        title="Privacy Policy"
        updatedAt="April 30, 2026"
        intro={["Intro paragraph."]}
        sections={[{ title: "Section", paragraphs: ["Section paragraph."] }]}
      />,
    );

    const logo = screen.getByRole("link", { name: "scrollable.app" });
    expect(logo).toHaveAttribute("href", "/");

    const nestedAnchor = container.querySelector("a a");
    expect(nestedAnchor).toBeNull();
  });

  it("links to changelog from legal page navigation", () => {
    render(
      <LegalPage
        title="Terms of Service"
        updatedAt="April 30, 2026"
        intro={["Intro paragraph."]}
        sections={[{ title: "Section", paragraphs: ["Section paragraph."] }]}
      />,
    );

    expect(screen.getByRole("link", { name: "Changelog" })).toHaveAttribute(
      "href",
      "/changelog",
    );
  });
});

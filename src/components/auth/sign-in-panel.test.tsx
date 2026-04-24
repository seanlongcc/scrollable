import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SignInPanel } from "./sign-in-panel";

describe("SignInPanel", () => {
  it("offers email account creation without Reddit login", () => {
    render(<SignInPanel next="/" />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Minimum 8 characters"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Google" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reddit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Reddit stays a runtime source only, not a login provider.",
      ),
    ).not.toBeInTheDocument();
  });
});

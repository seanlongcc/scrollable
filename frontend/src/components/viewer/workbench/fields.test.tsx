import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NumberField } from "./fields";

describe("NumberField", () => {
  it("lets users clear the draft value without committing an invalid number", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <NumberField
        label="Columns"
        value={2}
        min={1}
        max={16}
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Columns" });

    await user.clear(input);

    expect(input).toHaveValue("");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("can defer committing a valid draft until blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <NumberField
        label="Rows"
        value={1}
        min={1}
        max={16}
        commitOnBlur
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Rows" });

    await user.clear(input);
    await user.type(input, "4");

    expect(onChange).not.toHaveBeenCalled();

    await user.tab();

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("places the caret after the current value on focus", async () => {
    const user = userEvent.setup();
    render(
      <NumberField
        label="Columns"
        value={12}
        min={1}
        max={16}
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Columns" });

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "numeric");

    await user.click(input);

    await waitFor(() => {
      expect(input).toHaveProperty("selectionStart", 2);
      expect(input).toHaveProperty("selectionEnd", 2);
    });
  });
});

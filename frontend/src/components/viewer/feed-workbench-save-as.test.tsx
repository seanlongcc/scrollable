import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
  savedLocalUploadWorkspace,
  stubRandomUuids,
  WORKSPACE_STORAGE_KEY,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench save-as behavior", () => {
  installFeedWorkbenchTestHooks();

  it("creates a separate saved layout when saving an existing save with a new unique name", async () => {
    stubRandomUuids(["layout-copy"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await saveCurrentLayout(user);

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Save layout as",
    });
    const nameInput = within(dialog).getByLabelText("Layout name");
    await user.clear(nameInput);
    await user.type(nameInput, "Saved copy");
    await user.click(
      within(dialog).getByRole("button", { name: "Save as layout" }),
    );

    const store = JSON.parse(
      window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "{}",
    ) as {
      activeWorkspaceId: string;
      workspaces: Array<{ id: string; name: string }>;
    };
    expect(store.activeWorkspaceId).toBe("layout-copy");
    expect(store.workspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Untitled layout" }),
        expect.objectContaining({ id: "layout-copy", name: "Saved copy" }),
      ]),
    );
    expect(store.workspaces).toHaveLength(2);
  });

  it("blocks saved layout names instead of overwriting an existing save", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await saveCurrentLayout(user);

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Save layout as",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Save as layout" }),
    );

    expect(
      within(dialog).getByText("Layout names must be unique"),
    ).toBeInTheDocument();
    const store = JSON.parse(
      window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "{}",
    ) as { workspaces: Array<{ id: string; name: string }> };
    expect(store.workspaces).toHaveLength(1);
    expect(store.workspaces[0]?.name).toBe("Untitled layout");
  });

  it("renames a saved layout from the library more menu", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [savedLocalUploadWorkspace()],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Library" }));
    const dialog = await screen.findByRole("dialog", { name: "Library" });
    await user.click(
      within(dialog).getByRole("button", {
        name: "More actions for Saved local",
      }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));

    const renameDialog = await screen.findByRole("dialog", {
      name: "Rename layout",
    });
    const nameInput = within(renameDialog).getByLabelText("Layout name");
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed layout");
    await user.click(
      within(renameDialog).getByRole("button", { name: "Rename layout" }),
    );

    expect(
      within(dialog).getByRole("checkbox", { name: "Select Renamed layout" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("checkbox", { name: "Select Saved local" }),
    ).not.toBeInTheDocument();

    const store = JSON.parse(
      window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "{}",
    ) as { workspaces: Array<{ id: string; name: string }> };
    expect(store.workspaces[0]?.name).toBe("Renamed layout");
  });
});

async function saveCurrentLayout(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Save layout" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Save layout as",
  });
  await user.click(
    within(dialog).getByRole("button", { name: "Save as layout" }),
  );
}

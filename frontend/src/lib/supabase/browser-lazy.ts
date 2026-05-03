type SupabaseBrowserClient = ReturnType<
  typeof import("./browser").createSupabaseBrowserClient
>;

export async function createLazySupabaseBrowserClient(): Promise<SupabaseBrowserClient> {
  const { createSupabaseBrowserClient } = await import("./browser");
  return createSupabaseBrowserClient();
}

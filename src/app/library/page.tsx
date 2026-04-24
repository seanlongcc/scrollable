import Link from "next/link";

import {
  addConfigToCollection,
  addTagToCollection,
  createCollection,
  createFeedConfig,
  createShareLink,
  createTag,
  deleteFeedConfig,
  updateFeedConfig,
} from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_FEED_TIMER_SECONDS } from "@/lib/config/feed-config";
import { getLibraryMetadata } from "@/lib/data/library";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const library = await getLibraryMetadata();
  const canUseAccountLibrary = library.isConfigured && library.user;

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              library
            </p>
            <h1 className="text-2xl font-semibold">Saved metadata</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Viewer</Link>
          </Button>
        </header>

        {!library.isConfigured ? (
          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <CardTitle>Supabase env missing</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Set Supabase env vars before saving configs or collections.
            </CardContent>
          </Card>
        ) : null}

        {library.isConfigured && !library.user ? (
          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <CardTitle>Account library locked</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <p>
                Local layouts are available from the viewer without login. Sign in from
                the viewer overlay to sync layouts and edit account metadata here.
              </p>
              <Button asChild variant="outline">
                <Link href="/">Open viewer layouts</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {canUseAccountLibrary ? (
        <>
        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <CardTitle>New Reddit config</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createFeedConfig} className="grid gap-3">
                <Field name="name" label="Name" placeholder="Evening reels" />
                <Field name="subreddit" label="Subreddit" placeholder="pics" />
                <div className="grid grid-cols-3 gap-2">
                  <Field name="limit" label="Limit" defaultValue="20" />
                  <Field name="skip" label="Skip" defaultValue="0" />
                  <Field
                    name="timerSeconds"
                    label="Timer"
                    defaultValue={String(DEFAULT_FEED_TIMER_SECONDS)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field name="sort" label="Sort" defaultValue="top" />
                  <Field name="timeRange" label="Range" defaultValue="day" />
                </div>
                <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                  NSFW
                  <Switch name="isNsfw" />
                </label>
                <Button type="submit">Save</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border/60">
            <CardHeader>
              <CardTitle>New collection</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createCollection} className="grid gap-3">
                <Field name="name" label="Name" placeholder="Night stack" />
                <Label className="grid gap-1 text-sm">
                  Description
                  <Textarea name="description" />
                </Label>
                <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                  NSFW
                  <Switch name="isNsfw" />
                </label>
                <Button type="submit">Create</Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-lg border border-border/60">
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <form action={createTag} className="flex gap-2">
              <Input name="name" placeholder="cinematic" />
              <Button type="submit" variant="outline">
                Add
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {library.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <MetadataList title="Configs" empty="No saved configs">
            {library.configs.map((config) => (
              <li
                key={config.id}
                className="rounded-lg border border-border/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{config.name}</div>
                    <div className="text-sm text-muted-foreground">
                      r/{config.subreddit} · {config.sort}/{config.time_range} ·{" "}
                      {config.limit_count} · skip {config.skip_count}
                    </div>
                  </div>
                  {config.is_nsfw ? <Badge variant="outline">NSFW</Badge> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <details className="w-full rounded-lg border border-border/60 p-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      Edit
                    </summary>
                    <form action={updateFeedConfig} className="mt-3 grid gap-2">
                      <input type="hidden" name="id" value={config.id} />
                      <Field name="name" label="Name" defaultValue={config.name} />
                      <Field
                        name="subreddit"
                        label="Subreddit"
                        defaultValue={config.subreddit}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Field
                          name="limit"
                          label="Limit"
                          defaultValue={String(config.limit_count)}
                        />
                        <Field
                          name="skip"
                          label="Skip"
                          defaultValue={String(config.skip_count)}
                        />
                        <Field
                          name="timerSeconds"
                          label="Timer"
                          defaultValue={String(config.timer_seconds)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field name="sort" label="Sort" defaultValue={config.sort} />
                        <Field
                          name="timeRange"
                          label="Range"
                          defaultValue={config.time_range}
                        />
                      </div>
                      <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                        NSFW
                        <Switch name="isNsfw" defaultChecked={config.is_nsfw} />
                      </label>
                      <Button size="sm">Save</Button>
                    </form>
                  </details>
                  <form action={createShareLink}>
                    <input type="hidden" name="targetType" value="config" />
                    <input type="hidden" name="targetId" value={config.id} />
                    <Button size="sm" variant="outline">
                      Share
                    </Button>
                  </form>
                  <form action={deleteFeedConfig}>
                    <input type="hidden" name="id" value={config.id} />
                    <Button size="sm" variant="destructive">
                      Delete
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </MetadataList>

          <MetadataList title="Collections" empty="No collections">
            {library.collections.map((collection) => (
              <li
                key={collection.id}
                className="rounded-lg border border-border/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{collection.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {collection.description || "No description"}
                    </div>
                  </div>
                  {collection.is_nsfw ? <Badge variant="outline">NSFW</Badge> : null}
                </div>
                <form action={addConfigToCollection} className="mt-3 flex gap-2">
                  <input
                    type="hidden"
                    name="collectionId"
                    value={collection.id}
                  />
                  <select
                    name="feedConfigId"
                    className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
                  >
                    {library.configs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline">
                    Add
                  </Button>
                </form>
                <form action={createShareLink} className="mt-2">
                  <input type="hidden" name="targetType" value="collection" />
                  <input type="hidden" name="targetId" value={collection.id} />
                  <Button size="sm" variant="outline">
                    Share
                  </Button>
                </form>
                <form action={addTagToCollection} className="mt-2 flex gap-2">
                  <input
                    type="hidden"
                    name="collectionId"
                    value={collection.id}
                  />
                  <select
                    name="tagId"
                    className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
                  >
                    {library.tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline">
                    Tag
                  </Button>
                </form>
                <div className="mt-2 flex flex-wrap gap-1">
                  {library.collectionTags
                    .filter((item) => item.collection_id === collection.id)
                    .map((item) => {
                      const tag = library.tags.find((tag) => tag.id === item.tag_id);
                      return tag ? (
                        <Badge key={tag.id} variant="secondary">
                          {tag.name}
                        </Badge>
                      ) : null;
                    })}
                </div>
              </li>
            ))}
          </MetadataList>
        </section>

        <MetadataList title="Share links" empty="No share links">
          {library.shareLinks.map((link) => (
            <li key={link.id} className="rounded-lg border border-border/60 p-3">
              <div className="font-mono text-sm">{link.slug}</div>
              <div className="text-sm text-muted-foreground">
                {link.feed_config_id ? "Config" : "Collection"} ·{" "}
                {link.is_enabled ? "enabled" : "disabled"}
              </div>
            </li>
          ))}
        </MetadataList>
        </>
        ) : null}
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <Label className="grid gap-1 text-sm">
      {label}
      <Input name={name} placeholder={placeholder} defaultValue={defaultValue} />
    </Label>
  );
}

function MetadataList({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg border border-border/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Separator className="mb-3" />
        <ul className="grid gap-2 text-sm">
          {Array.isArray(children) && children.length === 0 ? (
            <li className="text-muted-foreground">{empty}</li>
          ) : (
            children
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

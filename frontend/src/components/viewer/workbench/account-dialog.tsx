import { LogOut, Mail, RefreshCw, Trash2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { ReleaseVersionLink } from "@/components/release-version-link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LocalFileCacheStorageStatus } from "@/lib/local-uploads/file-cache";
import { cn } from "@/lib/utils";
import {
  accountLegalFooterClass,
  anchoredDialogClass,
  centeredDialogClass,
  metadataBlockClass,
  sectionLabelClass,
} from "./dialog-styles";
import {
  CloudUsageMeter,
  LocalCacheUsageMeter,
  StorageBadge,
  localCacheUsageText,
} from "./cloud-save-dialog-parts";
import type { CloudUsageState } from "./cloud-save-state";
import { cloudCountLabel, cloudUsageLabel } from "./cloud-save-state";
import type { AccountState } from "./types";

type AuthMode = "sign-in" | "sign-up";

const accountAuthActionButtonClass =
  "min-w-0 overflow-hidden rounded-lg px-2 font-normal md:font-normal";

function focusAuthDialogSurface(event: Event) {
  event.preventDefault();
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.focus({ preventScroll: true });
  }
}

export function AccountDialog({
  open,
  onOpenChange,
  account,
  localCacheStatus,
  cloudUsage = { status: "signed-out" },
  onRefreshLocalCacheStatus,
  onClearLocalCache,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountState;
  localCacheStatus: LocalFileCacheStorageStatus | null;
  cloudUsage?: CloudUsageState;
  onRefreshLocalCacheStatus: () => void | Promise<void>;
  onClearLocalCache: () => void | Promise<void>;
  onSignOut: () => Promise<void> | void;
}) {
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }

  function handleAccountOpenChange(nextOpen: boolean) {
    if (!nextOpen) setIsAuthOpen(false);
    onOpenChange(nextOpen);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleAccountOpenChange}>
        <DialogContent className={anchoredDialogClass} showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="font-semibold">Account</DialogTitle>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close dialog"
                  className="size-12 min-h-12 min-w-12 md:size-8 md:min-h-0 md:min-w-0"
                >
                  <X />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription className="sr-only">
              View account status and sign-in actions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 rounded-xl border border-border/70 bg-background/65 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className={sectionLabelClass}>Local media cache</p>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Refresh local cache status"
                  aria-label="Refresh local cache status"
                  onClick={() => void onRefreshLocalCacheStatus()}
                  className="size-11 min-h-11 min-w-11 text-muted-foreground md:size-8 md:min-h-0 md:min-w-0"
                >
                  <RefreshCw />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Clear local media cache"
                  aria-label="Clear local media cache"
                  onClick={() => void onClearLocalCache()}
                  className="size-11 min-h-11 min-w-11 text-destructive hover:bg-destructive/15 hover:text-destructive md:size-8 md:min-h-0 md:min-w-0"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <p className="text-wrap-anywhere font-mono text-[11px] leading-4 text-muted-foreground">
              {localCacheUsageText(localCacheStatus)}
            </p>
            <LocalCacheUsageMeter status={localCacheStatus} />
            {localCacheStatus?.freeLabel ? (
              <p className="text-wrap-anywhere text-xs text-muted-foreground">
                {localCacheStatus.freeLabel}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2 rounded-xl border border-border/70 bg-background/65 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className={sectionLabelClass}>Cloud metadata</p>
              <StorageBadge target="cloud" />
            </div>
            <p className="text-wrap-anywhere font-mono text-[11px] leading-4 text-muted-foreground">
              {cloudUsageLabel(cloudUsage)}
            </p>
            <CloudUsageMeter usage={cloudUsage} />
            <p className="text-wrap-anywhere text-xs text-muted-foreground">
              {cloudCountLabel(cloudUsage)}
            </p>
          </div>
          {account.status === "signed-in" ? (
            <div className="grid gap-3">
              <div className={cn(metadataBlockClass, "grid gap-1")}>
                <p className={sectionLabelClass}>Signed in</p>
                <p className="text-wrap-anywhere text-sm font-medium">
                  {account.email}
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void onSignOut()}
              >
                <LogOut />
                Log out
              </Button>
            </div>
          ) : account.status === "loading" ? (
            <p className="text-sm text-muted-foreground">Checking account...</p>
          ) : (
            <div className="grid gap-2">
              <div className={cn(metadataBlockClass, "grid gap-1")}>
                <p className={sectionLabelClass}>Signed out</p>
                <p className="text-sm">
                  Sign in to save layout metadata and templates to Cloud.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  onClick={() => openAuth("sign-in")}
                  className={accountAuthActionButtonClass}
                >
                  <Mail />
                  <span className="min-w-0 truncate">Sign in</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openAuth("sign-up")}
                  className={accountAuthActionButtonClass}
                >
                  <UserPlus />
                  <span className="min-w-0 truncate">Sign up</span>
                </Button>
              </div>
            </div>
          )}
          <footer className={cn(accountLegalFooterClass, "md:hidden")}>
            <Link className="hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-foreground" href="/changelog">
              Changelog
            </Link>
            <ReleaseVersionLink className="hover:text-foreground" />
          </footer>
        </DialogContent>
      </Dialog>
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent
          className={centeredDialogClass}
          onOpenAutoFocus={focusAuthDialogSurface}
        >
          <DialogHeader>
            <DialogTitle className="font-semibold">
              {authMode === "sign-up" ? "Sign up" : "Sign in"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {authMode === "sign-up"
                ? "Create an account with email and password."
                : "Sign in with email and password."}
            </DialogDescription>
          </DialogHeader>
          <SignInPanel mode={authMode} next="/" />
        </DialogContent>
      </Dialog>
    </>
  );
}

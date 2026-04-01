"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Lock,
  Database,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Tag as TagIcon,
  Plus,
  Pencil,
  Check,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { updateProfile, changePassword, exportData, deleteAccount, getTags, createTag, updateTag, deleteTag } from "@/lib/api";
import type { Tag } from "@/types/task";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#a16207",
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, refreshUser } = useAuth();

  // Profile section
  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Security section
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Data section
  const [exporting, setExporting] = useState(false);

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Tags section
  const [tags, setTags] = useState<Tag[]>([]);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[5]);
  const [creatingTag, setCreatingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? "");
    }
  }, [user]);

  useEffect(() => {
    getTags()
      .then(setTags)
      .catch(() => setTags([]));
  }, []);

  const displayNameChanged = displayName.trim() !== (user?.display_name ?? "");

  async function handleSaveProfile() {
    if (!displayNameChanged) return;
    setProfileSaving(true);
    try {
      await updateProfile({ display_name: displayName.trim() });
      await refreshUser();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zeitro-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export data");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      toast.error("Enter your password to confirm");
      return;
    }
    if (!deleteConfirmed) {
      toast.error("Please check the confirmation checkbox");
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      toast.success("Account deleted");
      router.replace("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const tag = await createTag(newTagName.trim(), newTagColor);
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTagName("");
      setNewTagColor(PRESET_COLORS[5]);
      setShowNewTag(false);
      toast.success("Tag created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setCreatingTag(false);
    }
  }

  function startEditTag(tag: Tag) {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  async function commitEditTag(tag: Tag) {
    const trimmed = editingTagName.trim();
    setEditingTagId(null);
    if (!trimmed || trimmed === tag.name) return;
    try {
      const updated = await updateTag(tag.id, { name: trimmed });
      setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Tag renamed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename tag");
    }
  }

  async function handleDeleteTag(id: string) {
    try {
      await deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tag deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tag");
    }
  }

  const balance = user?.currency_balance ?? 0;
  const displayNameValue = user?.display_name ?? "there";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar currencyBalance={balance} userName={displayNameValue} />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="mx-auto max-w-2xl px-4 py-6 md:px-8">
            {/* Back button */}
            <button
              onClick={() => router.push("/")}
              className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {/* Page header */}
            <div className="mb-6">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Account
              </p>
              <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight">Settings</h1>
            </div>

            {/* Profile section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Profile
                </p>
              </div>

              <div className="space-y-4">
                {/* Display name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="display-name"
                    className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Display Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-0"
                      placeholder="Your name"
                    />
                    <button
                      onClick={handleSaveProfile}
                      disabled={!displayNameChanged || profileSaving}
                      className="flex h-9 items-center rounded-md bg-foreground px-4 text-xs font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {profileSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Email
                  </label>
                  <p className="rounded-md border border-border bg-secondary/10 px-3 py-2 text-sm text-muted-foreground">
                    {user?.email ?? "—"}
                  </p>
                </div>

                {/* Theme */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Theme
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Toggle between dark and light mode
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </section>

            <Separator className="my-6" />

            {/* Tags section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Tags
                  </p>
                </div>
                <button
                  onClick={() => { setShowNewTag((v) => !v); setNewTagName(""); }}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/40"
                >
                  <Plus className="h-3 w-3" />
                  New Tag
                </button>
              </div>

              {/* New tag form */}
              {showNewTag && (
                <div className="mb-3 rounded-lg border border-border bg-secondary/20 p-3 space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag(); if (e.key === "Escape") setShowNewTag(false); }}
                      placeholder="Tag name"
                      autoFocus
                      className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                    />
                    <button
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || creatingTag}
                      className="flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {creatingTag ? "Adding…" : "Add"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewTagColor(c)}
                        className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: c, outline: newTagColor === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
                        aria-label={`Select color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tag list */}
              {tags.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">No tags yet. Create one above.</p>
              ) : (
                <div className="space-y-1">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 group"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {editingTagId === tag.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingTagName}
                          onChange={(e) => setEditingTagName(e.target.value)}
                          onBlur={() => commitEditTag(tag)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEditTag(tag); if (e.key === "Escape") setEditingTagId(null); }}
                          className="flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                        />
                      ) : (
                        <span className="flex-1 text-sm text-foreground">{tag.name}</span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditTag(tag)}
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          aria-label={`Rename ${tag.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label={`Delete ${tag.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator className="my-6" />

            {/* Security section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Security
                </p>
              </div>

              <div className="space-y-3">
                {/* Current password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="current-password"
                    className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="current-password"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                      placeholder="Current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showCurrent ? "Hide password" : "Show password"}
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-password"
                    className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="confirm-password"
                    className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Mismatch hint */}
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-destructive">Passwords do not match</p>
                  )}
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                  className="flex h-9 items-center rounded-md bg-foreground px-4 text-xs font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {passwordSaving ? "Updating…" : "Update Password"}
                </button>
              </div>
            </section>

            <Separator className="my-6" />

            {/* Data section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Data
                </p>
              </div>

              <div className="space-y-4">
                {/* Export */}
                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Export Data</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Download all your tasks and sessions as JSON
                    </p>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {exporting ? "Exporting…" : "Export"}
                  </button>
                </div>

                {/* Delete account */}
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-destructive">Delete Account</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Permanently remove your account and all data
                      </p>
                    </div>
                    {!deleteOpen && (
                      <button
                        onClick={() => setDeleteOpen(true)}
                        className="flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>

                  {deleteOpen && (
                    <div className="space-y-3 pt-1">
                      {/* Password confirmation */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="delete-password"
                          className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                        >
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            id="delete-password"
                            type={showDeletePassword ? "text" : "password"}
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            className="w-full rounded-md border border-destructive/30 bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-destructive/60 focus:outline-none"
                            placeholder="Your current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowDeletePassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showDeletePassword ? "Hide password" : "Show password"}
                          >
                            {showDeletePassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Confirmation checkbox */}
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deleteConfirmed}
                          onChange={(e) => setDeleteConfirmed(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border border-destructive/40 accent-destructive"
                        />
                        <span className="text-xs text-muted-foreground leading-relaxed">
                          I understand this is permanent and cannot be undone. All tasks, sessions,
                          and data will be deleted.
                        </span>
                      </label>

                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleting || !deletePassword || !deleteConfirmed}
                          className="flex h-9 items-center gap-1.5 rounded-md bg-destructive px-4 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deleting ? "Deleting…" : "Delete My Account"}
                        </button>
                        <button
                          onClick={() => {
                            setDeleteOpen(false);
                            setDeletePassword("");
                            setDeleteConfirmed(false);
                          }}
                          className="flex h-9 items-center rounded-md border border-border px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <Separator className="my-6" />

            {/* About section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  About
                </p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Version</span>
                  <span className="font-mono text-xs countdown-digits">v1.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Build</span>
                  <span className="font-mono text-xs countdown-digits">{process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}</span>
                </div>
              </div>
            </section>

            <div className="h-8" />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

<script lang="ts">
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import {
    ArrowLeft, User, Lock, Database, Trash2, Download,
    Eye, EyeOff, Tag as TagIcon, Plus, Pencil, Check
  } from 'lucide-svelte';
  import { user, isLoading, refreshUser } from '$lib/auth';
  import { updateProfile, changePassword, exportData, deleteAccount, getTags, createTag, updateTag, deleteTag } from '$lib/api';
  import type { Tag } from '$lib/types/task';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import TopBar from '$lib/components/TopBar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#a16207',
  ];

  // Profile
  let displayNameInput = $state('');
  let profileSaving = $state(false);

  // Security
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let showCurrent = $state(false);
  let showNew = $state(false);
  let showConfirm = $state(false);
  let passwordSaving = $state(false);

  // Data
  let exporting = $state(false);

  // Delete account
  let deleteOpen = $state(false);
  let deletePassword = $state('');
  let deleteConfirmed = $state(false);
  let showDeletePassword = $state(false);
  let deleting = $state(false);

  // Tags
  let tags = $state<Tag[]>([]);
  let showNewTag = $state(false);
  let newTagName = $state('');
  let newTagColor = $state(PRESET_COLORS[5]);
  let creatingTag = $state(false);
  let editingTagId = $state<string | null>(null);
  let editingTagName = $state('');

  let balance = $derived($user?.currency_balance ?? 0);
  let displayNameValue = $derived($user?.display_name ?? 'there');

  $effect(() => {
    if (!$isLoading && !$user) {
      goto('/login', { replaceState: true });
    }
  });

  $effect(() => {
    if ($user) displayNameInput = $user.display_name ?? '';
  });

  $effect(() => {
    getTags().then(t => tags = t).catch(() => tags = []);
  });

  let displayNameChanged = $derived(displayNameInput.trim() !== ($user?.display_name ?? ''));

  async function handleSaveProfile() {
    if (!displayNameChanged) return;
    profileSaving = true;
    try {
      await updateProfile({ display_name: displayNameInput.trim() });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      profileSaving = false;
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    passwordSaving = true;
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password updated');
      currentPassword = ''; newPassword = ''; confirmPassword = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      passwordSaving = false;
    }
  }

  async function handleExport() {
    exporting = true;
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zeitro-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      exporting = false;
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) { toast.error('Enter your password to confirm'); return; }
    if (!deleteConfirmed) { toast.error('Please check the confirmation checkbox'); return; }
    deleting = true;
    try {
      await deleteAccount(deletePassword);
      toast.success('Account deleted');
      goto('/login', { replaceState: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
      deleting = false;
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    creatingTag = true;
    try {
      const tag = await createTag(newTagName.trim(), newTagColor);
      tags = [...tags, tag].sort((a, b) => a.name.localeCompare(b.name));
      newTagName = '';
      newTagColor = PRESET_COLORS[5];
      showNewTag = false;
      toast.success('Tag created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      creatingTag = false;
    }
  }

  function startEditTag(tag: Tag) {
    editingTagId = tag.id;
    editingTagName = tag.name;
  }

  async function commitEditTag(tag: Tag) {
    const trimmed = editingTagName.trim();
    editingTagId = null;
    if (!trimmed || trimmed === tag.name) return;
    try {
      const updated = await updateTag(tag.id, { name: trimmed });
      tags = tags.map(t => t.id === updated.id ? updated : t).sort((a, b) => a.name.localeCompare(b.name));
      toast.success('Tag renamed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename tag');
    }
  }

  async function handleDeleteTag(id: string) {
    try {
      await deleteTag(id);
      tags = tags.filter(t => t.id !== id);
      toast.success('Tag deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  }
</script>

{#if $isLoading}
  <div class="flex h-screen items-center justify-center">
    <p class="text-[11px] uppercase tracking-widest text-muted-foreground">Loading…</p>
  </div>
{:else}
  <div class="flex h-screen overflow-hidden">
    <Sidebar />

    <div class="flex flex-1 flex-col overflow-hidden">
      <TopBar currencyBalance={balance} userName={displayNameValue} />

      <main class="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div class="mx-auto max-w-2xl px-4 py-6 md:px-8">
          <!-- Back button -->
          <button
            onclick={() => goto('/')}
            class="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft class="h-4 w-4" />
            Back
          </button>

          <div class="mb-6">
            <p class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Account</p>
            <h1 class="mt-1 font-heading text-xl font-semibold tracking-tight">Settings</h1>
          </div>

          <!-- Profile -->
          <section>
            <div class="flex items-center gap-2 mb-4">
              <User class="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Profile</p>
            </div>

            <div class="space-y-4">
              <div class="space-y-1.5">
                <label for="display-name" class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Display Name
                </label>
                <div class="flex gap-2">
                  <input
                    id="display-name"
                    type="text"
                    bind:value={displayNameInput}
                    class="flex-1 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                    placeholder="Your name"
                  />
                  <button
                    onclick={handleSaveProfile}
                    disabled={!displayNameChanged || profileSaving}
                    class="flex h-9 items-center rounded-md bg-foreground px-4 text-xs font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {profileSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              <div class="space-y-1.5">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Email</p>
                <p class="rounded-md border border-border bg-secondary/10 px-3 py-2 text-sm text-muted-foreground">
                  {$user?.email ?? '—'}
                </p>
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Theme</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">Toggle between dark and light mode</p>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </section>

          <div class="h-px bg-border my-6"></div>

          <!-- Tags -->
          <section>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <TagIcon class="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Tags</p>
              </div>
              <button
                onclick={() => { showNewTag = !showNewTag; newTagName = ''; }}
                class="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/40"
              >
                <Plus class="h-3 w-3" />
                New Tag
              </button>
            </div>

            {#if showNewTag}
              <div class="mb-3 rounded-lg border border-border bg-secondary/20 p-3 space-y-2.5">
                <div class="flex gap-2">
                  <input
                    type="text"
                    bind:value={newTagName}
                    onkeydown={(e) => { if (e.key === 'Enter') handleCreateTag(); if (e.key === 'Escape') showNewTag = false; }}
                    placeholder="Tag name"
                    class="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                  />
                  <button
                    onclick={handleCreateTag}
                    disabled={!newTagName.trim() || creatingTag}
                    class="flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {creatingTag ? 'Adding…' : 'Add'}
                  </button>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  {#each PRESET_COLORS as c}
                    <button
                      type="button"
                      onclick={() => newTagColor = c}
                      class="h-5 w-5 rounded-full transition-transform hover:scale-110"
                      style="background-color: {c}; {newTagColor === c ? `outline: 2px solid ${c}; outline-offset: 2px;` : ''}"
                      aria-label="Select color {c}"
                    ></button>
                  {/each}
                </div>
              </div>
            {/if}

            {#if tags.length === 0}
              <p class="text-[12px] text-muted-foreground">No tags yet. Create one above.</p>
            {:else}
              <div class="space-y-1">
                {#each tags as tag (tag.id)}
                  <div class="group flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background-color: {tag.color}"></span>
                    {#if editingTagId === tag.id}
                      <input
                        type="text"
                        bind:value={editingTagName}
                        onblur={() => commitEditTag(tag)}
                        onkeydown={(e) => { if (e.key === 'Enter') commitEditTag(tag); if (e.key === 'Escape') editingTagId = null; }}
                        class="flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                      />
                    {:else}
                      <span class="flex-1 text-sm text-foreground">{tag.name}</span>
                    {/if}
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onclick={() => startEditTag(tag)}
                        class="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        aria-label="Rename {tag.name}"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                      </button>
                      <button
                        onclick={() => handleDeleteTag(tag.id)}
                        class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Delete {tag.name}"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </section>

          <div class="h-px bg-border my-6"></div>

          <!-- Security -->
          <section>
            <div class="flex items-center gap-2 mb-4">
              <Lock class="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Security</p>
            </div>

            <div class="space-y-3">
              <div class="space-y-1.5">
                <label for="current-password" class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Current Password
                </label>
                <div class="relative">
                  <input
                    id="current-password"
                    type={showCurrent ? 'text' : 'password'}
                    bind:value={currentPassword}
                    class="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                    placeholder="Current password"
                  />
                  <button
                    type="button"
                    onclick={() => showCurrent = !showCurrent}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                  >
                    {#if showCurrent}
                      <EyeOff class="h-4 w-4" />
                    {:else}
                      <Eye class="h-4 w-4" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="space-y-1.5">
                <label for="new-password" class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  New Password
                </label>
                <div class="relative">
                  <input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    bind:value={newPassword}
                    class="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onclick={() => showNew = !showNew}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    {#if showNew}
                      <EyeOff class="h-4 w-4" />
                    {:else}
                      <Eye class="h-4 w-4" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="space-y-1.5">
                <label for="confirm-password" class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Confirm New Password
                </label>
                <div class="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    bind:value={confirmPassword}
                    class="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    onclick={() => showConfirm = !showConfirm}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {#if showConfirm}
                      <EyeOff class="h-4 w-4" />
                    {:else}
                      <Eye class="h-4 w-4" />
                    {/if}
                  </button>
                </div>
                {#if confirmPassword.length > 0 && newPassword !== confirmPassword}
                  <p class="text-[11px] text-destructive">Passwords do not match</p>
                {/if}
              </div>

              <button
                onclick={handleChangePassword}
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                class="flex h-9 items-center rounded-md bg-foreground px-4 text-xs font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {passwordSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </section>

          <div class="h-px bg-border my-6"></div>

          <!-- Data -->
          <section>
            <div class="flex items-center gap-2 mb-4">
              <Database class="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Data</p>
            </div>

            <div class="space-y-4">
              <!-- Export -->
              <div class="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p class="text-sm font-medium">Export Data</p>
                  <p class="text-[11px] text-muted-foreground mt-0.5">Download all your tasks and sessions as JSON</p>
                </div>
                <button
                  onclick={handleExport}
                  disabled={exporting}
                  class="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download class="h-3.5 w-3.5" />
                  {exporting ? 'Exporting…' : 'Export'}
                </button>
              </div>

              <!-- Delete account -->
              <div class="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-destructive">Delete Account</p>
                    <p class="text-[11px] text-muted-foreground mt-0.5">Permanently remove your account and all data</p>
                  </div>
                  {#if !deleteOpen}
                    <button
                      onclick={() => deleteOpen = true}
                      class="flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                      Delete
                    </button>
                  {/if}
                </div>

                {#if deleteOpen}
                  <div class="space-y-3 pt-1">
                    <div class="space-y-1.5">
                      <label for="delete-password" class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Confirm Password
                      </label>
                      <div class="relative">
                        <input
                          id="delete-password"
                          type={showDeletePassword ? 'text' : 'password'}
                          bind:value={deletePassword}
                          class="w-full rounded-md border border-destructive/30 bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-destructive/60 focus:outline-none"
                          placeholder="Your current password"
                        />
                        <button
                          type="button"
                          onclick={() => showDeletePassword = !showDeletePassword}
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showDeletePassword ? 'Hide password' : 'Show password'}
                        >
                          {#if showDeletePassword}
                            <EyeOff class="h-4 w-4" />
                          {:else}
                            <Eye class="h-4 w-4" />
                          {/if}
                        </button>
                      </div>
                    </div>

                    <label class="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        bind:checked={deleteConfirmed}
                        class="mt-0.5 h-4 w-4 shrink-0 rounded border border-destructive/40 accent-destructive"
                      />
                      <span class="text-xs text-muted-foreground leading-relaxed">
                        I understand this is permanent and cannot be undone. All tasks, sessions, and data will be deleted.
                      </span>
                    </label>

                    <div class="flex gap-2">
                      <button
                        onclick={handleDeleteAccount}
                        disabled={deleting || !deletePassword || !deleteConfirmed}
                        class="flex h-9 items-center gap-1.5 rounded-md bg-destructive px-4 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                        {deleting ? 'Deleting…' : 'Delete My Account'}
                      </button>
                      <button
                        onclick={() => { deleteOpen = false; deletePassword = ''; deleteConfirmed = false; }}
                        class="flex h-9 items-center rounded-md border border-border px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </section>

          <div class="h-px bg-border my-6"></div>

          <!-- About -->
          <section>
            <div class="flex items-center gap-2 mb-4">
              <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">About</p>
            </div>
            <div class="space-y-3 text-sm text-muted-foreground">
              <div class="flex items-center justify-between">
                <span>Version</span>
                <span class="font-mono text-xs countdown-digits">v1.0.0</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Build</span>
                <span class="font-mono text-xs countdown-digits">{import.meta.env.VITE_BUILD_ID ?? 'dev'}</span>
              </div>
              <button
                onclick={() => goto('/about')}
                class="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
              >
                <span>About Zeitro</span>
                <ArrowLeft class="h-4 w-4 rotate-180 text-muted-foreground" />
              </button>
            </div>
          </section>

          <div class="h-8"></div>
        </div>
      </main>
    </div>

    <BottomNav />
  </div>
{/if}

<script lang="ts">
  import { Sun, Moon } from 'lucide-svelte';
  import { updateProfile } from '$lib/api';
  import { onMount } from 'svelte';

  let { class: className = '' }: { class?: string } = $props();

  let isDark = $state(true);

  onMount(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light') {
      isDark = false;
      document.documentElement.classList.remove('dark');
    } else {
      isDark = true;
      document.documentElement.classList.add('dark');
    }
  });

  function toggle() {
    isDark = !isDark;
    const theme = isDark ? 'dark' : 'light';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    updateProfile({ theme_preference: theme }).catch(() => {});
  }
</script>

<button
  onclick={toggle}
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  class="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground {className}"
>
  {#if isDark}
    <Sun class="h-[18px] w-[18px]" strokeWidth={1.5} />
  {:else}
    <Moon class="h-[18px] w-[18px]" strokeWidth={1.5} />
  {/if}
</button>

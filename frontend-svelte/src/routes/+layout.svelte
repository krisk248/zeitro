<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import { initAuth } from '$lib/auth';

  let { children } = $props();

  onMount(async () => {
    await initAuth();
  });
</script>

<svelte:head>
  <title>Zeitro</title>
  <meta name="description" content="Gamified countdown task tracker" />
</svelte:head>

{@render children()}

<Toaster
  theme="system"
  position="bottom-right"
  toastOptions={{
    style: 'background: var(--popover); border: 1px solid var(--border); color: var(--foreground); font-size: 13px;'
  }}
/>

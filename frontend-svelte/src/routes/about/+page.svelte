<script lang="ts">
  import { goto } from '$app/navigation';
  import { Timer, ArrowLeft, Clock, Brain, TrendingDown, Zap } from 'lucide-svelte';
</script>

<div class="min-h-screen bg-background">
  <div class="mx-auto max-w-2xl px-6 py-10 md:px-8">
    <!-- Back -->
    <button
      onclick={() => goto('/')}
      class="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" />
      Back
    </button>

    <!-- Logo + Name -->
    <div class="flex items-center gap-3 mb-2">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
        <Timer class="h-5 w-5 text-background" strokeWidth={2} />
      </div>
      <h1 class="font-heading text-3xl font-bold tracking-tight">Zeitro</h1>
    </div>
    <p class="text-sm text-muted-foreground mb-8">A gamified countdown task tracker</p>

    <!-- The Name -->
    <section class="mb-10">
      <h2 class="font-heading text-lg font-semibold tracking-tight mb-3">Why "Zeitro"?</h2>
      <div class="rounded-lg border border-border bg-secondary/20 p-5">
        <div class="flex items-center gap-4 mb-4">
          <div class="flex flex-col items-center">
            <span class="font-heading text-2xl font-bold text-chart-2">Zeit</span>
            <span class="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">German</span>
          </div>
          <span class="text-2xl text-muted-foreground">+</span>
          <div class="flex flex-col items-center">
            <span class="font-heading text-2xl font-bold text-chart-1">Hero</span>
            <span class="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">English</span>
          </div>
          <span class="text-2xl text-muted-foreground">=</span>
          <div class="flex flex-col items-center">
            <span class="font-heading text-2xl font-bold">Zeitro</span>
            <span class="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Time Hero</span>
          </div>
        </div>
        <p class="text-sm text-muted-foreground leading-relaxed">
          <strong class="text-foreground">Zeit</strong> is the German word for "time".
          Combined with <strong class="text-foreground">Hero</strong>, Zeitro represents
          the idea of becoming the hero of your own time — mastering deadlines instead of being controlled by them.
        </p>
      </div>
    </section>

    <div class="h-px bg-border my-8"></div>

    <!-- Parkinson's Law -->
    <section class="mb-10">
      <div class="flex items-center gap-2 mb-1">
        <Brain class="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">The Science</p>
      </div>
      <h2 class="font-heading text-lg font-semibold tracking-tight mb-4">Parkinson's Law</h2>

      <blockquote class="border-l-2 border-chart-2 pl-4 mb-5">
        <p class="text-sm italic text-foreground leading-relaxed">
          "Work expands so as to fill the time available for its completion."
        </p>
        <footer class="mt-1 text-[11px] text-muted-foreground">— C. Northcote Parkinson, 1955</footer>
      </blockquote>

      <div class="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          If you give yourself a week to write a report that takes two hours,
          you'll spend the full week on it. The task doesn't get better — it just
          takes longer. You overthink, procrastinate, and fill the extra time with low-value work.
        </p>
        <p>
          This isn't laziness. It's how the human brain works. Without a visible,
          ticking constraint, there's no urgency signal. Your brain treats distant
          deadlines as abstract — "I still have time" — until suddenly you don't.
        </p>
      </div>

      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg border border-border p-4">
          <TrendingDown class="h-5 w-5 text-destructive mb-2" strokeWidth={1.5} />
          <p class="text-xs font-semibold text-foreground mb-1">The Problem</p>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            Static deadlines on calendars don't create urgency. "Due Friday" feels
            the same on Monday and Thursday until panic hits.
          </p>
        </div>
        <div class="rounded-lg border border-border p-4">
          <Clock class="h-5 w-5 text-chart-2 mb-2" strokeWidth={1.5} />
          <p class="text-xs font-semibold text-foreground mb-1">The Mechanism</p>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            A live T-minus countdown makes time tangible. Watching
            "2d 14h 30m" shrink in real-time activates loss aversion —
            the same instinct that makes losing money feel worse than gaining it.
          </p>
        </div>
        <div class="rounded-lg border border-border p-4">
          <Zap class="h-5 w-5 text-success mb-2" strokeWidth={1.5} />
          <p class="text-xs font-semibold text-foreground mb-1">The Solution</p>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            Zeitro compresses perceived time. You see exactly how much is left,
            earn rewards for finishing early, and lose currency for missing deadlines.
            Fake stakes, real motivation.
          </p>
        </div>
      </div>
    </section>

    <div class="h-px bg-border my-8"></div>

    <!-- How Zeitro Fights Back -->
    <section class="mb-10">
      <h2 class="font-heading text-lg font-semibold tracking-tight mb-4">How Zeitro Fights Back</h2>
      <div class="space-y-3">
        {#each [
          { title: 'Live countdown, not static dates', desc: 'Every task shows a T-minus timer ticking in real time. "Due Friday" becomes "T- 2d 14h 30m 12s" — and it\'s shrinking.' },
          { title: 'Financial stakes (even fake ones)', desc: 'Earn rupees for completing tasks. Lose them for missing deadlines. Gamification triggers the same dopamine circuits as real rewards.' },
          { title: 'Visible work logging', desc: 'When you open a task and hit play, time is being recorded. You can see exactly how many hours you\'ve invested — making sunk cost work in your favor.' },
          { title: 'Tighter feedback loops', desc: 'Habits get daily check-ins. Tasks get countdowns. Analytics show your patterns. The shorter the feedback loop, the harder it is for Parkinson\'s Law to operate.' },
          { title: 'Pomodoro focus blocks', desc: '25-minute focused sprints with a visible timer. You can\'t expand work to fill the time when the time is 25 minutes and counting.' },
        ] as item}
          <div class="flex gap-3">
            <div class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-1"></div>
            <div>
              <p class="text-sm font-medium text-foreground">{item.title}</p>
              <p class="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <div class="h-px bg-border my-8"></div>

    <!-- Built by Kannan -->
    <section class="mb-10">
      <h2 class="font-heading text-lg font-semibold tracking-tight mb-4">Built by Kannan</h2>
      <div class="text-sm text-muted-foreground leading-relaxed space-y-3">
        <p>
          Zeitro is a personal project built to solve a personal problem: finishing things
          on time. Not because of lack of skill or motivation, but because deadlines feel
          abstract until they're past.
        </p>
        <p>
          I wanted a tool that makes time feel real — something I open every morning that
          shows me exactly what's at stake, exactly how much time I have, and exactly how
          much work I've done. Not another to-do list. A productivity cockpit.
        </p>
        <p>
          The tech stack is SvelteKit, FastAPI, SQLite, and Docker — chosen for simplicity
          and the ability to self-host on a personal VPS. No vendor lock-in, no
          subscriptions, no tracking. Just a tool that works.
        </p>
      </div>
    </section>

    <div class="h-px bg-border my-8"></div>

    <!-- Inspiration -->
    <section class="mb-10">
      <h2 class="font-heading text-lg font-semibold tracking-tight mb-4">Inspiration</h2>
      <div class="rounded-lg border border-border bg-secondary/20 p-5">
        <p class="text-sm text-muted-foreground leading-relaxed">
          The spark behind Zeitro came from a fellow human —
          <strong class="text-foreground">Shankar Balakrishnan</strong>. His methods
          of self-motivation and notional ways of leading life showed me that the right
          system can turn intention into action. The idea that even symbolic stakes — not
          real money, just a number on a screen — can rewire how seriously you treat your
          own commitments came directly from watching how he operates.
        </p>
        <p class="text-sm text-muted-foreground leading-relaxed mt-3">
          You can read more about his approach and the thinking that shaped Zeitro in
          <a href="/about" class="font-medium text-chart-1 underline underline-offset-2 hover:text-chart-1/80 transition-colors">
            this blog post
          </a>.
        </p>
      </div>
    </section>

    <!-- Version -->
    <div class="text-center text-[11px] text-muted-foreground py-4">
      <p>Zeitro v1.0.0</p>
      <p class="mt-0.5">Made with focus and deadlines</p>
    </div>
  </div>
</div>

<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Eye, EyeOff } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
	let showPassword = $state(false);
</script>

<div class="flex min-h-dvh flex-col bg-background text-foreground">
	<!-- Top nav -->
	<header class="flex items-center justify-between px-14 py-9">
		<span class="text-sm font-medium tracking-wide">ClaimTech</span>
		<a href="mailto:support@claimtech.co.za" class="text-sm text-brand hover:underline">
			Request access →
		</a>
	</header>

	<!-- Centered form -->
	<main class="flex flex-1 items-center justify-center px-6">
		<div class="w-full max-w-[420px]">
			<p class="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
				01 / Sign in
			</p>
			<h1 class="mb-10 text-6xl font-light italic leading-none">
				Welcome<br />back.
			</h1>

			<form
				method="POST"
				class="flex flex-col gap-5"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
			>
				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}

				<div class="space-y-1.5">
					<Label for="email" class="text-xs text-muted-foreground">Email</Label>
					<Input id="email" name="email" type="email" autocomplete="email" required />
				</div>

				<div class="space-y-1.5">
					<Label for="password" class="text-xs text-muted-foreground">Password</Label>
					<div class="relative">
						<Input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							autocomplete="current-password"
							required
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							aria-label={showPassword ? 'Hide password' : 'Show password'}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							{#if showPassword}
								<EyeOff class="h-4 w-4" />
							{:else}
								<Eye class="h-4 w-4" />
							{/if}
						</button>
					</div>
				</div>

				<Button type="submit" disabled={loading} class="mt-3 h-11 w-full">
					{loading ? 'Signing in…' : 'Sign in'}
				</Button>

				<div class="flex justify-between text-xs text-muted-foreground">
					<a href="/auth/forgot-password" class="hover:text-foreground">Forgot password?</a>
					<!-- TODO: /auth/help route does not exist — using mailto fallback -->
					<a href="mailto:support@claimtech.co.za" class="hover:text-foreground">Need help?</a>
				</div>
			</form>
		</div>
	</main>

	<!-- Minimal footer -->
	<footer class="border-t border-border/60 px-14 py-6 text-xs text-muted-foreground">
		© {new Date().getFullYear()} ClaimTech
	</footer>
</div>

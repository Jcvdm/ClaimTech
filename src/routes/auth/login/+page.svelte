<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Lock, Mail, ShieldCheck } from 'lucide-svelte';
	import logo from '$lib/assets/logo.png';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
</script>

<div class="grid min-h-screen bg-gray-50 text-gray-900 lg:grid-cols-[1.05fr_0.95fr]">
	<section class="relative hidden overflow-hidden bg-slate-900 lg:flex">
		<div class="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-slate-700/20 blur-3xl"></div>
		<div
			class="absolute bottom-10 left-[-4rem] h-72 w-72 rounded-full bg-slate-700/10 blur-3xl"
		></div>
		<div class="relative z-10 flex flex-col justify-between px-12 py-16 text-white">
			<div class="space-y-6">
				<div class="flex flex-col items-start gap-4">
					<img src={logo} alt="ClaimTech logo" class="h-20 w-auto" />
					<p class="text-sm tracking-[0.4em] text-slate-400 uppercase">ClaimTech Platform</p>
				</div>
				<h1 class="text-4xl leading-tight font-semibold">
					Modern tools for streamlined assessments & repairs
				</h1>
				<p class="max-w-md text-slate-300">
					Securely manage inspection workflows, collaborate with engineers, and deliver actionable
					vehicle insights from one dashboard.
				</p>
			</div>

			<div class="space-y-4 text-sm text-slate-300">
				<p class="flex items-start gap-3">
					<ShieldCheck class="mt-0.5 h-5 w-5 text-slate-400" />
					<span
						>Centralized dashboards keep inspections, appointments, and assessments in sync.</span
					>
				</p>
				<p class="flex items-start gap-3">
					<ShieldCheck class="mt-0.5 h-5 w-5 text-slate-400" />
					<span>Guided workflows help engineers capture consistent, auditable vehicle data.</span>
				</p>
				<p class="flex items-start gap-3">
					<ShieldCheck class="mt-0.5 h-5 w-5 text-slate-400" />
					<span>Automated reminders ensure stakeholders stay informed as work progresses.</span>
				</p>
			</div>
		</div>
	</section>

	<section class="flex items-center justify-center p-6 sm:p-10">
		<div class="w-full max-w-md space-y-6">
			<div class="text-center">
				<p class="text-xs font-semibold tracking-[0.3em] text-gray-400 uppercase">Secure sign in</p>
				<h2 class="mt-3 text-3xl font-semibold">Welcome back</h2>
				<p class="mt-2 text-sm text-gray-500">Access your assessment workspace</p>
			</div>

			<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm shadow-gray-100">
				<form
					method="POST"
					class="space-y-5"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
						};
					}}
				>
					{#if form?.error}
						<div class="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
							{form.error}
						</div>
					{/if}

					<label class="space-y-1 text-sm font-medium text-gray-700" for="email">
						<span>Email address</span>
						<div
							class="relative flex items-center rounded-xl border border-gray-200 bg-gray-50 text-base focus-within:border-slate-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-100"
						>
							<Mail class="ml-3 h-4 w-4 text-gray-400" />
							<input
								id="email"
								name="email"
								type="email"
								autocomplete="email"
								required
								class="h-11 flex-1 rounded-xl border-none bg-transparent px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none"
								placeholder="you@claimtech.com"
							/>
						</div>
					</label>

					<label class="space-y-1 text-sm font-medium text-gray-700" for="password">
						<span>Password</span>
						<div
							class="relative flex items-center rounded-xl border border-gray-200 bg-gray-50 focus-within:border-slate-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-100"
						>
							<Lock class="ml-3 h-4 w-4 text-gray-400" />
							<input
								id="password"
								name="password"
								type="password"
								autocomplete="current-password"
								required
								class="h-11 flex-1 rounded-xl border-none bg-transparent px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none"
								placeholder="Enter your password"
							/>
						</div>
					</label>

					<div class="flex items-center justify-between text-sm text-gray-500">
						<a href="/auth/forgot-password" class="font-medium text-slate-700 hover:text-slate-900">
							Forgot password?
						</a>
						<a href="/auth/signup" class="hover:text-gray-700">Need an account?</a>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-200 transition hover:bg-slate-800 focus:ring-2 focus:ring-slate-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Signing in...' : 'Sign in'}
					</button>
				</form>
			</div>

			<p class="text-center text-xs text-gray-500">
				By continuing you agree to ClaimTech’s
				<a class="text-slate-700 hover:text-slate-900" href="/legal/terms">Terms</a>
				and
				<a class="text-slate-700 hover:text-slate-900" href="/legal/privacy">Privacy Policy</a>.
			</p>
		</div>
	</section>
</div>

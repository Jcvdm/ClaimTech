<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-svelte';
	import logo from '$lib/assets/logo.png';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
	let showPassword = $state(false);
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
					<img
								src={logo}
								alt="ClaimTech logo"
								class="h-20 w-auto cursor-pointer transition-all duration-200 ease-linear
									   hover:scale-105 hover:brightness-110"
							/>
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

	<section class="flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10">
		<!-- Mobile Header - Logo and branding for small screens -->
		<div class="flex flex-col items-center pb-6 lg:hidden">
			<img
				src={logo}
				alt="ClaimTech logo"
				class="h-14 w-auto"
			/>
			<p class="mt-2 text-xs tracking-[0.3em] text-slate-500 uppercase">ClaimTech Platform</p>
		</div>

		<div class="w-full max-w-md space-y-5 sm:space-y-6">
			<div class="text-center">
				<p class="text-xs font-semibold tracking-[0.3em] text-gray-400 uppercase">Secure sign in</p>
				<h2 class="mt-2 text-2xl font-semibold sm:mt-3 sm:text-3xl">Welcome back</h2>
				<p class="mt-1.5 text-sm text-gray-500 sm:mt-2">Access your assessment workspace</p>
			</div>

			<div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100 sm:p-6">
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
								class="h-12 flex-1 rounded-xl border-none bg-transparent px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none"
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
								type={showPassword ? 'text' : 'password'}
								autocomplete="current-password"
								required
								class="h-12 flex-1 rounded-xl border-none bg-transparent px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none"
								placeholder="Enter your password"
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="mr-3 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
								aria-label={showPassword ? 'Hide password' : 'Show password'}
							>
								{#if showPassword}
									<EyeOff class="h-4 w-4" />
								{:else}
									<Eye class="h-4 w-4" />
								{/if}
							</button>
						</div>
					</label>

					<div class="flex items-center justify-between gap-2 text-sm text-gray-500">
						<a
							href="/auth/forgot-password"
							class="rounded-md px-1 py-1.5 font-medium text-slate-700 transition-colors hover:text-slate-900"
						>
							Forgot password?
						</a>
						<a
							href="/auth/signup"
							class="rounded-md px-1 py-1.5 transition-colors hover:text-gray-700"
						>
							Need an account?
						</a>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="inline-flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm shadow-slate-200 transition hover:bg-slate-800 focus:ring-2 focus:ring-slate-300 focus:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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

<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				Reset your password
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				Enter your email address and we'll send you a password reset link
			</p>
		</div>

		<form
			method="POST"
			class="mt-8 space-y-6"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
		>
			{#if form?.error}
				<div class="rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">
								{form.error}
							</h3>
						</div>
					</div>
				</div>
			{/if}

			{#if form?.success}
				<div class="rounded-md bg-green-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-green-800">
								Password reset email sent! Please check your inbox and follow the instructions.
							</h3>
						</div>
					</div>
				</div>
			{/if}

			<div class="rounded-md shadow-sm">
				<div>
					<label for="email" class="sr-only">Email address</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
						placeholder="Email address"
					/>
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={loading || form?.success}
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Sending...' : 'Send reset email'}
				</button>
			</div>

			<div class="text-center">
				<a href="/auth/login" class="text-sm text-blue-600 hover:text-blue-500">
					Back to sign in
				</a>
			</div>
		</form>
	</div>
</div>

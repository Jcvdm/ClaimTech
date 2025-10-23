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
				Create your account
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				Join ClaimTech to start managing assessments
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
								Account created! Please check your email to confirm your account.
							</h3>
						</div>
					</div>
				</div>
			{/if}

			<div class="rounded-md shadow-sm space-y-4">
				<div>
					<label for="full_name" class="block text-sm font-medium text-gray-700">Full Name</label>
					<input
						id="full_name"
						name="full_name"
						type="text"
						required
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						placeholder="John Doe"
					/>
				</div>

				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						placeholder="you@example.com"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						required
						minlength="6"
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						placeholder="At least 6 characters"
					/>
				</div>

				<div>
					<label for="role" class="block text-sm font-medium text-gray-700">Role</label>
					<select
						id="role"
						name="role"
						required
						class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					>
						<option value="engineer">Engineer</option>
						<option value="admin">Admin</option>
					</select>
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={loading || form?.success}
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Creating account...' : 'Sign up'}
				</button>
			</div>

			<div class="text-center">
				<a href="/auth/login" class="text-sm text-blue-600 hover:text-blue-500">
					Already have an account? Sign in
				</a>
			</div>
		</form>
	</div>
</div>


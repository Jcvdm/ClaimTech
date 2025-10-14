<script lang="ts">
	import SummaryComponent from '$lib/components/shared/SummaryComponent.svelte';
	import type {
		Assessment,
		VehicleValues,
		Estimate,
		Inspection,
		Request,
		Client
	} from '$lib/types';

	interface Props {
		assessment: Assessment;
		vehicleValues: VehicleValues | null;
		estimate: Estimate | null;
		preIncidentEstimate: Estimate | null;
		inspection: Inspection | null;
		request: Request | null;
		client: Client | null;
	}

	let {
		assessment,
		vehicleValues,
		estimate,
		preIncidentEstimate,
		inspection,
		request,
		client
	}: Props = $props();
</script>

<div class="space-y-6">
	<div class="rounded-lg bg-white p-6 shadow-sm">
		<h2 class="mb-6 text-2xl font-bold text-gray-900">Assessment Summary</h2>
		<p class="mb-6 text-sm text-gray-600">
			Overview of all assessment data including vehicle information, values, estimates, and progress.
		</p>

		<SummaryComponent
			{inspection}
			{request}
			{client}
			{assessment}
			{vehicleValues}
			{estimate}
			{preIncidentEstimate}
			showAssessmentData={true}
		/>
	</div>
</div>


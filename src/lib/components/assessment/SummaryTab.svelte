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
		vehicleIdentification: any | null;
		interiorMechanical: any | null;
	}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const assessment = $derived(props.assessment);
	const vehicleValues = $derived(props.vehicleValues);
	const estimate = $derived(props.estimate);
	const preIncidentEstimate = $derived(props.preIncidentEstimate);
	const inspection = $derived(props.inspection);
	const request = $derived(props.request);
	const client = $derived(props.client);
	const vehicleIdentification = $derived(props.vehicleIdentification);
	const interiorMechanical = $derived(props.interiorMechanical);
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
			{vehicleIdentification}
			{interiorMechanical}
			showAssessmentData={true}
		/>
	</div>
</div>


<script lang="ts">
	// Note: CheckboxGroup was removed in Bits UI v3
	// Use individual CheckboxItem components instead
	let {
		ref = $bindable(null),
		value = $bindable(),
		...restProps
	}: {
		ref?: any;
		value?: any;
		[key: string]: any;
	} = $props();
</script>

<!-- CheckboxGroup component removed in Bits UI v3 -->
<!-- Use individual CheckboxItem components instead -->
<div bind:this={ref} data-slot="dropdown-menu-checkbox-group" {...restProps}></div>

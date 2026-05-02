<script lang="ts">
  import CompactCard from '$lib/components/assessment/compact/CompactCard.svelte';
  import CompactCardHeader from '$lib/components/assessment/compact/CompactCardHeader.svelte';
  import CompactBanner from '$lib/components/assessment/compact/CompactBanner.svelte';
  import CompactField from '$lib/components/assessment/compact/CompactField.svelte';
  import CompactInput from '$lib/components/assessment/compact/CompactInput.svelte';
  import CompactSelect from '$lib/components/assessment/compact/CompactSelect.svelte';
  import CompactTextarea from '$lib/components/assessment/compact/CompactTextarea.svelte';
  import CompactSegmented from '$lib/components/assessment/compact/CompactSegmented.svelte';
  import CompactSegmentedBordered from '$lib/components/assessment/compact/CompactSegmentedBordered.svelte';
  import CompactRadioCards from '$lib/components/assessment/compact/CompactRadioCards.svelte';
  import CompactPhotoGrid from '$lib/components/assessment/compact/CompactPhotoGrid.svelte';
  import CompactChip from '$lib/components/assessment/compact/CompactChip.svelte';
  import CompactButton from '$lib/components/assessment/compact/CompactButton.svelte';

  let textVal = $state('Sample text');
  let monoVal = $state('CLM-2025-001');
  let selectVal = $state('');
  let textareaVal = $state('Some notes here...');
  let segmentedVal = $state('yes');
  let borderedVal = $state('yes');
  let radioVal = $state('total_loss');

  const selectOptions = [
    { value: 'opt1', label: 'Option One' },
    { value: 'opt2', label: 'Option Two' },
    { value: 'opt3', label: 'Option Three' }
  ];

  const segmentedOptions = [
    { value: 'yes', label: 'Yes', tone: 'green' as const },
    { value: 'no', label: 'No', tone: 'red' as const },
    { value: 'na', label: 'N/A', tone: 'amber' as const }
  ];

  const borderedOptions = [
    { value: 'yes', label: 'Approve', tone: 'green' as const },
    { value: 'no', label: 'Decline', tone: 'red' as const }
  ];

  const radioOptions = [
    { value: 'repairable', label: 'Repairable', sub: 'Vehicle can be repaired' },
    { value: 'total_loss', label: 'Total Loss', sub: 'Uneconomical to repair' },
    { value: 'theft_recovery', label: 'Theft Recovery', sub: 'Recovered after theft' },
    { value: 'pending', label: 'Pending', sub: 'Awaiting further assessment' }
  ];

  const placeholderPhotos = [
    { id: '1', url: 'https://placehold.co/400x300/64748b/fff?text=IMG_001', name: 'IMG_001' },
    { id: '2', url: 'https://placehold.co/400x300/475569/fff?text=IMG_002', name: 'IMG_002' },
    { id: '3', url: 'https://placehold.co/400x300/334155/fff?text=IMG_003', name: 'IMG_003' },
    { id: '4', url: 'https://placehold.co/400x300/1e293b/fff?text=IMG_004', name: 'IMG_004' }
  ];

  const chipTones = ['gray', 'green', 'amber', 'red', 'blue', 'dark'] as const;
</script>

<div class="max-w-[900px] mx-auto p-6 space-y-4">
  <h1 class="text-2xl font-extrabold text-slate-900 mb-6">Compact Primitives Preview</h1>

  <!-- Banners -->
  <CompactCard>
    <CompactCardHeader title="Banners" count={4} />
    <div class="space-y-2">
      <CompactBanner tone="red">This is a red / error banner with important information.</CompactBanner>
      <CompactBanner tone="green">This is a green / success banner confirming an action.</CompactBanner>
      <CompactBanner tone="amber">This is an amber / warning banner for cautionary messages.</CompactBanner>
      <CompactBanner tone="blue">This is a blue / info banner for general information.</CompactBanner>
    </div>
  </CompactCard>

  <!-- Form Fields -->
  <CompactCard>
    <CompactCardHeader title="Form Fields" subtitle="CompactField with CompactInput, CompactSelect, CompactTextarea" />
    <CompactField label="Claim Reference" required htmlFor="claim-ref">
      <CompactInput bind:value={textVal} id="claim-ref" placeholder="Enter reference..." />
    </CompactField>
    <CompactField label="Assessment ID" hint="Auto-generated claim number" htmlFor="asm-id">
      <CompactInput bind:value={monoVal} id="asm-id" mono placeholder="ASM-2025-001" />
    </CompactField>
    <CompactField label="Assessment Type" required htmlFor="asm-type">
      <CompactSelect bind:value={selectVal} id="asm-type" options={selectOptions} placeholder="Select type..." />
    </CompactField>
    <CompactField label="Notes" htmlFor="notes" class="mb-0">
      <CompactTextarea bind:value={textareaVal} id="notes" placeholder="Enter notes..." rows={4} />
    </CompactField>
  </CompactCard>

  <!-- Segmented Controls -->
  <CompactCard>
    <CompactCardHeader title="Segmented Controls" />
    <div class="space-y-4">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Pill (CompactSegmented)</p>
        <CompactSegmented value={segmentedVal} options={segmentedOptions} onChange={(v) => (segmentedVal = v)} />
      </div>
      <div>
        <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Bordered (CompactSegmentedBordered)</p>
        <CompactSegmentedBordered value={borderedVal} options={borderedOptions} onChange={(v) => (borderedVal = v)} />
      </div>
    </div>
  </CompactCard>

  <!-- Radio Cards -->
  <CompactCard>
    <CompactCardHeader title="Radio Cards" subtitle="Assessment Result pattern — 2-col grid" />
    <CompactRadioCards value={radioVal} options={radioOptions} onChange={(v) => (radioVal = v)} />
  </CompactCard>

  <!-- Photo Grid -->
  <CompactCard>
    <CompactCardHeader title="Photo Grid" count={placeholderPhotos.length} />
    <CompactPhotoGrid
      photos={placeholderPhotos}
      onAdd={() => alert('Add photos')}
      onRemove={(id) => alert(`Remove ${id}`)}
    />
  </CompactCard>

  <!-- Chips -->
  <CompactCard>
    <CompactCardHeader title="Chips" />
    <div class="flex flex-wrap gap-2">
      {#each chipTones as tone}
        <CompactChip {tone}>{tone}</CompactChip>
      {/each}
      <CompactChip tone="blue" mono>CLM-2025-001</CompactChip>
    </div>
  </CompactCard>

  <!-- Buttons -->
  <CompactCard>
    <CompactCardHeader title="Buttons" />
    <div class="flex flex-wrap gap-2">
      <CompactButton variant="primary">Primary md</CompactButton>
      <CompactButton variant="ghost">Ghost md</CompactButton>
      <CompactButton variant="danger">Danger md</CompactButton>
      <CompactButton variant="primary" size="sm">Primary sm</CompactButton>
      <CompactButton variant="ghost" size="sm">Ghost sm</CompactButton>
      <CompactButton variant="danger" size="sm">Danger sm</CompactButton>
      <CompactButton variant="primary" disabled>Disabled</CompactButton>
    </div>
  </CompactCard>
</div>

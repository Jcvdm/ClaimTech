# Claimtech Component Library

A comprehensive, Zoho-inspired component library built with SvelteKit, shadcn-svelte, and Tailwind CSS.

## Design Principles

- **Clean & Minimal**: White backgrounds, subtle borders and shadows
- **Professional**: Consistent spacing, typography, and color scheme
- **Blue Accent**: Primary actions and links use blue (#3B82F6)
- **Reusable**: All components are highly composable and reusable
- **Accessible**: Built on shadcn-svelte for accessibility

## Component Categories

### 1. Data Display Components (`$lib/components/data/`)

#### DataTable
A full-featured data table with sorting, pagination, and clickable rows.

**Props:**
- `data: T[]` - Array of data objects
- `columns: Column<T>[]` - Column definitions
- `onRowClick?: (row: T) => void` - Row click handler
- `pageSize?: number` - Items per page (default: 10)
- `emptyMessage?: string` - Message when no data
- `class?: string` - Additional CSS classes

**Column Definition:**
```typescript
type Column<T> = {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => any;
  class?: string;
};
```

**Usage:**
```svelte
<DataTable
  data={items}
  columns={[
    { key: 'title', label: 'Title', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'date', label: 'Date', sortable: true }
  ]}
  onRowClick={(row) => console.log(row)}
  pageSize={15}
/>
```

#### StatusBadge
Colored status indicators with predefined variants.

**Props:**
- `status: Status | string` - Status value
- `class?: string` - Additional CSS classes

**Supported Statuses:**
- `draft` - Gray
- `pending` - Yellow
- `sent` - Blue
- `approved` - Green
- `rejected` - Red
- `completed` - Green
- `cancelled` - Gray
- `overdue` - Red

**Usage:**
```svelte
<StatusBadge status="approved" />
<StatusBadge status="pending" />
```

#### EmptyState
Placeholder for empty lists with optional action button.

**Props:**
- `title?: string` - Main message (default: "No items found")
- `description?: string` - Additional description
- `icon?: ComponentType` - Lucide icon component
- `actionLabel?: string` - Button text
- `onAction?: () => void` - Button click handler
- `class?: string` - Additional CSS classes

**Usage:**
```svelte
<EmptyState
  title="No quotes found"
  description="Get started by creating your first quote"
  icon={FileText}
  actionLabel="Create Quote"
  onAction={() => goto('/quotes/new')}
/>
```

### 2. Form Components (`$lib/components/forms/`)

#### FormField
Unified form field wrapper for inputs, selects, and textareas.

**Props:**
- `label: string` - Field label
- `name: string` - Field name
- `type?: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea'`
- `value?: string | number` - Bindable value
- `placeholder?: string` - Placeholder text
- `required?: boolean` - Required field
- `error?: string` - Error message
- `disabled?: boolean` - Disabled state
- `options?: { value: string; label: string }[]` - Select options
- `rows?: number` - Textarea rows (default: 3)
- `class?: string` - Additional CSS classes
- `inputClass?: string` - Input-specific CSS classes
- `onchange?: (value: string) => void` - Change handler

**Usage:**
```svelte
<FormField
  label="Customer Name"
  name="customerName"
  type="select"
  bind:value={customerName}
  options={customerOptions}
  required
/>

<FormField
  label="Notes"
  name="notes"
  type="textarea"
  bind:value={notes}
  rows={4}
/>
```

#### ItemTable
Editable line items table for invoices/quotes.

**Props:**
- `items?: LineItem[]` - Bindable array of line items
- `currency?: string` - Currency symbol (default: "R")
- `class?: string` - Additional CSS classes
- `onItemsChange?: (items: LineItem[]) => void` - Change handler

**LineItem Type:**
```typescript
type LineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number; // Auto-calculated
};
```

**Usage:**
```svelte
<ItemTable bind:items currency="R" />
```

#### FileUpload
Drag-and-drop file upload with preview.

**Props:**
- `name?: string` - Input name (default: "files")
- `label?: string` - Field label
- `acceptedFileTypes?: string[]` - Accepted MIME types
- `maxFiles?: number` - Maximum files (default: 10)
- `maxFileSize?: string` - Max size display (default: "10MB")
- `allowMultiple?: boolean` - Allow multiple files (default: true)
- `class?: string` - Additional CSS classes
- `onupdatefiles?: (files: File[]) => void` - File change handler

**Usage:**
```svelte
<FileUpload
  label="Upload Photos"
  acceptedFileTypes={['image/*', 'application/pdf']}
  maxFiles={20}
  onupdatefiles={(files) => console.log(files)}
/>
```

#### FormActions
Consistent action button group for forms.

**Props:**
- `primaryLabel?: string` - Primary button text (default: "Save")
- `secondaryLabel?: string` - Secondary button text
- `cancelLabel?: string` - Cancel button text (default: "Cancel")
- `onPrimary?: () => void` - Primary action handler
- `onSecondary?: () => void` - Secondary action handler
- `onCancel?: () => void` - Cancel action handler
- `primaryDisabled?: boolean` - Disable primary button
- `secondaryDisabled?: boolean` - Disable secondary button
- `loading?: boolean` - Show loading state
- `class?: string` - Additional CSS classes

**Usage:**
```svelte
<FormActions
  primaryLabel="Save and Send"
  secondaryLabel="Save as Draft"
  onPrimary={handleSend}
  onSecondary={handleDraft}
  onCancel={handleCancel}
  {loading}
/>
```

### 3. Layout Components (`$lib/components/layout/`)

#### PageHeader
Page title with optional description and actions.

**Props:**
- `title: string` - Page title
- `description?: string` - Page description
- `actions?: Snippet` - Action buttons snippet
- `class?: string` - Additional CSS classes

**Usage:**
```svelte
<PageHeader 
  title="Quotes" 
  description="Manage all your quotes"
>
  {#snippet actions()}
    <Button href="/quotes/new">New Quote</Button>
  {/snippet}
</PageHeader>
```

#### Sidebar
Navigation sidebar with grouped sections and icons.

**Features:**
- Grouped navigation sections
- Active state highlighting
- Icon support (Lucide icons)
- Responsive (hidden on mobile)

**Usage:**
```svelte
<Sidebar />
```

## Color Palette

- **Primary Blue**: `#3B82F6` (blue-600)
- **Success Green**: `#10B981` (green-500)
- **Warning Yellow**: `#F59E0B` (yellow-500)
- **Error Red**: `#EF4444` (red-500)
- **Gray Scale**: Tailwind gray palette

## Typography

- **Headings**: `font-semibold` with appropriate text sizes
- **Body**: `text-sm` or `text-base`
- **Labels**: `text-sm font-medium text-gray-700`
- **Muted**: `text-gray-500` or `text-gray-600`

## Spacing

- **Card Padding**: `p-6`
- **Section Spacing**: `space-y-6`
- **Form Field Spacing**: `space-y-2`
- **Button Gaps**: `gap-2`

## Example: Complete Form Page

```svelte
<script lang="ts">
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import FormField from '$lib/components/forms/FormField.svelte';
  import ItemTable from '$lib/components/forms/ItemTable.svelte';
  import FileUpload from '$lib/components/forms/FileUpload.svelte';
  import FormActions from '$lib/components/forms/FormActions.svelte';
  import { Card } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';

  let customerName = $state('');
  let items = $state([]);
  let files = $state([]);
</script>

<div class="mx-auto max-w-5xl space-y-6">
  <PageHeader title="New Quote" />

  <Card class="p-6">
    <div class="space-y-6">
      <FormField
        label="Customer"
        name="customer"
        type="select"
        bind:value={customerName}
        options={customerOptions}
        required
      />

      <Separator />

      <ItemTable bind:items />

      <Separator />

      <FileUpload label="Attachments" />
    </div>
  </Card>

  <Card class="p-0">
    <FormActions
      primaryLabel="Save"
      onPrimary={handleSave}
      onCancel={() => history.back()}
    />
  </Card>
</div>
```

## Installation

All components are already installed and configured. Import from:
- `$lib/components/data/`
- `$lib/components/forms/`
- `$lib/components/layout/`
- `$lib/components/ui/` (shadcn-svelte base components)

## Dependencies

- **shadcn-svelte**: Base UI components
- **Tailwind CSS v4**: Styling
- **Lucide Svelte**: Icons
- **Svelte 5**: Framework (runes mode)


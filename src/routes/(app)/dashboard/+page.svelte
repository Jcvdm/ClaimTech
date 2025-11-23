<script lang="ts">
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import { Card } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import {
    FileText,
    ClipboardCheck,
    Calendar,
    ClipboardList,
    FileCheck,
    Plus,
    Clock,
    TrendingUp,
    Activity,
    CheckCircle2
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const workCategories = [
    {
      label: 'New Requests',
      count: data.counts.requests,
      href: '/requests',
      icon: FileText,
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-700'
    },
    {
      label: 'Inspections',
      count: data.counts.inspections,
      href: '/work/inspections',
      icon: ClipboardCheck,
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-700'
    },
    {
      label: 'Appointments',
      count: data.counts.appointments,
      href: '/work/appointments',
      icon: Calendar,
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-700'
    },
    {
      label: 'Open Assessments',
      count: data.counts.assessments,
      href: '/work/assessments',
      icon: ClipboardList,
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-700'
    },
    {
      label: 'Finalized Assessments',
      count: data.counts.finalized,
      href: '/work/finalized-assessments',
      icon: FileCheck,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-700'
    },
    {
      label: 'FRC',
      count: data.counts.frc,
      href: '/work/frc',
      icon: FileCheck,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-700'
    },
    {
      label: 'Additionals',
      count: data.counts.additionals,
      href: '/work/additionals',
      icon: Plus,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-700'
    }
  ];

  const typeLabels: Record<string, string> = {
    request: 'Request',
    inspection: 'Inspection',
    appointment: 'Appointment',
    assessment: 'Assessment'
  };
</script>

<div class="space-y-6">
  <PageHeader
    title="Dashboard"
    description="Overview of outstanding work and recent activity"
  />

  <!-- Outstanding Work Cards -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each workCategories as category}
      {@const Icon = category.icon}
      <Card class="p-6 hover:shadow-md transition-shadow">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class={`p-2 rounded-lg ${category.bgColor}`}>
              <Icon class={`h-5 w-5 ${category.textColor}`} />
            </div>
            <h3 class="text-sm font-medium text-slate-600">{category.label}</h3>
          </div>
          {#if category.count > 0}
            <Badge
              variant="secondary"
              class={`rounded-full ${category.badgeBg} ${category.badgeText}`}
            >
              {category.count}
            </Badge>
          {/if}
        </div>
        <div class="mb-4">
          <div class="text-3xl font-bold text-slate-900">{category.count}</div>
          <p class="text-xs text-slate-500">outstanding items</p>
        </div>
        <a
          href={category.href}
          class="text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1"
        >
          View all →
        </a>
      </Card>
    {/each}
  </div>

  <!-- Time Tracking Metrics -->
  <div>
    <h2 class="mb-4 text-lg font-semibold text-slate-900">Performance Metrics (Last 30 Days)</h2>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="p-2 rounded-lg bg-indigo-50">
            <Clock class="h-5 w-5 text-indigo-600" />
          </div>
          <h3 class="text-sm font-medium text-slate-600">Avg Assessment Time</h3>
        </div>
        <div class="text-3xl font-bold text-slate-900">
          {data.timeMetrics.avgAssessmentDays}
          <span class="text-lg font-normal text-slate-500">days</span>
        </div>
        <p class="text-xs text-slate-500 mt-1">Start to finalization</p>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="p-2 rounded-lg bg-purple-50">
            <Clock class="h-5 w-5 text-purple-600" />
          </div>
          <h3 class="text-sm font-medium text-slate-600">Avg FRC Time</h3>
        </div>
        <div class="text-3xl font-bold text-slate-900">
          {data.timeMetrics.avgFRCDays}
          <span class="text-lg font-normal text-slate-500">days</span>
        </div>
        <p class="text-xs text-slate-500 mt-1">Start to completion</p>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="p-2 rounded-lg bg-emerald-50">
            <TrendingUp class="h-5 w-5 text-emerald-600" />
          </div>
          <h3 class="text-sm font-medium text-slate-600">Total Workflow</h3>
        </div>
        <div class="text-3xl font-bold text-slate-900">
          {data.timeMetrics.avgTotalWorkflowDays}
          <span class="text-lg font-normal text-slate-500">days</span>
        </div>
        <p class="text-xs text-slate-500 mt-1">Request to finalization</p>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="p-2 rounded-lg bg-green-50">
            <Activity class="h-5 w-5 text-green-600" />
          </div>
          <h3 class="text-sm font-medium text-slate-600">Completed</h3>
        </div>
        <div class="text-3xl font-bold text-slate-900">
          {data.timeMetrics.completedLast30Days}
        </div>
        <p class="text-xs text-slate-500 mt-1">Assessments finalized</p>
      </Card>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="grid gap-4 sm:grid-cols-3">
    <Card class="p-6">
      <h3 class="text-sm font-medium text-slate-600 mb-2">Total Active Work</h3>
      <div class="text-2xl font-bold text-slate-900">
        {data.counts.requests + data.counts.inspections + data.counts.appointments + data.counts.assessments}
      </div>
      <p class="text-xs text-slate-500 mt-1">Pre-finalization stages</p>
    </Card>

    <Card class="p-6">
      <h3 class="text-sm font-medium text-slate-600 mb-2">Finalized Work</h3>
      <div class="text-2xl font-bold text-green-600">
        {data.counts.finalized}
      </div>
      <p class="text-xs text-slate-500 mt-1">Awaiting additionals/FRC</p>
    </Card>

    <Card class="p-6">
      <h3 class="text-sm font-medium text-slate-600 mb-2">FRC & Additionals</h3>
      <div class="text-2xl font-bold text-purple-600">
        {data.counts.frc + data.counts.additionals}
      </div>
      <p class="text-xs text-slate-500 mt-1">Post-finalization processing</p>
    </Card>
  </div>

  <!-- Recent Activity -->
  <div>
    <h2 class="mb-4 text-lg font-semibold text-slate-900">Recent Activity</h2>
    <Card class="divide-y">
      {#if data.recentActivity.length > 0}
        {#each data.recentActivity as item}
          <div class="flex items-center justify-between p-4 hover:bg-slate-50">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Badge variant="outline" class="text-xs">
                  {typeLabels[item.type] || item.type}
                </Badge>
                <p class="text-sm font-medium text-slate-900">{item.title}</p>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                Updated {new Date(item.updated_at).toLocaleDateString('en-ZA', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        {/each}
      {:else}
        <div class="p-8 text-center text-slate-500">
          <p class="text-sm">No recent activity</p>
        </div>
      {/if}
    </Card>
  </div>
</div>


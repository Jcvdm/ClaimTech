## Goal
Align documentation with `.claude/commands/update_doc.md` by scanning the codebase and delivering consolidated, current docs under `.agent`, with an updated README index.

## Scope
- System overview and architecture
- Database schema synopsis
- SOPs for common tasks and patterns
- Bug/feature documentation updates tied to recent changes

## Deliverables
1. System: `project_architecture.md`
- Mission and scope
- Tech stack: SvelteKit 5, Supabase (client/server), SSE streaming for documents, Svelte runes usage ($state/$derived/$effect)
- Project structure and core modules (components, services, routes, templates)
- Integration points: Supabase auth/storage, document generation, FRC services

2. System: `database_quick_ref.md` (consolidated)
- Key tables: assessments, appointments, assessment_additionals, assessment_frc, photos
- Essential indexes (e.g., FRC count optimizations)
- Common joins and query patterns

3. SOPs
- `sop_auto_save_and_events.md` — Svelte 5 event conventions (`oninput`/`onblur`), auto-save vs local-buffer patterns across tabs (Estimate vs Additionals vs Values)
- `sop_data_invalidation.md` — SvelteKit invalidation (`invalidateAll`, targeted invalidation), sidebar badges and list updates (Appointment/FRC flows)
- `sop_document_generation.md` — SSE streaming, progress UI (`DocumentGenerationProgress.svelte`), retry, storage linking

4. Tasks
- `bug_10_additionals_editing_update.md` — Problem, fix summary, files changed, UX implications, tests
- Update existing bug docs states (close duplicates), add cross-links where relevant

5. README
- Update `.agent/README/index.md` to list:
  - System docs (architecture, database)
  - SOPs (auto-save/events, invalidation, document generation)
  - Tasks (Bug 10 update and other recent fixes)
  - Pointers to further detail (e.g., templates, services)

## Method
- Read-only scan of components/services/routes/templates to extract architecture and patterns
- Consolidate into minimal overlapping docs per `.claude/commands/update_doc.md`
- Keep filenames concise and avoid duplication between system and SOP sections

## Validation
- Ensure README index covers all created/updated docs
- Verify SOPs reference concrete code with file_path:line_number where useful
- Cross-link tasks to system/SOPs for discoverability

## Risks & Mitigation
- Redundant or stale docs: consolidate into single sources of truth and keep README index authoritative
- Path variability on Windows: use repo-relative paths consistently in docs
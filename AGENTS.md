# Tasky Agent Rules

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from older Next.js versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Product Context

Tasky is an internal web application for cataloging, tracking, editing, and exporting operational error records for the company.

The primary experience is a dark, dense, professional database/table interface inspired by Notion/Obsidian. It must not feel like a generic AI-generated SaaS website.

## Expected Stack

- Next.js with App Router
- React
- TypeScript strict
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase RLS
- Server Actions
- Custom components, without a heavy external UI library
- `lucide-react` for icons

## Mandatory Rules For Any Change

1. Never rewrite the entire app.
2. Never remove existing functionality without justification.
3. Before editing, analyze the current project structure.
4. Respect the existing folder, component, Server Action, type, and Supabase patterns.
5. Any change that requires a database update must include a block named `SQL PARA SUPABASE`.
6. If a local migration is created, also provide the complete SQL to run in the Supabase SQL Editor.
7. Do not create permanent mocked data when real Supabase integration already exists.
8. Do not use `any` unless it is extremely necessary.
9. Do not leave unnecessary `console.log` calls.
10. Do not break authentication, RLS, export, admin, error creation/editing, or custom fields.
11. Always validate permissions on the server, not only by hiding frontend buttons.
12. Always run, when available:
    - `npm run lint`
    - `npm run build`
    - `npm run typecheck`, if it exists
    - tests, if they exist
13. If a command fails, fix it before finishing.
14. Do not introduce a new library without explaining why it is necessary.
15. Do not create a generic SaaS visual or an "AI-generated site" look.
16. Use a dark, sober, dense, professional UI with dark gray, light gray, subtle transparency, and clean typography.
17. No hero sections, marketing copy, emojis, exaggerated gradients, or decorative cards without function.
18. UI text must be direct: "Erros", "Reportar erro", "Exportar", "Configuracoes", "Status", "Responsavel".
19. This is an internal operational application, so prioritize reliability, traceability, and security.

## Product Rules

- Admin can manage options, colors, roles, global layout, export, and deletions.
- User can create and edit errors according to policies, but cannot change global settings.
- The error `id`/`human_id` must not be editable.
- Selects must use database data when a structure already exists for that.
- `Responsavel` must come from `profiles`.
- `Reportado por` must support both `profiles` and people without an account.
- Attachments must use private Supabase Storage, not base64 in the description field.
- Relevant changes must generate history/audit records.

## Current Project Map

- Supabase schema: `supabase/schema.sql`
- Supabase server client: `src/lib/supabase/server.ts`
- Supabase middleware/session refresh: `src/lib/supabase/middleware.ts` and root `middleware.ts`
- Supabase reads/data access: `src/lib/supabase/data.ts`
- Auth helpers: `src/lib/auth.ts`
- Permission helpers: `src/lib/permissions.ts`
- Server Actions: `src/app/auth/actions.ts` and `src/app/actions/*.ts`
- App routes/pages: `src/app/**/page.tsx`
- Main database table: `src/components/database-view.tsx`
- Error create/edit modal: `src/components/error-report-modal.tsx`
- Export UI/action: `src/components/export-view.tsx` and `src/app/actions/export.ts`
- Admin UI/action: `src/components/admin-view.tsx` and `src/app/actions/admin.ts`
- Shared product/database types: `src/types/tasky.ts` and `src/types/database.ts`
- Shared UI primitives: `src/components/ui.tsx`

## Verification Notes

Use `npm.cmd run ...` on Windows if PowerShell blocks `npm.ps1` due to execution policy.

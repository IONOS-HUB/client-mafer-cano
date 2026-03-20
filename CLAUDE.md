# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test runner is configured.

## Architecture Overview

**Mafer Cano** is a Next.js 16 Point-of-Sale (POS) system with Ecuadorian electronic invoicing (SRI integration). It uses the App Router with Supabase as the database/auth backend.

### Routing Structure

- `/` → Redirects to `/pos`
- `/login` → Supabase auth
- `/(dashboard)/*` → Protected routes (pos, products, customers, sales, inventory, settings, tutorial)
- `/api/sri/send-invoice` → Server route for SRI invoice submission
- `/api/clear-db` → Database reset endpoint

The `(dashboard)` route group has its own layout with a responsive sidebar and top navigation.

### Feature Module Pattern

Each domain lives in `src/features/<name>/` with a consistent structure:
- `types.ts` — TypeScript interfaces
- `service.ts` — Business logic and Supabase queries
- `components/` — React components specific to the feature
- `hooks/` — Custom React hooks (where applicable)

Features: `pos`, `products`, `customers`, `inventory`, `sri`, `iva`

### SRI (Ecuadorian Tax Authority) Integration

The SRI feature (`src/features/sri/`) handles electronic invoicing:
1. Invoice XML is generated using `open-factura`
2. Digitally signed with a `.p12` certificate via `ec-sri-invoice-signer`, `xml-crypto`, and `node-forge`
3. Submitted to SRI servers via `/api/sri/send-invoice`
4. Status (access key, authorization number) stored in Supabase on the `sales` table

XML-related packages (`xmldom`, `xpath`, `@xmldom/xmldom`, `node-forge`, `xml-crypto`) run **server-side only** — they're listed in `serverExternalPackages` in `next.config.ts`.

The `config/certificate.p12` file is the digital signature certificate. Paths and passwords are in `.env.local`.

### Database

PostgreSQL via Supabase. Migrations live in `database/migrations/`. The full schema is in `supabase/schema.sql`. Key tables: `sales`, `products`, `customers`, `stock_adjustments`, `iva`.

Invoice numbering is handled by a DB trigger (not application code). Stock is automatically deducted when a sale is completed and validated before checkout in `src/features/pos/service.ts`.

### Key Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_BUSINESS_NAME / _RUC / _ADDRESS / _PHONE
NEXT_PUBLIC_SRI_RUC / _RAZON_SOCIAL / _ESTABLECIMIENTO / _PUNTO_EMISION
NEXT_PUBLIC_SRI_AMBIENTE   # 1=Test, 2=Production
SRI_P12_PATH               # Path to .p12 certificate
SRI_P12_PASSWORD
```

See `.env.example` for the full list. Copy to `.env.local` for local development.

### Styling & UI

- **Tailwind CSS v4** configured in `src/app/globals.css` (uses `@import "tailwindcss"`, not `@tailwind` directives)
- **shadcn/ui** with "new-york" style, neutral base color, CSS variables — components in `src/components/ui/`
- **Lucide React** for icons
- **Sonner** for toast notifications (configured in root layout)
- **Geist Sans / Geist Mono** fonts

### React Compiler

`next.config.ts` enables `reactCompiler: true` (React 19). Avoid manual `useMemo`/`useCallback` optimizations — the compiler handles them.

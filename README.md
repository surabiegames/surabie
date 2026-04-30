> [!NOTE]
> This project has been officially archived and will no longer receive updates. See the [Templates](https://vercel.com/templates/next.js) directory for Next.js starters.
> 
> I started this project when the Next.js App Router was in public preview. Because the framework has since stabilized and undergone significant architectural changes, the code in this repository:
> - Does not reflect current best practices.
> - May contain deprecated APIs or patterns.
> - Is not recommended for use in production environments.

# Surabie

Surabie is a modern web platform starter for finance and operations workflows.

## About this project

This project as an experiment to see how a modern app (with features like authentication, subscriptions, API routes, static pages for docs ...etc) would work in Next.js 13 and server components. 

## Features

- New `/app` dir,
- Routing, Layouts, Nested Layouts and Layout Groups
- Data Fetching, Caching and Mutation
- Loading UI
- Route handlers
- Metadata files
- Server and Client Components
- API Routes and Middlewares
- Authentication using **NextAuth.js**
- ORM using **Prisma**
- Database on **PlanetScale**
- UI Components built using **Radix UI**
- Documentation and blog using **MDX** and **Contentlayer**
- Subscriptions using **Stripe**
- Styled using **Tailwind CSS**
- Validations using **Zod**
- Written in **TypeScript**

## Roadmap

- [x] ~Add MDX support for basic pages~
- [x] ~Build marketing pages~
- [x] ~Subscriptions using Stripe~
- [x] ~Responsive styles~
- [x] ~Add OG image for blog using @vercel/og~
- [x] Dark mode

## Known Issues

A list of things not working right now:

1. ~GitHub authentication (use email)~
2. ~[Prisma: Error: ENOENT: no such file or directory, open '/var/task/.next/server/chunks/schema.prisma'](https://github.com/prisma/prisma/issues/16117)~
3. ~[Next.js 13: Client side navigation does not update head](https://github.com/vercel/next.js/issues/42414)~
4. [Cannot use opengraph-image.tsx inside catch-all routes](https://github.com/vercel/next.js/issues/48162)

## Why not tRPC, Turborepo or X?

I might add this later. For now, I want to see how far we can get using Next.js only.

If you have some suggestions, feel free to create an issue.

## Running Locally (PostgreSQL)

1. Install dependencies:

```sh
pnpm install
```

2. Copy environment variables into web app:

```sh
cp apps/web/.env.example apps/web/.env.local
```

3. Start PostgreSQL (Docker):

```sh
docker run -d --name surabie-postgres \
  -e POSTGRES_USER=surabie \
  -e POSTGRES_PASSWORD=surabie \
  -e POSTGRES_DB=surabie \
  -p 5433:5432 \
  postgres:16
```

4. Push Prisma schema:

```sh
pnpm --filter @surabie/web prisma db push
pnpm --filter @surabie/web prisma generate
```

5. Start the development server:

```sh
pnpm dev
```

## Monorepo Workspace (Current Step)

This repository now uses **pnpm workspace** + **Turborepo** orchestration.

- Workspace definition: `pnpm-workspace.yaml`
- Pipeline definition: `turbo.json`
- Reserved folders:
  - `apps/` for runnable apps
  - `packages/` for shared internal libraries

Current Next.js app now lives in `apps/web`.
Core shared packages extracted:
- `packages/db` (Prisma schema + client)
- `packages/accounting-core` (ledger domain services and trial-balance logic)

Useful commands from repository root:

```sh
pnpm dev
pnpm typecheck
pnpm --filter @surabie/web prisma:generate
pnpm --filter @surabie/web prisma:push
```

### Local auth behavior

- Auth uses **NextAuth** with the **email (magic link)** provider and **JWT sessions**; the **Prisma adapter** persists users in PostgreSQL **when you open the magic link** (stored in `public.users`). Verify with **`pnpm prisma studio`** (same `DATABASE_URL` as the app).

**Magic link versus staying signed in**

- You only complete a magic link flow when you **submit your email again on `/login` or `/register`**, **sign out**, the **session cookie expires** (defaults to roughly **90 days**), or cookies are cleared (private window, wipe site data, different browser/origin/port).
- After you open the magic link once, you can revisit **`/dashboard` many times without a new email** until one of those events happens again.

Prefer **OAuth** (e.g. GitHub) one-click authorize or **email + password** (bcrypt and extra UI)? Those are alternate auth flows and can be added separately.

- In local dev (`next dev`), a magic link is **always** printed when you request email sign-in. With `pnpm dev` plus `concurrently`, the line usually appears under the **`[1]`** Next.js stream (not `[0]` Contentlayer).
  - look for `[auth:dev] Magic link for ...`
- `POSTMARK_API_TOKEN` can be empty or `dev-*` locally; omit or use placeholders for Postmark templates until you send real mail.
- Open that URL in the same browser to finish sign-in and reach `/dashboard`.
- **GitHub sign-in** appears only if `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set to real OAuth app values (not `dev-*`).
- For production email, set Postmark to a real token and numeric `POSTMARK_SIGN_IN_TEMPLATE` / `POSTMARK_ACTIVATION_TEMPLATE`, and set `NEXTAUTH_URL` to your public site URL.

### Optional cleanup from old MySQL setup

If you previously used local MySQL for this project:

```sh
docker stop surabie-mysql
docker rm surabie-mysql
```

## License

Licensed under the [MIT license](https://github.com/surabiegames/surabie/blob/main/LICENSE.md).

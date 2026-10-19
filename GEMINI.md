# GEMINI.md - Base Project Instructions & Engineering Standard Template

> **Universal Operating Instructions for Antigravity, Gemini & Cursor Agents**  
> Copy this file to the root of any new repository as `GEMINI.md` or `AGENTS.md` to instantly enforce senior engineering rigor, art direction, zero-emoji policy, hexagonal architecture, passwordless OTP auth, responsive mobile-first craft, light/dark theming, and automated multi-viewport testing powered by the [Skills Suite](https://github.com/cristian-haro/skills).

---

## 1. Core Operating Philosophy & Non-Negotiables

### 1.1 Strict Zero-Emoji Standard
*Reference Skill:* [`design-and-tokens/zero-emoji-standard`](https://github.com/cristian-haro/skills/blob/main/design-and-tokens/zero-emoji-standard/SKILL.md)
* **Absolute Ban:** Emojis (Unicode emojis such as rockets, fire, sparkles, lightbulbs, charts, lightning) are strictly forbidden across:
  * User Interfaces (buttons, navigation, badges, status pills, toast notifications).
  * Git commit messages and pull request titles/descriptions.
  * Test suites, logs, and console output.
  * Code comments, markdown headers, and documentation.
* **Approved Alternatives:**
  * **Vector Icons:** Use consistent SVG icon sets with matching stroke widths (Lucide, Radix Icons, Heroicons, Phosphor).
  * **Geometric / Typographic Characters:** Use refined geometric symbols (`->`, `+`, `/`, `*`, `•`) or CSS dots (`w-2 h-2 rounded-full bg-emerald-500`).
  * **Semantic Badges:** Use subtle borders, tinted backgrounds, and typography weights to denote state.

### 1.2 Anti-Generic Design & Art Direction
*Reference Skill:* [`design-and-tokens/frontend-art-direction`](https://github.com/cristian-haro/skills/blob/main/design-and-tokens/frontend-art-direction/SKILL.md)
* Reject standard "AI template" aesthetics (centered titles with generic blue buttons and bland gray cards).
* Choose and strictly adhere to one of the **10 Aesthetic Archetypes** (e.g., Editorial Swiss, Neo-Brutalist, Cyber-Tech Terminal, Luxury Minimalist, Solarpunk Clean Tech).
* Implement cohesive color systems using the **60-30-10 rule** and tinted neutral backgrounds (avoid pure `#FFFFFF` or flat `#000000`).
* Pair intentional typography (Display/Serif + Precision Sans/Mono) with fluid sizing (`clamp()`).

### 1.3 Universal Responsive & Adaptive Governance
*Reference Skill:* [`design-and-tokens/frontend-responsive-adaptive-craft`](https://github.com/cristian-haro/skills/blob/main/design-and-tokens/frontend-responsive-adaptive-craft/SKILL.md)
* **Mobile-First Invariant:** Base layouts must function cleanly down to 320px widths without horizontal scrolling (`overflow-x: clip`).
* **Fluid Tokens:** Use `clamp()` for typography and spatial gutters to eliminate abrupt layout jumps.
* **Dynamic Viewports & Safe Areas:** Leverage `100dvh` for mobile containers and protect bottom navigation bars with `env(safe-area-inset-bottom)`.
* **Ergonomic Touch Boundaries:** All interactive elements must maintain minimum 44x44px clickable target bounds on touch viewports.

### 1.4 Flash-Free Light/Dark Theming
*Reference Skill:* [`design-and-tokens/frontend-theme-light-dark-craft`](https://github.com/cristian-haro/skills/blob/main/design-and-tokens/frontend-theme-light-dark-craft/SKILL.md)
* **Anti-FOUC Invariant:** Always evaluate theme preferences synchronously in a blocking `<head>` script prior to DOM paint.
* **Tinted Neutrals:** Use tinted slate/obsidian in dark mode and tinted bone/paper in light mode; never use raw `#000000` or pure `#FFFFFF`.
* **Luminance-Driven Elevation:** Elevate dark mode surfaces through lighter luminance backgrounds, not drop shadows.

---

## 2. Architecture & Code Quality Standards

### 2.1 Hexagonal Architecture & Clean Domain Core (Ports & Adapters)
*Reference Skill:* [`architecture-and-contracts/architecture-hexagonal-core`](https://github.com/cristian-haro/skills/blob/main/architecture-and-contracts/architecture-hexagonal-core/SKILL.md)
* **Inward Dependency Inversion:** The Domain Layer (`domain/`) must remain 100% pure TypeScript/JavaScript with zero external dependencies (no ORMs, no HTTP frameworks, no external SDKs).
* **Ports (Interfaces):** Define discrete Inbound Ports (Use Case interfaces) and Outbound Ports (Repository / Service / Gateway interfaces) inside `application/ports/`.
* **Adapters (Implementations):** Confine database drivers (Prisma, Drizzle, SQL), HTTP controllers (Fastify, Express), RPC routers (tRPC), and third-party APIs strictly inside `infrastructure/adapters/`.
* **Tactical DDD:** Encapsulate business invariants and rules inside rich Entities and Value Objects. Never build anemic models with naked public mutable properties.
* **Granular File Decomposition (Strict Line Budget):** Enforce Single Responsibility per file. Keep files under 150-200 lines (hard cap 200 lines; reject 500+ line god files). 1 Entity = 1 file, 1 Value Object = 1 file, 1 Use Case = 1 file, 1 Port = 1 file, 1 Mapper = 1 file.
* **Extracted Persistence Mappers:** Database repositories must delegate object conversion to dedicated `*.mapper.ts` files to prevent adapter bloat.
* **Test Isolation:** Provide lightweight In-Memory repository adapters for lightning-fast application use case tests without database overhead.

### 2.2 Passwordless Auth, Contracts & State Management
*Reference Skills:* [`frontend-engineering/frontend-auth-otp-passwordless-craft`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-auth-otp-passwordless-craft/SKILL.md), [`architecture-and-contracts/fullstack-api-contracts-trpc-openapi`](https://github.com/cristian-haro/skills/blob/main/architecture-and-contracts/fullstack-api-contracts-trpc-openapi/SKILL.md), [`frontend-engineering/frontend-state-data-architecture`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-state-data-architecture/SKILL.md)
* **Passwordless OTP:** Implement unified email/phone inputs, auto-advancing 6-digit PIN inputs, WebOTP API auto-fill, and RBAC authorization guards.
* **Data Contracts:** All client-server boundaries must use strict schemas (tRPC v11 with Zod or TypeBox, or OpenAPI v3.1).
* **Server State:** Use TanStack Query v5 or SWR. Implement optimistic UI updates with automatic rollback on error.
* **Client State:** Keep local state as close to leaves as possible. Use Zustand for complex cross-component state.
* **Forms & Validation:** Use React Hook Form + Zod with accessible ARIA error messages and client-side media compression.

### 2.3 Performance & Resilience
*Reference Skills:* [`frontend-engineering/frontend-ux-performance-ergonomics`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-ux-performance-ergonomics/SKILL.md), [`frontend-engineering/frontend-pwa-offline-first`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-pwa-offline-first/SKILL.md)
* **Core Web Vitals:** Target INP < 50ms, LCP < 2.5s, CLS < 0.1.
* **Large Datasets:** Always virtualize lists exceeding 100 items (TanStack Virtual).
* **Offline-First & PWA:** Where applicable, use IndexedDB (Dexie.js) with queued mutations and background sync.

### 2.4 Security Hardening
*Reference Skill:* [`frontend-engineering/frontend-security-hardening`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-security-hardening/SKILL.md)
* **CSP:** Enforce strict Content Security Policy with dynamic nonces.
* **Sanitization:** All rich HTML rendering must pass through DOMPurify with strict attribute allowlists.
* **Authentication:** Store sensitive access tokens in memory or HttpOnly cookies; never in raw `localStorage`.

---

## 3. Continuous Testing & Multi-Viewport QA

### 3.1 Multi-Screen & Responsive Quality Assurance
*Reference Skill:* [`testing-and-quality/cross-viewport-responsive-testing`](https://github.com/cristian-haro/skills/blob/main/testing-and-quality/cross-viewport-responsive-testing/SKILL.md)
* **Automated Overflow Audits:** Run automated DOM assertions verifying `scrollWidth === offsetWidth` across all screen sizes (320px, 390px, 768px, 1440px, 1920px).
* **Touch Target Audits:** Assert all interactive elements meet the minimum 44x44px clickable target bounding box on mobile viewports.
* **Visual Regression:** Compare visual snapshot regressions with `< 2%` pixel tolerance.

### 3.2 Cross-Platform E2E & Code Audits
*Reference Skills:* [`testing-and-quality/cross-platform-qa-maestro-testing`](https://github.com/cristian-haro/skills/blob/main/testing-and-quality/cross-platform-qa-maestro-testing/SKILL.md), [`testing-and-quality/agent-frontend-code-reviewer`](https://github.com/cristian-haro/skills/blob/main/testing-and-quality/agent-frontend-code-reviewer/SKILL.md)
* **Maestro Declarative Flows:** Test mobile web, native apps, orientation changes, and drawer interactions using declarative YAML.
* **6-Point Code Reviews:** Review code against Accessibility, Performance, Design Tokens, State Integrity, Security, and Conventional Git rules before merging.

---

## 4. Git, Documentation & Local Dev Standards

### 4.1 Conventional Commits v1.0.0
*Reference Skill:* [`tooling-and-devops/conventional-commits`](https://github.com/cristian-haro/skills/blob/main/tooling-and-devops/conventional-commits/SKILL.md)
* Format: `<type>(<scope>): <short description>`
* Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
* **Zero Emojis in Git:** Never prefix commits with emojis or gitmoji.
* **Breaking Changes:** Append `!` before the colon (e.g., `feat(api)!: migrate to trpc v11`) and document in footer.

### 4.2 Unified Bilingual README & Visual Project Captures
*Reference Skill:* [`workflow-and-content/bilingual-docs-and-readme-craft`](https://github.com/cristian-haro/skills/blob/main/workflow-and-content/bilingual-docs-and-readme-craft/SKILL.md)
* **Single-File Bilingual README:** Provide English and Spanish versions in a single `README.md` with anchor navigation (`#english-version` and `#versión-en-español`).
* **Visual Tool Walkthroughs:** Include high-fidelity screenshots in `docs/assets/screenshots/` (WebP/PNG < 500 KB) with sanitized mock data and descriptive bilingual captions.
* **Architecture Decision Records (ADRs):** Document significant technical decisions in `docs/adr/`.

### 4.3 Local Orchestration with Spike
*Reference Skill:* [`tooling-and-devops/spike-local-dev-orchestrator`](https://github.com/cristian-haro/skills/blob/main/tooling-and-devops/spike-local-dev-orchestrator/SKILL.md)
* Manage local dev servers, conflict-free port allocations, and live log streaming via Spike.

### 4.4 Containerized Development Stacks
*Reference Skill:* [`tooling-and-devops/docker-containerized-dev-stacks`](https://github.com/cristian-haro/skills/blob/main/tooling-and-devops/docker-containerized-dev-stacks/SKILL.md)
* Multi-stage build Dockerfiles, non-root users (`appuser`), Docker Compose dev topologies with volume isolation, and local service integrations.

---

## 5. Primary Skills Activation Matrix

When developing features, refactoring, or reviewing code, consult and activate the foundational skills from the 7 taxonomy categories:

| Domain / Need | Primary Skills to Activate |
| :--- | :--- |
| **Domain Architecture & Contracts** | [`architecture-hexagonal-core`](https://github.com/cristian-haro/skills/blob/main/architecture-and-contracts/architecture-hexagonal-core/SKILL.md)<br>[`fullstack-api-contracts-trpc-openapi`](https://github.com/cristian-haro/skills/blob/main/architecture-and-contracts/fullstack-api-contracts-trpc-openapi/SKILL.md) |
| **Design, Theming, Tokens & Responsive** | [`frontend-theme-light-dark-craft`](https://github.com/cristian-haro/skills/blob/main/design-and-tokens/frontend-theme-light-dark-craft/SKILL.md)<br>[`frontend-responsive-adaptive-craft`](https://github.com/cristian-haro/skills/blob/main/design-and-tokens/frontend-responsive-adaptive-craft/SKILL.md)<br>[`frontend-art-direction`](https://github.com/cristian-haro/skills/blob/main/design-and-tokens/frontend-art-direction/SKILL.md)<br>[`frontend-design-systems-tokens`](https://github.com/cristian-haro/skills/blob/main/design-and-tokens/frontend-design-systems-tokens/SKILL.md)<br>[`zero-emoji-standard`](https://github.com/cristian-haro/skills/blob/main/design-and-tokens/zero-emoji-standard/SKILL.md) |
| **Interactions, Shaders & AI UX** | [`frontend-ai-ux-patterns`](https://github.com/cristian-haro/skills/blob/main/interactions-and-visuals/frontend-ai-ux-patterns/SKILL.md)<br>[`frontend-craft-microinteractions`](https://github.com/cristian-haro/skills/blob/main/interactions-and-visuals/frontend-craft-microinteractions/SKILL.md)<br>[`frontend-data-visualization-d3`](https://github.com/cristian-haro/skills/blob/main/interactions-and-visuals/frontend-data-visualization-d3/SKILL.md) |
| **Frontend Engineering, Auth & Client Core** | [`frontend-auth-otp-passwordless-craft`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-auth-otp-passwordless-craft/SKILL.md)<br>[`frontend-platform-readiness-seo`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-platform-readiness-seo/SKILL.md)<br>[`frontend-state-data-architecture`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-state-data-architecture/SKILL.md)<br>[`frontend-forms-validation-craft`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-forms-validation-craft/SKILL.md)<br>[`frontend-security-hardening`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-security-hardening/SKILL.md)<br>[`frontend-ux-performance-ergonomics`](https://github.com/cristian-haro/skills/blob/main/frontend-engineering/frontend-ux-performance-ergonomics/SKILL.md) |
| **Testing, QA & Multi-Viewport** | [`cross-viewport-responsive-testing`](https://github.com/cristian-haro/skills/blob/main/testing-and-quality/cross-viewport-responsive-testing/SKILL.md)<br>[`cross-platform-qa-maestro-testing`](https://github.com/cristian-haro/skills/blob/main/testing-and-quality/cross-platform-qa-maestro-testing/SKILL.md)<br>[`agent-frontend-code-reviewer`](https://github.com/cristian-haro/skills/blob/main/testing-and-quality/agent-frontend-code-reviewer/SKILL.md) |
| **Tooling, Monorepos & CI/CD** | [`cicd-github-actions-releases`](https://github.com/cristian-haro/skills/blob/main/tooling-and-devops/cicd-github-actions-releases/SKILL.md)<br>[`conventional-commits`](https://github.com/cristian-haro/skills/blob/main/tooling-and-devops/conventional-commits/SKILL.md)<br>[`docker-containerized-dev-stacks`](https://github.com/cristian-haro/skills/blob/main/tooling-and-devops/docker-containerized-dev-stacks/SKILL.md)<br>[`spike-local-dev-orchestrator`](https://github.com/cristian-haro/skills/blob/main/tooling-and-devops/spike-local-dev-orchestrator/SKILL.md) |
| **Docs, Content & Handover** | [`bilingual-docs-and-readme-craft`](https://github.com/cristian-haro/skills/blob/main/workflow-and-content/bilingual-docs-and-readme-craft/SKILL.md)<br>[`context-prompt-generator`](https://github.com/cristian-haro/skills/blob/main/workflow-and-content/context-prompt-generator/SKILL.md)<br>[`weekly-content-generator`](https://github.com/cristian-haro/skills/blob/main/workflow-and-content/weekly-content-generator/SKILL.md) |

---

## 6. Pre-Commit & Pre-Release Execution Checklist

Before completing any task, opening a PR, or deploying, ensure:

- [ ] **Strict Zero-Emoji Compliance:** No emojis exist in UI components, code, comments, test suites, docs, or git commits.
- [ ] **Vector SVGs Exclusively:** All icons use Lucide, Radix, Heroicons, or Phosphor SVGs.
- [ ] **Passwordless Auth & Token Security:** Authentication uses passwordless OTP/Magic Links; tokens are in-memory with HttpOnly refresh cookies.
- [ ] **Flash-Free Light/Dark Theming:** Theming evaluates in synchronous blocking script; neutrals are tinted OKLCH (no `#000000`/`#FFFFFF`).
- [ ] **Hexagonal Architecture Decoupled:** Domain logic has zero framework or database dependencies; ports abstract infrastructure adapters.
- [ ] **Granular File Decomposition:** Strict line budget (< 150-200 lines per file, 1 concept per file, zero god files).
- [ ] **Mobile-First Responsive Verification:** Layout tested and functional from 320px to 4K with zero horizontal overflow (`overflow-x: clip`).
- [ ] **Touch Target Ergonomics:** Clickable elements maintain >= 44x44px bounding boxes on touch viewports.
- [ ] **Multi-Viewport Test Suite Passed:** Automated Playwright or Maestro responsive tests pass without visual clipping.
- [ ] **End-to-End Type Safety:** Strict TypeScript types with Zod / tRPC contract enforcement (no `any` overrides).
- [ ] **Accessibility (a11y):** ARIA labels, semantic HTML, keyboard focus rings, and WCAG contrast ratios satisfied.
- [ ] **Security Hardened:** Dynamic CSP nonces, HttpOnly token storage, and DOMPurify sanitization in place.
- [ ] **Conventional Commits v1.0.0:** Git commits strictly follow `<type>(<scope>): <description>` without emojis.

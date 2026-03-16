<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles:
	- placeholder PRINCIPLE_1_NAME -> I. Static-First Architecture
	- placeholder PRINCIPLE_2_NAME -> II. Accessibility as a Release Gate
	- placeholder PRINCIPLE_3_NAME -> III. Performance Budgets are Mandatory
	- placeholder PRINCIPLE_4_NAME -> IV. Privacy and Security by Default
	- placeholder PRINCIPLE_5_NAME -> V. Verifiable Quality Before Publish
- Added sections:
	- Product and Technical Constraints
	- Delivery Workflow and Quality Gates
- Removed sections:
	- None
- Templates requiring updates:
	- .specify/templates/plan-template.md: ✅ updated
	- .specify/templates/spec-template.md: ✅ updated
	- .specify/templates/tasks-template.md: ✅ updated
	- .specify/templates/commands/*.md: ⚠ pending (directory not present in repository)
	- .github/prompts/*.md: ✅ reviewed (no outdated agent-specific references)
- Follow-up TODOs:
	- None
-->

# Villana Static Web App Constitution

## Core Principles

### I. Static-First Architecture
Villana MUST ship as a static web app by default. Features MUST run without a
server-side runtime unless a documented exception is approved in Governance.
All pages MUST render from static assets and deterministic client-side logic.
Rationale: Static delivery reduces operational risk, cost, and attack surface.

### II. Accessibility as a Release Gate
Every user-facing change MUST meet WCAG 2.2 AA for keyboard navigation,
semantic structure, text alternatives, color contrast, and visible focus.
Accessibility verification MUST include automated checks and manual keyboard
testing before publish. Rationale: Accessibility is a product requirement, not
an optional enhancement.

### III. Performance Budgets are Mandatory
Each feature MUST define and satisfy explicit performance budgets for Core Web
Vitals and asset size. Default targets are LCP <= 2.5s, INP <= 200ms,
CLS <= 0.1 on representative mid-tier mobile hardware, and JavaScript payload
kept to the minimum required for user value. Rationale: Predictable speed is
required for usability, discoverability, and conversion.

### IV. Privacy and Security by Default
Client bundles MUST NOT contain secrets, private keys, or privileged tokens.
Third-party scripts MUST be justified in the spec with data-sharing impact and
fallback behavior. Security headers, dependency updates, and input sanitization
MUST be validated for each release candidate. Rationale: Static apps still
handle sensitive behavior and must be resilient to supply-chain and browser
risks.

### V. Verifiable Quality Before Publish
A change MUST include verification evidence proportional to risk: unit tests
for logic, integration or end-to-end checks for key user journeys, and
regression checks for accessibility and performance budgets. A feature cannot be
marked done until acceptance scenarios pass and preview deployment is validated.
Rationale: Fast iteration is only sustainable when outcomes are measurable.

## Product and Technical Constraints

- Primary delivery target is modern evergreen browsers and responsive layouts.
- Progressive enhancement MUST be preferred over hard JavaScript dependence for
	critical content.
- Build outputs MUST be reproducible from versioned source with pinned tooling.
- External services (analytics, media, APIs) MUST fail gracefully and MUST NOT
	block first render of core content.

## Delivery Workflow and Quality Gates

1. Spec phase MUST include accessibility, performance, and privacy impact notes.
2. Plan phase MUST include a Constitution Check with explicit pass or fail for
	 each core principle.
3. Tasks phase MUST include work items for performance validation,
	 accessibility verification, and release hardening.
4. Pull requests MUST attach objective evidence (test output, Lighthouse or
	 equivalent metrics, and manual accessibility notes).
5. Release approval MUST confirm no unresolved Constitution violations.

## Governance

This Constitution is the highest project authority for engineering delivery.
When other guidance conflicts, this document takes precedence.

Amendment procedure:
1. Propose changes in a pull request with rationale, impact, and migration
	 notes for active work.
2. Obtain approval from at least one project maintainer.
3. Update dependent templates and guidance in the same change set.

Versioning policy:
- MAJOR increments for backward-incompatible governance changes or principle
	removal/redefinition.
- MINOR increments for new principles/sections or materially expanded guidance.
- PATCH increments for clarifications, wording improvements, and typo fixes.

Compliance review expectations:
- Every plan and pull request MUST include a Constitution compliance check.
- Violations MUST be documented in Complexity Tracking with explicit approval.
- Periodic audits SHOULD occur at least once per release cycle.

**Version**: 1.0.0 | **Ratified**: 2026-03-16 | **Last Amended**: 2026-03-16

# Project Prompt — get-dotenv (assistant instructions)

When updated: 2025-12-04T00:00:00Z

## Scope

This document contains only project-specific assistant instructions that augment the system prompt. All durable product requirements have been moved to:

- .stan/system/stan.requirements.md

Keep requirement statements out of this file; use it solely to guide assistant behavior for this repository.

## Documentation formatting policy (HARD RULE — project-level)

- NEVER manually hard-wrap narrative Markdown or plain text content anywhere in this repository.
- Paragraphs MUST be single logical lines; insert blank lines between paragraphs for structure.
- Only preformatted/code blocks (fenced code, CLI excerpts, YAML/JSON examples) may wrap as needed; lists may use one item per line.
- This policy is enforced during review. If prose is manually wrapped, fix it by unwrapping to single-line paragraphs.

## Fence hygiene for embedded code blocks (project-level reminder)

- When editing Markdown docs that contain embedded fenced code blocks, compute the outer fence length per the system “Fence Hygiene” algorithm: choose N = (maximum contiguous backticks found inside the block) + 1, with a minimum of 3.
- Re-scan after composing each block to ensure the outer fence length exceeds any inner run of backticks; adjust N if needed.
- Do not hardcode triple backticks when inner fenced blocks may be present; always compute dynamically.
- These rules apply to all examples and templates included in docs, including multi-fenced samples (e.g., diffs inside code blocks).

## Typing & API DX policy (HARD RULE — project-level)

- Type casts are a code smell. ALWAYS prefer type inference over type casts.
- Embrace generics to facilitate type inference; design APIs to carry types through naturally.
- The public API MUST support type inference without requiring downstream consumers to pass explicit type parameters.
- Exceptions to these rules are permitted only after a brief design discussion and rationale captured in the dev plan; prefer localized, well-justified exceptions.
- CRITICAL: Downstream DX is NON-NEGOTIABLE. Favor intuitive signatures and inferred types over verbose annotations or casts; changes that degrade downstream inference require rework or a design adjustment before merging.
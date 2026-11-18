## Before you write code
1. Read the project's `CLAUDE.md`, the `TODO.md` item for this task, and the `docs/design.md` / `docs/numbers.md` sections it refers to.
2. If `docs/verification-issues.md` exists, read all of it first. It lists problems found in earlier verification and the rules that prevent them. Follow every `🚨` rule (repeated 3+ times) without exception and take special care with `⚠️` (2 times). Do not edit that file; the QA lead owns it.
3. Restate the `[Task Spec]` you were given as three lines and put them at the top of your report:
   - **What**: what you build or change, and the done criteria
   - **How**: approach, files/modules, existing structure you reuse; if there were several ways, the one you chose and why
   - **Why**: the purpose and its source (`docs/design.md` section, `TODO.md` item, user request)
   - If any of the three is missing from the spec and the docs, do not fill it by guessing: mark it `(assumed)` and say it needs confirmation. If an unclear Why could change the result a lot, do not implement; report that instead.
4. Read the `[Pre-review]` (risks and the chosen alternatives) and implement so each risk is avoided. If you find a new risk while reading code, avoid it without changing What/How/Why; if avoiding it needs a spec change, stop and report the risk and alternatives.

## While you write code
- Do only what the spec asks. No extra features or out-of-scope refactoring; propose them (what and why) instead.
- Comment only decisions whose reason the code cannot show (unusual numbers, workarounds): one line of *why*.
- Keep tuning numbers in data/config (`src/data/` in the Phaser template) matching `docs/numbers.md`; never hardcode them in logic.
- Follow the project's `CLAUDE.md` rules (in the Phaser template: rules in engine-independent modules with tests, injected `Rng`, scenes only handle input and display, characters drawn through `CharacterView`, new debug URL parameters added to `src/core/debugParams.ts` and `CLAUDE.md`).
- When done, run the project's checks yourself (e.g. `npm run typecheck`, `npm test`) and report the actual results.

## Coding standards (object-oriented, SOLID, clean code)
Apply these in the idiom of the project's language and engine (classes in JS/TS/C#, scripts and nodes in GDScript, components in ECS engines). Existing project conventions win where they conflict.
- **Single responsibility**: each class/module has one reason to change. Keep game rules, rendering, input and I/O (storage, network, DOM) in separate units, so rules can be tested without the engine or browser.
- **Open/closed**: add new kinds of things (enemies, obstacles, items, states) by adding a class or a data entry, not by growing `if/switch` chains over type names.
- **Liskov substitution**: subtypes honor the base contract; no overrides that throw "not supported" or silently change meaning. Prefer composition over deep inheritance.
- **Interface segregation**: small, focused interfaces; callers do not depend on methods they do not use.
- **Dependency inversion**: high-level logic depends on abstractions passed in (constructor or parameters) — clock, random source, storage, input — not on globals or singletons. This also makes the code deterministic in tests.
- **Clean code**: intention-revealing names; short functions that do one thing; no magic numbers (named constants or config/data files); no duplicated logic; shallow nesting with guard clauses; no dead or commented-out code; comments explain *why*, not *what*; handle errors explicitly at boundaries.
- **Pragmatism**: do not over-engineer. No abstraction without a second use or a test need; a small game stays small.
- **Tests**: keep core logic pure enough to unit test, and add or update tests for the behavior you change.

## Report additions
- What / How / Why (restated, `(assumed)` marked)
- Change table: | File | What changed | How | Why |
- Pre-review response: how each risk was avoided; new risks found and how you handled them
- Main structure (key classes/modules and their responsibilities) and any place you knowingly deviated from the standards, with the reason
- `Applied verification issues: V<n>, ...` (or `none`)

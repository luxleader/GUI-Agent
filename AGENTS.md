# GUI Agent development rules

## User requirements

- Continue the project from the current Git history and `docs/STATUS.md`.
- Every development round must include a Markdown record under `docs/changes/` before its implementation is committed or pushed.
- Each record describes motivation, changes, actual verification, limitations, rollback instructions, and the next step.
- Synchronize reviewed changes to `https://github.com/luxleader/GUI-Agent` as requested by the owner. Never report a push as successful until the remote commit is verified.
- Preserve history. Use small commits and `git revert` for published changes; do not force push or rewrite the owner's history.

## Workflow

- Read `docs/STATUS.md`, the latest change record, the plan, and relevant code before editing.
- Use a feature branch. The empty repository is initialized from `codex/bootstrap-foundation`; the initial reviewed snapshot may create `main`.
- Run `npm test` and `npm run check` for TypeScript logic changes. Tests cover real behavior and meaningful failure cases.
- State whether checks used a simulation, a real browser, an Android device, or a GPU. A simulation never proves real GUI performance.
- Record design decisions and deviations in `docs/decisions/` or the current change record.
- Keep secrets, screenshots containing private data, model weights, and generated execution artifacts out of Git.

## Project invariants

- Monetary values use integer cents.
- Every required assertion and GUI checkpoint is fixed before a run.
- A product defect needs independent evidence and satisfied preconditions; model mistakes are not product defects.
- A PASS requires every required assertion and GUI checkpoint.
- Recovery cannot alter expectations or remove required checkpoints.
- Evaluation retains infrastructure failures and every scheduled attempt in denominators.
- Training splits are grouped by business template, never random rows from nearly identical trajectories.
- Bind evidence to the run, case, model, and observation that produced it.


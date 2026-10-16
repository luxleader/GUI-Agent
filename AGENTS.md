# SWE Agent development rules

## User requirements

- Continue from the current Git history, docs/STATUS.md, and the SWE Agent design/plan. GUI work is retained as historical work.
- Every development round must include a Markdown record under docs/changes/ before its implementation is committed or pushed.
- Each record describes motivation, changes, actual verification, limitations, rollback instructions, and the next step.
- Synchronize reviewed changes to https://github.com/luxleader/GUI-Agent as requested by the owner. Never report a push as successful until the remote commit is verified.
- Preserve history. Use small commits and git revert for published changes; do not force push or rewrite the owner's history.

## Workflow

- Read docs/STATUS.md, the latest change record, the SWE design and plan, and relevant code before editing.
- Use a feature branch. Keep the existing GUI branch and PR history separate from this SWE plan.
- Run the checks documented for the affected code when implementing code changes. Report which checks were run and whether they used a simulation, a real container benchmark, or GPU training.
- A simulation or smoke run does not prove SWE-bench performance. Never report a training gain without a real, versioned evaluation.
- Record design decisions and deviations in docs/decisions/ or the current change record.
- Keep credentials, private data, model weights, raw datasets, container caches, and large generated execution artifacts out of Git.

## SWE project invariants

- Freeze evaluation manifests before training and model selection; exclude overlapping issue/PR and near-duplicate tasks from training.
- Filter benchmark fields with an allowlist. Do not expose held-out gold patches, test patches, hidden tests, or scorer internals to the Agent or its training samples.
- Keep the scorer outside the Agent's permission boundary. Run untrusted repository code in disposable, resource-limited environments without credentials or sensitive host mounts.
- Retain infrastructure failures and every scheduled attempt in evaluation denominators; document exclusions.
- Bind every trajectory and score to the task, repository base commit, split, model, Agent version, tool image, and run ID.
- Report benchmark results only with actual evaluator output and include uncertainty and cost.
- Keep model weights, credentials, raw datasets, container caches, and large execution artifacts out of Git.

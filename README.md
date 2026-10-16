# PatchPilot：SWE 编程 Agent 后训练

面向真实 Python 代码仓库 issue 修复的 Agent 后训练与评测项目。Agent 在隔离环境中完成仓库探索、问题定位、代码修改和测试验证；项目重点比较 SFT、DPO、GRPO 与训练数据/奖励设计的效果。

当前处于方案阶段，尚无 SWE Agent 代码、容器任务运行、模型训练或 SWE-bench 实测分数。计划使用用户指定的 GitHub 仓库地址；仓库名 GUI-Agent 与新方向不匹配，是否改名或另开仓库留待后续维护决策。

- [项目状态](docs/STATUS.md)
- [项目设计：业务背景、创新方向与预期结果](docs/superpowers/specs/2026-10-16-swe-agent-posttraining-design.md)
- [16 周实施计划](docs/superpowers/plans/2026-10-16-swe-agent-posttraining.md)
- [每轮变更记录](docs/changes/)
- [维护与 Git 回溯](docs/MAINTENANCE.md)

旧 GUI Agent 方案、代码和 PR #1 保留为历史，不并入此 SWE 计划分支。新项目首期不依赖 Android；执行环境优先验证 Linux x86_64 与 Docker，训练模型和版本待阶段 0 硬件审计后决定。

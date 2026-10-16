# 项目开发进度

最近更新：2026-10-16（Asia/Shanghai）。

## 当前方向

用户已选择 SWE 编程 Agent 后训练项目。方案名称为 PatchPilot，研究在真实 Python 仓库 issue 修复中比较 Base、SFT、DPO、GRPO，并评估失败导向轨迹、奖励抗投机和执行成本。

项目处于计划阶段：新方向尚无 Agent 代码、Docker 任务运行、训练权重、GPU 训练或 SWE-bench 实测结果。方案已推送到分支 codex/swe-agent-posttraining-plan，并提交为草稿 [PR #2](https://github.com/luxleader/GUI-Agent/pull/2) 供审阅；远端 SHA 与本地提交一致。

## 里程碑

| 项目 | 状态 | 完成证据 |
| --- | --- | --- |
| SWE Agent 业务背景与后训练研究问题 | 方案完成 | docs/superpowers/specs/2026-10-16-swe-agent-posttraining-design.md |
| 创新方向、数据防泄漏、实验矩阵与预期指标 | 方案完成，尚未验证 | 同上 |
| 16 周实施计划与阶段验收条件 | 方案完成，待执行 | docs/superpowers/plans/2026-10-16-swe-agent-posttraining.md |
| Linux/Docker/GPU/许可证可行性审计 | 待办 | 尚无 |
| SWE Agent runner 与独立 scorer | 待实现 | 尚无 |
| 训练数据与泄漏审计 | 待实现 | 尚无 |
| SFT、DPO、GRPO 与冻结评测 | 待实现 | 尚无 |

## 历史工作

GUI 自动化测试 Agent 的设计、代码和变更记录保留在历史分支。其草稿 PR [#1](https://github.com/luxleader/GUI-Agent/pull/1) 未合并；本 SWE 计划不覆盖该分支或重写历史。新方向不依赖 Android。

## 环境与下一步

本机此前未发现 Docker 或 uv 命令，GPU 状态未知。先执行阶段 0：核对 Linux x86_64/WSL2、Docker、磁盘、内存、GPU/显存、许可证和数据版本，再用 20 个任务做 smoke 与成本估算。SWE-bench harness 文档建议至少约 120 GB 可用磁盘、16 GB 内存和 8 个以上 CPU 核心；需在实际环境复核。

下一步只在容器与 scorer 边界得到验证后实现 runner 和 Base 基线；资源不足时规划独立 Linux/GPU 环境，不把 API 调用当成模型后训练。

## 继续工作时

先查看本文件、最新变更记录、SWE 设计与计划，再检查当前分支和 Git 历史。不要把 GUI 历史实验当作 SWE 结果，也不要把计划指标写成已完成结果。

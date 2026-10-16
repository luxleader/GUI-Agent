# 变更记录 005：SWE 编程 Agent 后训练计划

日期：2026-10-16

## 动机

项目方向从 GUI 自动化测试调整为 SWE 编程 Agent 后训练。需要在开始实现前明确业务场景、开源基础、训练数据与评测隔离、算法对照、创新假设和预期结果。用户没有 Android 设备；新方向不依赖 Android。

## 改动

- 新增 PatchPilot 设计说明：业务背景、SWE-Gym/SWE-bench/OpenHands/TRL 基础、创新方向、runner 架构、数据防泄漏、SFT/DPO/GRPO 对照、指标、资源门槛、风险及边界。
- 新增 16 周实施计划，包含阶段门、交付物、验收条件和资源不足时的处理。
- README、STATUS 和 AGENTS 转向 SWE Agent 方案状态；既有 GUI 设计与代码历史保留，不覆盖原 Git 历史。

## 实际检查

- 查阅 SWE-Gym、SWE-bench 数据集与 harness、OpenHands、TRL 官方仓库/文档，记录当前公开信息和链接。
- 只修改 Markdown 计划文档与项目维护说明；未修改 Agent 代码，未下载模型/数据，未运行容器 benchmark 或训练模型。
- 本轮未运行代码测试；没有 GPU 训练或 SWE-bench 实测分数。
- 提交 b69151ec2058ce083968b2770de0da9464c94310 已推送到 codex/swe-agent-posttraining-plan，使用 git ls-remote 核验远端 SHA 一致。
- 草稿 PR [#2](https://github.com/luxleader/GUI-Agent/pull/2) 已创建；PR #1 和 GUI 分支保持不变。

## 局限

- 本机此前未发现 Docker 或 uv 命令，GPU 状态未知；计划周期和任务量需在阶段 0 实测后校准。
- SWE-Gym 作者公布的论文增益仅作研究背景，不能推导为本项目结果。
- GUI-Agent 仓库名与新方向不一致；本轮沿用用户指定仓库，不改远端地址。

## 回滚

本变更通过独立分支和小提交交付。若要撤销已推送提交，使用 git revert <commit>；不重写远端历史。既有 GUI 分支和 PR 保持独立。

## 下一步

审阅计划后执行阶段 0：检查 Linux/Docker/磁盘/GPU/许可证，运行 20 个任务 smoke，再决定 runner、模型尺寸、数据切分与实际时间线。

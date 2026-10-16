# PatchPilot：SWE 编程 Agent 后训练项目设计

日期：2026-10-16
状态：方案已定，代码与训练尚未开始
工作名称：PatchPilot（仓库正式命名待后续维护决策）

## 项目摘要

PatchPilot 面向真实代码仓库缺陷修复任务，研究 SWE Agent 的后训练与评测。Agent 接收 issue，在隔离环境中读取仓库、定位问题、运行测试、修改代码并提交补丁，再由独立评测器验证。项目研究训练数据、后训练算法和可验证奖励如何改变真实修复能力，而不只比较提示词。

核心问题：固定基础模型、Agent 工具、上下文预算和评测集后，SFT、DPO、GRPO 及失败导向的数据筛选能否提高仓库级问题解决率？提升是否值得额外训练和推理成本？

SWE-Gym 论文报告：少于 500 条交互轨迹曾使其 32B 模型在 SWE-bench Verified 上获得 14 个百分点的绝对提升。这是论文特定条件下的结果，不是本项目的承诺或预期复现值。[SWE-Gym 项目与论文结果](https://github.com/SWE-Gym/SWE-Gym)

## 业务背景

目标使用方是维护 Python 服务或开源依赖的工程团队。线上故障、回归缺陷或用户报告进入 issue 队列后，工程师需要理解代码库、复现问题、定位文件、修改实现、补充或运行测试、检查回归，再提交供人工审核的补丁。重复排查占用维护者时间，跨模块问题也容易只修复表面症状或引入回归。

本项目模拟这一完整维护闭环。Agent 只在一次性容器中操作指定版本仓库，不直接接触生产环境、真实用户数据、凭证或远端写权限。它输出补丁、命令和测试证据，由人决定是否采纳。MVP 衡量的是预算内解决多少目标测试、是否保住原有通过测试、每个成功修复的时间/token/工具成本，以及可解释的失败类别。

首期限定 Python 仓库，以控制依赖和执行环境复杂度。跨语言、IDE 插件、自动创建远端 PR、多 Agent 协作和生产环境接入不纳入首期。项目不需要 Android。

## 目标与边界

### 目标

1. 建立可重放的仓库级 issue 修复 Agent 和隔离执行环境。
2. 构建有来源记录、无评测泄漏、可形成 SFT 与偏好数据的交互轨迹流水线。
3. 在统一 Agent scaffold、基础模型和推理预算下，对比提示基线、SFT、DPO、GRPO。
4. 评估失败导向轨迹课程、复合奖励与可选 verifier 的收益、成本及副作用。
5. 发布可复现配置、数据 schema、实验清单和报告；不发布受许可证限制的数据、模型权重或执行工件。

### 首期不做

- 不从零预训练基础模型。
- 不将 benchmark 的 gold patch、test patch、隐藏测试内容或评测日志放入 Agent 上下文或训练样本。
- 不把合成任务成功率当作 SWE-bench 结果。
- 不把通过已知测试等同于生产质量或自动合并权限。
- 不在没有真实运行证据时宣称获得训练增益。

## 开源基础与采用判断

| 项目 | 计划用途 | 采用方式与限制 |
| --- | --- | --- |
| [SWE-Gym](https://github.com/SWE-Gym/SWE-Gym) | 首选训练任务环境、轨迹生成思路和初期任务来源 | 项目说明约 2.4K 个真实 Python 任务、11 个仓库，并提供 234 个实例的 Lite 子集；精确数量、commit、切分和许可证在阶段 0 固定。 |
| [SWE-bench](https://github.com/SWE-bench/SWE-bench) | 统一评测协议与官方任务格式 | 官方指南列出 SWE-bench 2,294、Lite 534、Verified 500 个任务，实例包含 gold patch、test patch、FAIL_TO_PASS、PASS_TO_PASS 等字段。Lite 用于开发，Verified 作为主要冻结评测候选。[数据集指南](https://github.com/SWE-bench/SWE-bench/blob/main/docs/guides/datasets.md) |
| [OpenHands](https://github.com/OpenHands/OpenHands) | Agent 工具、工作区或执行 scaffold 候选 | 采用前比较当前版本与 SWE-Gym runner 的接口、资源和安全边界。优先复用最小必要组件，不整体复制大型运行时。其仓库列出 MIT 许可证；依赖和数据仍需单独审核。 |
| [Hugging Face TRL](https://github.com/huggingface/trl) | SFT、DPO、GRPO 训练器候选 | 当前文档提供这些后训练路径及 GRPO 环境/工具调用方向。先验证模型模板、Transformers、accelerate、PEFT 和 TRL 的兼容矩阵并锁定版本。[GRPO 文档](https://github.com/huggingface/trl/blob/main/docs/source/grpo_trainer.md) · [DPO 文档](https://huggingface.co/docs/trl/dpo_trainer) |

项目不是“再造一个 SWE-Gym”。计划贡献是可控对照实验、失败驱动的数据质量、奖励抗投机与完整成本报告；训练代码保留可复现所需的最小接口。

## 创新方向

### 1. 同条件后训练对照

固定基础模型、提示、仓库快照、工具、容器镜像、最大步数、token 预算和测试协议，比较：

- Base + 固定提示：无后训练基线。
- SFT：学习有效的仓库探索、测试迭代和补丁轨迹。
- SFT + DPO：从成功与失败结果构造偏好对。
- SFT + GRPO：以隔离执行结果作为主要可验证奖励。

回答哪种后训练在相同预算下有效，避免把模型大小、工具或推理 token 的变化误认为训练效果。

### 2. 失败类型驱动的课程数据

每条运行结果由规则标签和人工抽样审阅形成失败分类：问题理解、仓库导航、符号定位、根因分析、补丁质量、测试解释、回归、工具格式、预算管理。针对高频失败类型采集或筛选轨迹，与随机采样的等量数据比较，报告每 100 条轨迹的增益和数据成本。

### 3. 可验证且抗投机的奖励

主要奖励来自独立测试执行结果和补丁有效性。运行器在隔离工作区保护评测器和隐藏测试；记录文件改动范围、测试文件改动、评测配置变化、退出码、超时和资源消耗。修改测试不一概禁止：Agent 可以为真实缺陷补测试；但不能通过删除、放宽既有断言、篡改配置或影响评测进程获得奖励。可疑修改进入审阅并单独统计。

对比只按测试结果奖励，与加入小权重有效补丁、有限工具成本、回归和安全约束后的复合奖励。辅助奖励逐项消融，避免把风格偏好错当成任务成功。

### 4. 轨迹 verifier 与 Best-of-N（扩展项）

若主闭环稳定，再用训练轨迹的最终结果训练轻量 verifier，对多个候选补丁排序。单独报告排序准确率、候选选择增益和额外推理成本；不作为 MVP 前置条件。

以上是待验证的项目创新点，不声称发明了新的后训练算法。

## 系统结构

1. **任务清单与版本器**：保存数据集版本、实例 ID、仓库 commit、容器镜像 digest 和 split manifest。
2. **Agent loop**：读取 issue 与允许暴露的仓库上下文，通过受限工具执行搜索、读取、编辑、测试和差异检查。
3. **隔离执行器**：一次性 Linux x86_64 容器；无凭证、无宿主机写挂载，限制网络/CPU/内存/磁盘/时间；任务结束后清理。
4. **独立评测器**：容器外控制测试集和计分，执行 FAIL_TO_PASS、PASS_TO_PASS 及必要静态检查，不向 Agent 暴露隐藏结果。
5. **轨迹记录器**：记录观测、动作、工具结果、token、时间、补丁、测试结果、版本、错误和终止原因；每次运行有稳定 run ID。
6. **数据构造器**：仅从允许训练的轨迹产生 SFT 消息、DPO chosen/rejected 对或 GRPO rollout 输入。
7. **训练与评测**：记录 base model revision、adapter、seed、数据 manifest、超参、硬件和软件版本。

建议初期目录：swe_agent/runner（Agent loop 与容器接口）、swe_agent/eval（评分和失败分类）、swe_agent/data（schema 与准备脚本）、swe_agent/train（训练入口）、configs（实验配置）、docs/swe-agent（协议与结果）。目录最终以阶段 0 的技术验证为准。

## 数据设计与泄漏控制

SWE-bench 格式包含 patch 和 test_patch。读取数据后必须先执行字段白名单过滤，再将任务传给 Agent；不能只靠 prompt 提醒模型忽略答案。

1. 固定数据集与源代码 commit、许可证、下载来源和 SHA-256。
2. 在轨迹生成前冻结评测 manifest；Verified 500 项作为主评测候选，开发使用独立 dev 清单。
3. 从训练候选中排除 Verified 的 instance ID、同 issue/PR、重复 fork 任务和近重复问题文本，记录规则与命中项。
4. 对训练池按 repo、时间或问题家族分组，另做仓库留出 OOD 实验；不随机拆分相似轨迹。
5. 分开存储原始 issue、模型可见上下文、工具交互、终态补丁、公开测试摘要和人工标签；隐藏测试及 gold patch 只在独立审计/scorer 边界内管理。
6. 每个样本携带来源 instance、base commit、split、生成模型/版本、Agent 版本、工具镜像、结果证据及许可状态。
7. 偏好对来自相同任务或严格可比上下文。chosen/rejected 根据独立验证结果与人工抽查构造，不把未运行 patch 标成失败。

首轮目标：至少 500 条经去重和验证的训练交互轨迹，以及至少 300 组可复核偏好对。若计算、许可或可执行率不支持目标，先用小批量校准并记录原因，不用重复或低质量轨迹凑数。

## 训练与实验协议

训练顺序：先完成 Base 提示基线和评测；再做 SFT LoRA/adapter；用成功和失败轨迹构造 DPO；只有任务能稳定重放、奖励可独立校验且算力够用时才做小规模 GRPO；最后再考虑课程数据和 verifier。

| ID | 方法 | 关键问题 |
| --- | --- | --- |
| E0 | 基础模型 + 固定提示 | 同一工具 scaffold 的可比基线是多少？ |
| E1 | SFT | 导航、工具调用、有效补丁和完整修复是否改善？ |
| E2 | SFT + DPO | 是否减少重复试错并提高验证后修复率？ |
| E3 | SFT + GRPO | 可验证反馈是否提高解决率，训练和推理成本多少？ |
| E4 | 等量随机轨迹 vs 失败课程 | 失败导向课程是否提升单位数据收益？ |
| E5 | 测试奖励 vs 复合奖励 | 哪些辅助项改善效率，哪些引入奖励投机？ |
| E6 | 单候选 vs verifier Best-of-N | 排序增益能否覆盖候选成本？（扩展） |

每组保存模型 revision、训练数据 manifest、训练配置、硬件、seed、日志、评测清单、逐任务结果和成本。报告绝对值、差值、样本数和区间；小样本只称探索性实验。

## 指标与预期结果

### 核心指标

- **Resolved rate**：官方评测器判断目标 FAIL_TO_PASS 全部通过且 PASS_TO_PASS 保持通过。
- **有效补丁率**：补丁可应用，且未破坏评测约束的比例。
- **回归率**：原本需通过的测试未通过的比例。
- **执行效率**：每任务工具调用、回合数、wall-clock、token、费用；每个 resolved task 的成本。
- **失败恢复**：测试失败后继续诊断并产出有效修复的比例。
- **安全/奖励投机事件**：测试或配置篡改、评测器干扰、危险命令、超预算、容器逃逸尝试。
- **分层表现**：按仓库、任务类别、修复跨度和初始执行状态报告，并标出样本数。

### 验收目标（目标值，不是承诺）

1. 从固定 manifest 重放 Base、SFT、DPO 的核心评测，结果和逐任务证据可追溯；资源允许时再加 GRPO。
2. 完成 500 条训练轨迹和 300 组偏好对的质量审计；不足时列为未达成，不伪造完成。
3. 冻结且无泄漏的评测相对 Base 达到 **+5 个百分点绝对 resolved rate** 的研究目标，并提供样本数和不确定区间。若区间覆盖 0，结论写“未能确认提升”。
4. 所有 benchmark 结果由独立评测器生成；删测、降级断言、改 scorer 或隐藏测试造成的假阳性计为失败并报告。
5. 提供可重放失败案例、逐任务错误分类、训练/推理成本；即使模型未提升，也交付可信的负结果。

Verified 集只有 500 项，精度有限。需报告二项比例区间或 bootstrap 区间及任务级配对差异；小百分点差异不能凭单次数字宣称显著。

### 交付结果

- 可在隔离仓库任务上运行并记录完整轨迹的 SWE Agent runner。
- 经过泄漏审计的训练/dev/eval manifest 和可复核数据 schema。
- 至少一个 SFT adapter、一组 DPO 对照；GRPO 视资源和稳定性完成。
- 统一评测报告，覆盖成功率、失败类型、推理成本和奖励投机风险。
- 可复现实验配置及清楚标注的限制。上述数量和分数均为目标，不是已完成结果。

## 资源、时间线与风险

SWE-bench 官方 harness 建议至少约 120 GB 可用磁盘、16 GB 或以上内存、8 个以上 CPU 核心，并优先使用 x86_64；ARM64 仍属实验性支持。[Harness 环境要求](https://github.com/SWE-bench/SWE-bench/blob/main/docs/reference/harness.md)

本机先前检查未发现 Docker 或 uv 命令，GPU 状态未知；阶段 0 必须实测 Docker/WSL2、Linux x86_64、磁盘、内存、GPU/显存、额度和网络。训练模型尺寸在硬件审计后选择；无 GPU 时先完成 runner、公开基线与小规模数据流水线，再决定是否租用 GPU。API 教师调用不等同于本地模型后训练。

| 周期 | 阶段 | 主要出口条件 |
| --- | --- | --- |
| 第 1 周 | 环境、许可证、版本与 20 任务 smoke | 能运行任务，或选定兼容 Linux 云环境与预算 |
| 第 2–3 周 | Agent runner、独立 scorer、Base 基线 | 20 smoke、100 dev 任务有完整记录 |
| 第 4–5 周 | 数据 schema、去重、泄漏审计、轨迹采集 | 冻结 split，首批合格轨迹 |
| 第 6–8 周 | SFT 与数据量/质量消融 | adapter 可复现评测，报告失败类别 |
| 第 9–10 周 | DPO 偏好数据与训练 | 一组对照结果及偏好审计 |
| 第 11–12 周 | 小规模 GRPO 与奖励消融 | 奖励可验证、成本可控；否则记录阻塞原因 |
| 第 13–15 周 | 冻结评测与配对分析 | 最终 benchmark 不参与训练和选型，报告生成 |
| 第 16 周 | 文档、复现入口、发布整理 | 外部开发者能重放允许发布的实验 |

时间按一名全职开发者估算，实际会受 GPU、镜像和数据许可影响。主要风险包括 Windows/Docker 与磁盘条件不足、GPU 不可用、训练/评测泄漏、奖励投机、任务失败率高、许可证限制和小样本方差。缓解方法是阶段 0 环境门、隔离 scorer、固定 manifest、保留 infra failure 分母、逐项消融和许可清单。

## Git 与维护原则

- 沿用用户指定仓库 URL 和 Git 历史；本方案放在独立 feature branch 和 PR 中，保留 GUI 分支及 PR，不覆盖或强推历史。
- 仓库名 GUI-Agent 与新方向不一致；当前继续使用指定仓库，实施前再决定是否改名或另开仓库，不擅自变更远端地址。
- 每轮更新 docs/changes，记录真实改动、检查结果、局限、回滚方式和下一步。
- Git 只保留代码、schema、许可允许的配置和聚合结果；权重、凭证、原始数据、容器缓存和大工件不入库。
- 实验结果关联数据 manifest、代码 commit、模型 revision、环境 digest 和 seed。

## 参考资料

1. [SWE-Gym](https://github.com/SWE-Gym/SWE-Gym)：ICML 2025 论文代码、任务规模说明及作者报告结果。
2. [SWE-bench 数据集指南](https://github.com/SWE-bench/SWE-bench/blob/main/docs/guides/datasets.md)：基准规模、字段和 gold patch/test patch 边界。
3. [SWE-bench harness 参考](https://github.com/SWE-bench/SWE-bench/blob/main/docs/reference/harness.md)：容器执行与资源条件。
4. [OpenHands](https://github.com/OpenHands/OpenHands)：候选 Agent scaffold 与运行时。
5. [TRL GRPO](https://github.com/huggingface/trl/blob/main/docs/source/grpo_trainer.md) 与 [TRL DPO](https://huggingface.co/docs/trl/dpo_trainer)：候选后训练工具链，采用版本在阶段 0 锁定。

本文件是实施设计，不是功能交付报告。当前没有 SWE Agent 代码、训练权重、容器任务运行、GPU 训练或 SWE-bench 实测分数。项目创新点是待验证的工程与实验设计，完成受控实验后才能判断哪些方向有效。

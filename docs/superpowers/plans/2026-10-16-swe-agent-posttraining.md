# PatchPilot SWE Agent 后训练实施计划

日期：2026-10-16
状态：待阶段 0 环境与资源审计后执行
目标：实现真实仓库 issue 修复 Agent，并完成 SFT、DPO、可行时的 GRPO 对照评测。

完整研究边界、数据规则和创新假设见 [设计说明](../specs/2026-10-16-swe-agent-posttraining-design.md)。

## 执行约定

- 每个阶段在独立 feature branch 上交付；已推送提交只用 git revert 回滚。
- 每轮先更新 docs/changes 记录，再提交和同步到用户指定 GitHub 仓库。
- 先验证容器执行和 scorer，再增加任务规模或训练复杂度。
- 开发集可用于迭代；冻结评测集不进入训练、提示词调优或 checkpoint 选择。
- 收集 infra failure 与 Agent failure；报告真实任务数、分母和移除原因。
- 代码变更运行对应检查；benchmark 与模型实验分开报告。本轮仅写计划，不运行代码测试。

## 阶段 0：可行性与版本锁定（第 1 周）

### 工作项

1. 记录 Linux x86_64 / WSL2、Docker 版本、磁盘、内存、CPU、GPU/显存和模型访问方式。
2. 审阅 SWE-Gym、SWE-bench、OpenHands、TRL 及数据/模型来源的许可证和依赖。
3. 对比 SWE-Gym runner 与 OpenHands 的最小可用路径，选择一个主 runner。
4. 锁定 Python、Docker 镜像、benchmark/harness、TRL、Transformers、PEFT、accelerate 与模型 revision。
5. 用 20 个任务估算镜像下载量、启动率、平均运行时间、失败类型及磁盘峰值。
6. 确定训练环境和预算；若本机无 GPU，规划独立 Linux GPU runner 或延期训练。

### 交付与验收

- docs/swe-agent/environment-audit.md：实际环境与资源结果。
- configs/lock：版本、commit、镜像 digest 和模型 revision。
- 20 个任务 smoke 记录和资源估算。
- 若容器不能稳定启动，暂停训练，先解决环境/成本问题。

## 阶段 1：可重放 runner 与 Base 基线（第 2–3 周）

### 工作项

1. 实现任务字段白名单和上下文构造，只把 issue、仓库和允许字段传给 Agent。
2. 实现带预算 Agent loop，记录动作、观测、工具返回、耗时、token、错误与终止原因。
3. 实现受限代码工具：查看、搜索、读取、编辑、测试、差异检查；命令执行放入一次性容器。
4. 将隐藏测试与 scorer 放在 Agent 权限边界之外，建立每任务工作区和清理逻辑。
5. 完成 20 个 smoke 后修正协议问题；对固定 100 个 dev 任务建立 Base 运行清单。
6. 输出任务级 resolved、infra failure、预算耗尽和错误类别报告。

### 交付与验收

- runner、scorer、episode schema 和容器生命周期文档。
- Base 固定配置、run IDs 和逐任务结果。
- 重放结果关联相同数据 manifest、模型和代码 revision。
- 若 scorer 边界、日志或稳定性不达标，不开始训练。

## 阶段 2：数据与泄漏审计（第 4–5 周）

### 工作项

1. 固定 SWE-Gym 和 SWE-bench 来源版本，生成不可变 manifest 和校验和。
2. 在数据入口按字段白名单剥离 gold patch、test patch 及其他答案字段。
3. 根据 Verified IDs、同 issue/PR、repo/fork、近重复文本和时间信息排除重叠项。
4. 冻结 train、dev、主评测和 repo-held-out 清单，提交排除统计。
5. 从成功和失败运行生成轨迹；目标至少 500 条，并逐步抽样核查。
6. 建立失败 taxonomy、轨迹标注指南和质量审核记录。
7. 按相同任务/上下文构造候选 DPO 对；人工复核偏好依据。

### 交付与验收

- schema、去重/切分脚本、manifest 示例与数据来源清单。
- 原始 benchmark、模型输出和大轨迹位于忽略目录或受控存储。
- 泄漏审计报告说明规则、重复数与残余风险。
- 目标至少 300 组偏好对；不足时记录缺口，不用不可验证样本补齐。

## 阶段 3：SFT 与数据消融（第 6–8 周）

1. 以小批量 LoRA 完成训练、保存、加载和推理闭环。
2. 对齐 Base 与 SFT 的模型、模板、上下文、工具、预算和测试环境。
3. 评估格式正确、补丁可应用、目标测试通过、回归、成本和失败类别。
4. 对比不同训练量；资源允许时比较随机轨迹与失败课程轨迹。
5. 检查训练日志、过拟合和训练/评测相似度。

交付：SFT 配置、训练曲线、adapter revision、重放命令、对 Base 的配对结果、区间和逐任务差异。若只改善工具格式而没改善 resolved rate，按指标如实报告。

## 阶段 4：DPO（第 9–10 周）

1. 审计偏好样本和 chosen/rejected 证据，移除结果不确定或上下文不匹配样本。
2. 训练 SFT+DPO；与 SFT 使用相同基座、Agent prompt 和推理预算。
3. 衡量工具调用、测试迭代、重复动作、有效补丁、resolved rate 与成本。
4. 抽样检查模型是否偏好“看起来正确”而非验证通过的修复。

交付：偏好统计、DPO 配置/adapter、对照评测和成本；每组对比可追溯到数据 manifest 与 checkpoint。

## 阶段 5：GRPO 与奖励消融（第 11–12 周）

仅当任务可重复执行、测试 scorer 独立、奖励不读取 gold patch 且训练资源可用时开始。

1. 定义工具环境 reset、step、终止、超时和 reward 接口。
2. 先以测试结果作为稀疏主奖励，小规模检查不同 seed 波动。
3. 添加有限的有效补丁/预算辅助信号，逐项做消融。
4. 监控测试删除、断言放宽、配置篡改和评测干扰；可疑行为单独判失败并审查。
5. 比较 GRPO 与 SFT/DPO 的 resolved rate、每成功修复成本和训练稳定性。

交付：GRPO 配置、reward 组件、运行记录和投机事件审计。GPU 或吞吐不支持时报告阻塞数据，不伪造实验。

## 阶段 6：冻结评测、分析和报告（第 13–15 周）

1. 冻结代码、模型和推理参数；确认 Verified 未用于训练、调参或 checkpoint 选择。
2. 在相同容器、预算和 scorer 下运行选定方法，保留所有预定任务和失败记录。
3. 输出整体及分层 resolved rate、配对差异、不确定区间、时间、token 和成本。
4. 复审高分/异常案例，检查评测隔离、测试篡改与结果泄漏。
5. 区分数据问题、模型错误、Agent scaffold 错误和 infra failure。
6. 如有收益，再实施 verifier/Best-of-N 扩展并单独计算成本。

交付：实验报告、聚合表、可发布逐任务结果、可复现配置和完整失败分母。+5pp 是研究目标；未达到或区间跨 0 时如实报告。

## 阶段 7：复现与发布（第 16 周）

1. 审核代码、模型、数据和依赖的发布许可。
2. 提供环境准备、数据声明、训练和评测复现说明。
3. 检查敏感信息、权重、缓存和容器工件未进入 Git。
4. 更新 README、状态、changelog 和每轮 Markdown 变更记录。
5. 在 GitHub feature branch 提交 reviewable PR；合并由用户决定。

完成标准：外部开发者能运行 smoke、理解实验边界并复现允许发布的结果；PR 明确列出未完成项，不声称未实测的分数。

## 建议首个可展示版本

先交付可审阅的最小闭环：对隔离的 Python 真实 issue 仓库运行 Base Agent，读文件、搜索、编辑、运行受控测试，并生成逐步轨迹和 scorer 结果。随后在相同设置下加入一个 SFT adapter，再依据偏好数据和 GPU 资源扩展 DPO/GRPO。首个里程碑即可展示业务闭环，也为后训练实验提供稳定底座。

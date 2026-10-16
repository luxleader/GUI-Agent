# GUI Testing Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建面向电商业务的 GUI 回归测试 Agent，并以版本化数据和模型训练实验证明定位、执行、恢复及缺陷检出能力。

**Architecture:** TypeScript 执行器复用 Midscene SDK；Python 管理数据与训练。环境准备和业务 oracle 独立于动作策略，运行证据经稳定格式入库。单步学生模型模式使用独立动作格式适配器，支持与现成 GUI 模型公平比较。

**Tech Stack:** Midscene Android/Web SDK、TypeScript、Vitest、Python 3.11+、pytest、Pydantic、SQLite、JSONL/Parquet、LlamaFactory、vLLM、Android Emulator/ADB、mall-app-web 与 mall 本地环境。

**Spec:** [面向电商业务的 GUI 自动化测试 Agent 设计](../specs/2026-10-16-gui-testing-agent-design.md)。本文是建议实施顺序；尚未创建项目或安装依赖。

## Global Constraints

- 首期通过 Android Chrome 操作本地 H5 商城；原生 GUI 通用能力另用 AndroidWorld 评测。
- 1 名全职开发者、QA 或业务同事每周提供约半天规则与标注审查、12–16 周。
- 每例最多 40 个 GUI 动作、300 秒、2 次恢复尝试；恢复计入预算，失败运行保留。
- PASS 需要所有必需断言成立；自愈不能修改断言、预期金额或跳过必要测试步骤。
- 必需断言 ID 与 GUI 必经步骤在审批时冻结；空断言或缺失必要证据不能 PASS。业务 API 仅用于准备与独立判定。
- 金额用整数分；内部坐标为原始截图 [0,1] 归一化坐标，缩放与裁剪变换可追踪。
- 100 个业务模板按 60/20/20 划分训练、验证与测试，再生成变体。
- 冻结用例、数据、模型 revision、图像处理与运行预算后再进行最终评测。
- 测试用户与订单按 run_id 隔离，设备租约独占；重置失败设备隔离。
- 动作策略不可见 oracle 私有预期结果、故障开关和评分实现。
- UI-S1 作为可选训练实验，使用独立容器，不与主训练环境直接混装依赖。

## Review Focus

- 页面看似成功而后端金额或订单错误：独立业务断言必须判失败，由 Task 3 验证。
- 自愈或重试绕过关键步骤、改写断言：执行器必须拒绝并保留证据，由 Task 4 验证。
- 分辨率、裁剪、状态栏与旋转变化造成误点：原坐标变换必须正确且过期观察不可执行，由 Task 2 验证。
- 相似轨迹与同模板变体泄漏到测试集：按模板分组并校验截图重复，由 Task 5 验证。
- 设备断开、重置失败或模型超时被报告为产品缺陷或静默丢弃：分类、租约和运行分母必须保留，由 Task 2、4、8 验证。

## 计划文件结构

以下是未来项目内部的相对路径，当前只创建本计划与设计文档。

```text
gui-testing-agent/
  contracts/                     # 版本化 case/action/trace/result JSON Schema
  packages/runner/src/
    contracts.ts                 # 从 JSON Schema 生成 TypeScript 类型
    device.ts                    # 设备租约、截图与确定性动作
    midscene.ts                  # SDK 基线与 execution dump 转换
    student.ts                   # 学生模型动作输出与坐标适配
    generator.ts                 # 需求与业务规则转候选用例，保存人工审批
    oracle.ts                    # 独立 UI/API 结果判定
    runner.ts                    # 预算、状态机与恢复限制
    report.ts                    # HTML/JSON/JUnit 与证据索引
    cli.ts                       # run/evaluate 命令
  packages/runner/tests/          # 对应接口与故障路径校验
  services/test-env/
    compose.yaml                 # 本地商城与测试依赖
    fixtures.py                  # 可重置测试数据
    faults.py                    # 测试环境专用故障实例
  cases/{train,val,test}/         # 经确认的业务模板
  ml/guiqa/
    contracts.py                 # 从 JSON Schema 生成 Pydantic 类型
    dataset.py                   # 校验、去重、分组划分
    export.py                    # SFT 与同输入偏好对导出
    evaluate.py                  # 动作、定位与业务统计
    experiments.py               # 数据/模型/参数版本清单
  ml/configs/                    # SFT、DPO、可选 RL 配置
  ml/tests/                      # 数据与实验协议校验
  eval/{splits,mutants}/          # 冻结的划分与故障清单
  docs/                          # 规则、架构、实验与使用方式
  artifacts/                     # 被 Git 忽略的轨迹与报告
```

## Task 1 开源集成与环境验证 第 1–2 周

**Files:** 创建 `docs/dependencies.md`、`services/test-env/compose.yaml`、`packages/runner/src/midscene.ts`、`packages/runner/tests/midscene.test.ts`、`ml/configs/compatibility.yaml`。

**Interfaces:** 消费上游 SDK 和本地商城；输出 `checkCompatibility(): Promise<CompatibilityReport>`，其中报告记录版本、截图尺寸、模型连通性、报告/JSON dump 路径和已确认的动作输出格式。Task 2 的协议确定后替换本阶段临时记录格式。

- [ ] 从 [Midscene Android 示例](https://github.com/web-infra-dev/midscene-example/tree/main/android) 验证截图、点击、中文输入、断言与 HTML 报告；启用 `generateReport`、`persistExecutionDump`，导出可解析 JSON。
- [ ] 固定成功组合的 Git SHA/包版本与模型 revision，补全代码/数据/模型许可来源；Midscene Test Beta 只作旁路试用。
- [ ] 部署本地 mall 与 H5 商城，用合成用户、商品、券和订单；替换生产支付为测试状态回调。
- [ ] 写 `reports_all_required_artifacts`：缺少 JSON dump 或模型 revision 时应判兼容性验证不通过；先观察失败，再补实现并重跑。
- [ ] 对 20 个简单任务比较 Midscene 基线、Qwen3-VL-4B 和 MobiZen 推理；比较端点兼容性、动作解析、实际吞吐与显存。此试验是工程基线，不是最终训练评估。
- [ ] 验收：同一测试可重置并重复运行 3 次，动作与截图可逐步对应，学生单步动作可直接执行；提交环境与版本清单。

**检查命令:** `pnpm --filter runner exec vitest run tests/midscene.test.ts`；`pnpm --filter runner exec tsx src/cli.ts compatibility --device emulator-5554`。预期前者通过，后者输出五项能力与 artifact 路径且无缺项。

## Task 2 用例协议与设备执行 第 2–3 周

**Files:** 创建 `contracts/{case,action,trace,result}.schema.json`、`packages/runner/src/{contracts,device,student}.ts`、`ml/guiqa/contracts.py`、`packages/runner/tests/device.test.ts`。

**Interfaces:** 定义 `TestCase`、`Observation`、`Action`、`TraceStep`、`RunResult`。`DeviceDriver.observe(): Promise<Observation>`；`execute(action: Action, observationId: string): Promise<Observation>`；`lease(deviceId: string, runId: string): Promise<DeviceLease>`。Action 限定 tap、swipe、type、back、home、wait、finish；Observation 包含 id、尺寸、截图引用及变换。生成的跨语言类型不得手工复制修改。

- [ ] 写 `rejects_stale_observation`、`maps_cropped_rotated_coordinates`、`serializes_device_lease`、`quarantines_device_after_reset_failure` 的断言：旋转后旧观察失效、转换点击落在标注框内、同设备不能并行租用、隔离设备不可领取。
- [ ] 用固定截图和模拟设备运行失败用例，再实现 schema、坐标转换与设备适配器。学生输出只由适配器解析，不再次调用规划模型。
- [ ] 动作参数校验在执行前完成，越界坐标或未知动作作为策略无效输出记录，不发送给设备。
- [ ] 采集原始截图和动作前后状态，以 `observationId` 关联；配置改变导致缓存失效。
- [ ] 验收：覆盖 3 个屏幕配置与中文输入，设备断开能释放或隔离租约；提交协议及适配器。

**检查命令:** `pnpm --filter runner exec vitest run tests/device.test.ts`。预期上述四个故障路径全部通过。

## Task 3 业务数据与独立判定 第 3–4 周

**Files:** 创建 `services/test-env/{fixtures,faults}.py`、`packages/runner/src/oracle.ts`、`packages/runner/tests/oracle.test.ts`、`cases/train/checkout.yaml`、`eval/mutants/catalog.json`。

**Interfaces:** `prepareCase(caseId: string, runId: string): Promise<FixtureHandle>`；`evaluateCase(testCase: TestCase, trace: TraceStep[], fixture: FixtureHandle): Promise<OracleResult>`。OracleResult 含逐项 assertionId、expected、observed、evidenceRef、passed。私有预期值与故障开关在 oracle 服务内解析，不能进入 policy 请求。

- [ ] 写 `detects_ui_backend_amount_mismatch`：29900 分商品减 3000 分，UI 为 26900 而订单为 29900 时，相关金额断言必须失败。
- [ ] 写 `does_not_pass_from_success_text_alone`：只有“下单成功”截图而无必需订单状态证据，结果不得 PASS。
- [ ] 写 `rejects_empty_assertions_and_missing_required_ids`：空断言集或未返回冻结的必需 assertionId 时不得 PASS，不能用“已执行断言全部通过”代替完整性检查。
- [ ] 写 `proven_product_defect_can_block_later_assertions` 与 `wrong_sku_click_is_agent_failure`：前置条件与 GUI 动作均满足后，券门槛错误已被证实，即使后续订单断言无法执行也判 PRODUCT_FAIL，后续记 blocked_by_product_defect；误选 SKU 导致任务金额不匹配、但产品按所选 SKU 正确工作时不能判产品缺陷。
- [ ] 写 `isolates_parallel_orders`：不同 run_id 的商品库存/订单不能相互污染；写 `does_not_expose_oracle_to_policy` 检查策略请求不含 fault/expected 标签。
- [ ] 实现测试 fixture、规则校验与证据读取，运行上述失败用例直到通过。
- [ ] 建立至少 10 个初始故障实例：券门槛错误、金额错误、库存未扣减、重复提交等。确认每个故障有可达路径及与正常版本的配对证据。
- [ ] 验收：执行器能分别发现展示错误、状态错误和二者不一致；提交业务规则与故障目录。

**检查命令:** `pnpm --filter runner exec vitest run tests/oracle.test.ts`；`python services/test-env/fixtures.py verify-isolation`。预期相关断言判定正确、隔离检查无冲突。

## Task 4 Agent 控制循环与证据 第 4–6 周

**Files:** 创建 `packages/runner/src/{generator,runner,report,cli}.ts`、`packages/runner/tests/{generator,runner}.test.ts`、`docs/failure-taxonomy.md`。

**Interfaces:** `generateCases(requirement: Requirement, rules: BusinessRule[]): Promise<CaseDraft[]>`；`approveCase(draft: CaseDraft, reviewerId: string): Promise<TestCase>`。Requirement 含 id、revision、text；BusinessRule 含 id、revision、业务适用条件；CaseDraft 含待审 TestCase、规则引用和来源 revision。审批记录绑定内容哈希，修改后重新审批。`Policy.next(observation: Observation, history: TraceStep[], goal: string): Promise<Action>`；`runCase(testCase: TestCase, policy: Policy, driver: DeviceDriver): Promise<RunResult>`。RunResult 包含 resultStatus、assertions、steps、recoveryCount、modelCalls、tokenUsage、latencyMs、evidenceRefs 及版本清单。

- [ ] 写 `preserves_assertions_during_recovery`、`counts_recovery_in_budget`、`classifies_disconnect_as_infra_error`、`keeps_timeout_attempt_in_report`；断言摘要在恢复前后相同，第 41 个动作不可执行，模型失败不伪装成业务通过。
- [ ] 写 `generated_case_links_business_rules`、`unapproved_case_cannot_enter_acceptance_suite`、`case_change_invalidates_approval`：生成用例必须带业务规则来源与必要断言，未审用例不能进入固定验收集，内容变化使审批失效。
- [ ] 写 `backend_shortcut_cannot_replace_gui_step`：仅通过 fixture API 创建订单不能满足用例中“通过 GUI 提交订单”的必经步骤。
- [ ] 实现候选用例生成与审阅 CLI，以冻结的业务规则目录作约束；固定验收用例先经人工核对，生成模型不能同时生成私有评分预期值。
- [ ] 实现状态机：准备 → 观察 → 决策 → 动作 → 判定 → 有限恢复 → 清理。所有退出路径生成结果并计入总运行数。
- [ ] 对页面加载采用有上限的条件等待；截图和 UI 状态未更新时不得复用过期观察执行动作。
- [ ] 接入 Midscene 基线和学生策略；保持相同用例/预算，完整记录其 action-loop 差异与调用成本。
- [ ] 保存逐步截图、事件和 oracle 结果；单次运行结束前刷新报告，清理失败则隔离设备。
- [ ] 验收：20 个核心业务用例可端到端执行，失败可复现且有原因；提交执行与报告流程。

**检查命令:** `pnpm --filter runner exec vitest run tests/generator.test.ts tests/runner.test.ts`；`pnpm --filter runner exec tsx src/cli.ts run --suite eval/splits/smoke.json --policy midscene`。预期用例审批检查通过，所有运行有分类、证据和清理结果。

## Task 5 数据采集与训练集 第 6–8 周

**Files:** 创建 `ml/guiqa/{dataset,export}.py`、`ml/tests/test_dataset.py`、`eval/splits/business-v1.json`、`docs/dataset-card.md`。

**Interfaces:** `validate_episode(episode: Episode) -> ValidationResult`；`build_splits(episodes: list[Episode], manifest: SplitManifest) -> DatasetSplits`；`export_sft(episodes: list[Episode], output_path: str) -> DatasetManifest`；`export_preferences(episodes: list[Episode], output_path: str) -> DatasetManifest`。

- [ ] 写 `test_template_never_crosses_splits`、`test_duplicate_screenshot_across_splits_is_flagged`、`test_failed_action_is_not_sft_positive`、`test_preferences_require_identical_input`。先观察失败再实现规则。
- [ ] 先确认 100 个模板的 60/20/20 划分，随后生成业务参数和设备变体；公共数据沿用官方 split。
- [ ] 审核前 100 条自采轨迹并统计无效图像、动作错配、标签分歧；不合格样本退出正样本池，失败数据保留到独立错误集。
- [ ] 在质量可控后扩展至 1,000–3,000 条业务轨迹目标；从 CMGUI train 抽取与动作空间匹配的样本，记录来源与归属。
- [ ] 导出 SFT 与同输入偏好对，生成 dataset hash、图像清单、坐标协议、过滤计数和数据卡。
- [ ] 验收：所有样本能追溯至 run/source，盲测模板未出现在训练集；提交转换工具和 manifest，不把大图像直接提交 Git。

**检查命令:** `python -m pytest ml/tests/test_dataset.py -q`；`python -m guiqa.dataset audit --manifest eval/splits/business-v1.json`。预期零跨组模板泄漏，所有重复和无效样本均有处置记录。Python 模块从 ml 目录或安装后的环境运行。

## Task 6 SFT 与训练消融 第 8–10 周

**Files:** 创建 `ml/guiqa/{evaluate,experiments}.py`、`ml/configs/{sft-public,sft-business,sft-recovery}.yaml`、`ml/tests/test_experiments.py`、`docs/experiments/sft.md`。

**Interfaces:** `run_experiment(config_path: str, dataset: DatasetManifest) -> ExperimentManifest`；`evaluate_policy(experiment: ExperimentManifest, suite: str) -> MetricReport`。Manifest 包含基座 revision、adapter hash、数据 hash、训练配置、图像处理、随机种子及运行版本；MetricReport 包含样本量、分组与置信区间。

- [ ] 写 `test_manifest_binds_data_model_and_preprocessing` 和 `test_test_split_cannot_select_checkpoint`；未提供 revision 或使用测试集选择 checkpoint 时必须失败。
- [ ] 对 Qwen3-VL-4B 做容量试验，固定截图像素预算、历史长度、batch 与 gradient accumulation；以峰值显存和吞吐确定正式配置。
- [ ] 运行四组实验：未训练学生、仅公开训练数据、加入业务数据、再加入修复数据；用验证集选 checkpoint，保留统一 oracle。
- [ ] 统计动作格式正确率、框内点击率、完整业务通过率、缺陷检出率、token 与延迟。离线定位进步不能直接替代端到端收益。
- [ ] 验收：形成可复现的数据消融表和学生 adapter；收益不明确时按错误类别回到数据筛选，不提前宣称训练有效。

**检查命令:** `python -m pytest ml/tests/test_experiments.py -q`；`llamafactory-cli train ml/configs/sft-business.yaml`。前者验证实验协议，后者产出完整训练日志和 adapter；任务完成依赖验证集与业务评测报告，而非训练命令退出码。

## Task 7 偏好优化与恢复 第 10–12 周

**Files:** 创建 `ml/configs/dpo-recovery.yaml`、`ml/tests/test_preferences.py`、`eval/splits/ui-perturbations-v1.json`、`docs/experiments/recovery.md`。

**Interfaces:** 消费 Task 5 的同输入偏好数据与 Task 6 的 SFT adapter，输出沿用 ExperimentManifest 与 MetricReport。`evaluate_recovery(experiment: ExperimentManifest, suite: str) -> MetricReport`。

- [ ] 写 `test_recovery_does_not_change_business_expectation` 和 `test_chosen_and_rejected_share_observation`：不同输入前缀不得配对，恢复后断言哈希必须相同。
- [ ] 在弹窗、遮挡、位置变化、相似按钮中采集恢复正负样本；对产品故障样本维持原判定。
- [ ] 在评测前固定 ≥30 个无害变化实例，使用已成功的固定参考路径证明其确实中断执行且业务结果未变；每例与相同任务、种子、设备的无变化运行配对，独立重复 3 次。全部预定变化运行计入分母；仅实际中断后恢复且完成必要断言计入恢复成功分子，无需恢复的直接完成另报适应率。
- [ ] 在已确认支持当前 VLM/模板的独立环境中运行多模态 DPO，与 SFT 做同预算比较；不支持时先完成适配验证，不能用文本 DPO 冒充多模态实验。
- [ ] 验收：≥30 个无害 UI 变化实例上报告恢复率，同时报告缺陷检出与误报，检查是否因绕过流程而虚增成功。
- [ ] 可选研究：用独立容器复现 UI-S1 的离线轨迹半在线 RL 对照。真实在线 RL 的环境 step/reset、独立 oracle 奖励和环境吞吐是额外工作，估算增加 2–4 周，不作为首期交付前提。

**检查命令:** `python -m pytest ml/tests/test_preferences.py -q`；`python -m guiqa.evaluate recovery --suite eval/splits/ui-perturbations-v1.json`。预期结果包含断言完整性、恢复率、业务缺陷检出与全部失败运行。

## Task 8 盲测与持续回归 第 12–16 周

**Files:** 创建 `eval/splits/final-v1.json`、`packages/runner/tests/report.test.ts`、`.github/workflows/gui-regression.yml`、`docs/experiments/final-report.md`、`docs/runbook.md`。

**Interfaces:** `aggregateRuns(results: RunResult[]): MetricReport`；`writeJUnit(results: RunResult[], path: string): Promise<void>`。盲测期间冻结模型和数据；最终报告引用全部运行清单。

- [ ] 写 `retains_infra_errors_in_total_runs`、`does_not_count_agent_block_as_bug_detection`、`does_not_turn_one_of_three_detections_into_full_recall`、`exports_junit_failures_and_skips`：总数包含所有状态，单个故障三次仅一次检出计 1/3；JUnit 中 PASS 才记通过，产品缺陷/Agent 阻塞记失败，环境或证据不足显式跳过并由独立有效运行比例门槛约束。
- [ ] 写 `readable_run_requires_decisive_evidence` 与 `later_infra_incident_does_not_erase_proven_defect`：有充分证据的 PASS/PRODUCT_FAIL/AGENT_BLOCKED 计入可判读分子；INFRA_ERROR/INCONCLUSIVE 只留总分母；前置条件满足的已证实产品缺陷不因后续证据被阻断或设备断连而降为证据不足。
- [ ] 冻结 20 个预留模板，按 3 数据种子 ×3 屏幕配置 ×3 次重复评测每个模型，即 540 次/模型；另评 ≥30 个故障实例各 3 次。
- [ ] 比较 Midscene 基线、未训练学生、SFT 学生、偏好优化学生；对原生 AndroidWorld 单列泛化结果与运行配置。
- [ ] 分别报告正确版本任务完成、产品误报、缺陷检出、可判读运行、延迟和成本。缺陷检出必须有前置条件成立的相关失败断言和可复查证据，策略阻塞不算检出。
- [ ] CI 使用带虚拟化能力的固定 runner，PR 跑核心 smoke，夜间跑完整矩阵；设备/数据隔离不通过则任务阻塞并报告，不能静默重试至通过。
- [ ] 验收：设计中的目标逐项给出“达到/未达到/样本不足”，附原始运行 manifest、数据卡、模型卡和复现步骤；提交交付文档。

**检查命令:** `pnpm --filter runner exec vitest run tests/report.test.ts`；`pnpm --filter runner exec tsx src/cli.ts evaluate --manifest eval/splits/final-v1.json`。预期总运行数与矩阵匹配，各状态分母可追溯。

## 资源与首周决策

规划为开发机 32GB+ RAM、硬件虚拟化、模拟器与一台 Android 真机；训练主机优先 Linux，一张 48GB GPU 用于 4B LoRA 容量试验。显存不是保证，必须由实际图像分辨率与序列长度试验决定。首批 100 条轨迹的模型调用、标注时间、存储和训练吞吐用于预算估算。

首周最终确定并记录 SDK 版本、学生基座 revision、训练框架依赖组合、截图处理策略和本地业务载体可用功能。退款与原生商业 App 若新增，需根据其页面/API 可用性单列任务与时间；首期已有业务用例与训练闭环仍可按本计划交付。

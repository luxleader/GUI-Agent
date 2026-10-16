# GUI Agent

面向电商发版回归的 GUI 自动化测试 Agent。项目围绕业务断言、可追溯轨迹和多模态模型训练建设，首期业务目标是 Android 上的商城 H5 回归测试。

当前可运行独立业务判定、预算控制、轨迹记录和模拟演示。设备执行和模型训练结果尚未验收，详细状态见 [开发进度](docs/STATUS.md)。

## 本地运行

需要 Node.js 24.11+。

```bash
npm ci
npm test
npm run check
npm run demo
npm run doctor
```

`demo` 在本地确定性业务夹具上分别验证正常订单和金额故障，生成 JSON 与 HTML 报告到 `artifacts/demo/`。它不控制浏览器或设备，也不调用模型。

`doctor` 只检查 ADB、可选 Midscene 包和模型配置是否存在，不打印密钥；缺少条件时退出码为 2。它不证明设备连接或模型调用成功。真实设备配置可参考 `.env.example`，Midscene 安装与联调将在下一里程碑完成。

- [项目设计](docs/superpowers/specs/2026-10-16-gui-testing-agent-design.md)
- [实施计划](docs/superpowers/plans/2026-10-16-gui-testing-agent.md)
- [每轮改动](docs/changes/)
- [维护与回溯](docs/MAINTENANCE.md)
- [开源基础](docs/DEPENDENCIES.md)

训练工具后续使用独立 Python/Linux 环境。推送与 Pull Request 会触发基础 CI，运行类型检查、测试和模拟演示；真实设备回归需要单独接入设备 runner。


# 开源基础与验证范围

调研日期：2026-10-16。

| 项目 | 计划用途 | 许可与范围 |
| --- | --- | --- |
| [Midscene](https://github.com/web-infra-dev/midscene) | Android/Web 执行与报告 | MIT；具体包版本将在联调时锁定 |
| [MobiZen GUI](https://github.com/alibaba/MobiZen-GUI) | 中文 GUI 模型对照 | README 标注 Apache 2.0；模型与数据分别核对 |
| [CMGUI](https://huggingface.co/datasets/alibabagroup/CMGUI) | 中文定位与动作数据 | 数据卡 CC BY 4.0；沿用训练/测试划分并保留归属 |
| [UI TARS](https://github.com/bytedance/UI-TARS) | 动作解析与模型对照 | 代码 Apache 2.0；不等同于完整测试平台 |
| [AndroidWorld](https://github.com/google-research/android_world) | 原生 Android 独立评测 | Apache 2.0 |
| [LlamaFactory](https://github.com/hiyouga/LlamaFactory) | 多模态 SFT 与偏好优化 | Apache 2.0；独立 Python 环境 |
| [UI S1](https://github.com/X-PLUG/MobileAgent/tree/main/UI-S1) | 可选半在线 RL 对照 | 按具体子目录与依赖核对，不混用旧训练环境 |

上述能力来自公开文档调研。没有设备运行、基线实测或训练日志时，不记录“兼容通过”或性能提升结论。


# 维护与代码回溯

每轮开发在 `docs/changes/YYYY-MM-DD-NNN-topic.md` 留下记录。记录先进入本轮提交；实际提交号通过 Git 历史查询，避免在自身提交中循环引用提交号。

## 提交约定

使用 `feat:`、`fix:`、`docs:`、`test:` 或 `chore:` 前缀，每个提交只包含可独立说明的修改。提交前检查差异，确认没有环境密钥、设备截图、模型权重或其他项目文件。

后续功能在分支开发，经过测试和审查后同步。项目初始化后的每轮记录必须说明实际上传的分支与验证状态；远端上传失败时保留本地提交并记录失败原因。

## 查询历史

```bash
git log --oneline --decorate
git log --follow -- docs/changes/2026-10-16-001-bootstrap.md
git show <commit>
git diff <older-commit>..<newer-commit>
```

## 回滚已发布修改

先确认工作区无未提交修改，再查看目标提交内容。普通提交使用下面的方式创建反向提交，复跑检查后上传；不通过重写远端历史来回滚。

```bash
git revert <commit>
npm test
npm run check
git push
```

回滚前同时写变更记录，说明撤销原因及受影响功能。涉及数据格式时保留 schema_version 并说明迁移与兼容方式。


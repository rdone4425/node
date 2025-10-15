# 免费节点自动更新工具

自动从 `node.txt` 中的多个源提取内容并写入到 `node_content.txt` 文件。

## 📋 功能特性

- ✅ 自动定时更新（每6小时）
- ✅ 支持手动触发更新
- ✅ 自动提交更新到仓库
- ✅ 支持多个配置源
- ✅ 智能识别配置类型（Clash / V2Ray / Base64）
- ✅ Base64 自动解码
- ✅ 所有内容合并到一个文件
- ✅ 包含来源信息和时间戳

## 🚀 使用方法

### 1. Fork 本仓库

点击右上角的 Fork 按钮，将此仓库复制到你的账号下。

### 2. 配置节点源

编辑 `node.txt` 文件，添加你想要订阅的节点源地址，每行一个 URL。

### 3. 启用 GitHub Actions

1. 进入你 Fork 的仓库
2. 点击 `Actions` 标签
3. 点击 `I understand my workflows, go ahead and enable them`

### 4. 手动触发（可选）

1. 在 Actions 页面选择 `自动更新免费节点`
2. 点击 `Run workflow`
3. 等待运行完成

### 5. 获取更新后的内容

更新后的内容会保存在：
- **`node_content.txt`** - 所有源的内容都在这个文件中
  - 包含每个源的 URL
  - 包含下载时间
  - 自动解码 Base64
  - 已提取的节点内容

## 📁 目录结构

```
.
├── .github/
│   └── workflows/
│       └── update-nodes.yml    # GitHub Actions 工作流
├── update_nodes.py             # 更新脚本
├── node.txt                    # 节点源 URL 列表（输入）
├── node_content.txt            # 提取的内容（输出）⭐
├── requirements.txt            # Python 依赖
└── README.md                   # 说明文档
```

## 🔧 自定义设置

### 修改更新频率

编辑 `.github/workflows/update-nodes.yml` 文件中的 cron 表达式：

```yaml
schedule:
  - cron: '0 */6 * * *'  # 每6小时运行一次
```

常用时间设置：
- `0 */6 * * *` - 每6小时
- `0 */12 * * *` - 每12小时
- `0 0 * * *` - 每天午夜
- `0 0,12 * * *` - 每天 0 点和 12 点

### 添加更多节点源

在 `node.txt` 文件中添加更多 URL，每行一个。

## 📊 输出文件说明

`node_content.txt` 文件包含：
- 每个源的完整内容
- 来源 URL 标记
- 下载时间戳
- 内容大小信息
- 自动解码的 Base64 内容

文件格式示例：
```
# 来源 1: https://example.com/config1
# 下载时间: 2025-10-15 12:00:00
# 内容大小: 12345 字节

[实际内容...]

============================================================

# 来源 2: https://example.com/config2
# 下载时间: 2025-10-15 12:00:05
# 内容大小: 23456 字节

[实际内容...]
```

## ⚠️ 注意事项

1. 免费节点可能不稳定，仅供学习测试使用
2. 请遵守当地法律法规
3. 建议定期检查节点可用性
4. GitHub Actions 有使用限制，请合理设置更新频率

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！


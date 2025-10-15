# 免费节点自动更新工具

自动从多个源获取免费的 Clash 和 V2Ray 节点配置。

## 📋 功能特性

- ✅ 自动定时更新（每6小时）
- ✅ 支持手动触发更新
- ✅ 自动提交更新到仓库
- ✅ 支持多个配置源
- ✅ 智能识别配置类型（Clash / V2Ray / Base64）
- ✅ 自动合并多个配置文件
- ✅ Base64 自动解码
- ✅ 节点去重
- ✅ 详细的更新报告

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

### 5. 获取更新后的配置

更新后的配置文件会保存在 `data/` 目录下：
- `data/clash_*.yml` - 单独的 Clash 配置文件
- `data/clash_merged.yml` - 合并后的 Clash 配置（推荐使用）
- `data/v2ray_*.txt` - 单独的 V2Ray 配置文件
- `data/v2ray_merged.txt` - 合并后的 V2Ray 配置（推荐使用）
- `data/update_report.json` - 详细更新报告

## 📁 目录结构

```
.
├── .github/
│   └── workflows/
│       └── update-nodes.yml    # GitHub Actions 工作流
├── data/                       # 存放下载的配置文件
│   ├── clash_*.yml             # Clash 配置
│   ├── clash_merged.yml        # 合并的 Clash 配置
│   ├── v2ray_*.txt             # V2Ray 配置
│   ├── v2ray_merged.txt        # 合并的 V2Ray 配置
│   └── update_report.json      # 更新报告
├── update_nodes.py             # 更新脚本
├── node.txt                    # 节点源列表
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

## 📊 查看更新状态

查看 `data/update_report.json` 文件了解详细的更新信息：
- 最后更新时间
- 总源数量
- 成功/失败统计
- 每个配置的详细信息（类型、大小、文件名）

## 🎯 推荐使用

建议直接使用合并后的配置文件：
- **Clash**: `data/clash_merged.yml` - 包含所有源的节点
- **V2Ray**: `data/v2ray_merged.txt` - 已自动去重的节点列表

## ⚠️ 注意事项

1. 免费节点可能不稳定，仅供学习测试使用
2. 请遵守当地法律法规
3. 建议定期检查节点可用性
4. GitHub Actions 有使用限制，请合理设置更新频率

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！


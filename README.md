# 免费节点自动更新工具

自动从 `node.txt` 中的多个源提取内容并写入到 `node_content.txt` 文件。

## 📋 功能特性

- ✅ 自动定时更新（每6小时）
- ✅ 支持手动触发更新
- ✅ 自动提交更新到仓库
- ✅ 支持多个配置源
- ✅ 智能识别配置类型（Clash / V2Ray / Base64）
- ✅ Base64 自动解码
- ✅ 每个源单独保存
- ✅ 自动生成订阅列表文件（subscription.yaml）
- ✅ 节点自动去重
- ✅ 节点格式验证
- ✅ 下载失败自动重试（最多3次）
- ✅ 命令行参数支持

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

更新后的内容会保存在 `output/` 目录下：
- **Clash 配置文件** ⭐
  - `clash_1.yml`, `clash_2.yml`, `clash_3.yml` 等
  - 保留原始配置的所有内容（端口、DNS、规则、节点等）
  - 每个文件都是完整可用的 Clash 配置
- **V2Ray 等其他节点**
  - `node_1.txt`, `node_2.txt`, `node_3.txt` 等
  - V2Ray、Shadowsocks、Trojan 等协议
  - 纯节点内容，每行一个，自动解码 Base64
  - 自动去重，显示有效节点数量
- **订阅列表文件** 🌟
  - `subscription.yaml`
  - 包含所有输出文件的 GitHub raw URL
  - 可直接用于订阅转换工具

## 📁 目录结构

```
.
├── .github/
│   └── workflows/
│       └── update-nodes.yml    # GitHub Actions 工作流
├── output/                     # 输出目录 ⭐
│   ├── clash_1.yml             # 来源 1 的 Clash 配置
│   ├── clash_2.yml             # 来源 2 的 Clash 配置
│   ├── node_1.txt              # 来源 1 的节点
│   ├── node_2.txt              # 来源 2 的节点
│   └── ...                     # 更多文件
├── update_nodes.py             # 更新脚本
├── node.txt                    # 节点源 URL 列表（输入）
├── subscription.yaml           # 订阅列表文件（自动生成）🌟
├── requirements.txt            # Python 依赖
└── README.md                   # 说明文档
```

## 🔧 本地运行（可选）

### 安装依赖

```bash
pip install -r requirements.txt
```

### 基本使用

```bash
python update_nodes.py
```

### 命令行参数

```bash
# 使用自定义配置文件
python update_nodes.py -s my_nodes.txt

# 指定输出目录
python update_nodes.py -o my_output

# 指定 GitHub 仓库（用于生成订阅链接）
python update_nodes.py -r username/repo

# 不生成订阅列表文件
python update_nodes.py --no-subscription

# 组合使用
python update_nodes.py -s sources.txt -o output -r myuser/myrepo
```

### 参数说明

- `-s, --sources`: 节点源文件路径（默认：node.txt）
- `-o, --output`: 输出目录（默认：output）
- `-r, --repo`: GitHub 仓库，格式为 username/repo
- `--no-subscription`: 不生成订阅列表文件

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

### `output/` ⭐ 输出目录

#### Clash 配置文件
- **文件命名**：`clash_1.yml`, `clash_2.yml`, `clash_3.yml` 等
- **完整配置**：保留所有原始内容（端口、DNS、规则、节点、代理组等）
- **独立使用**：每个文件都可以单独导入 Clash 使用
- **无合并**：保持原始配置不变

**订阅链接示例：**
```
https://raw.githubusercontent.com/你的用户名/你的仓库名/main/output/clash_1.yml
https://raw.githubusercontent.com/你的用户名/你的仓库名/main/output/clash_2.yml
```

#### V2Ray 等其他节点文件
- **文件命名**：`node_1.txt`, `node_2.txt`, `node_3.txt` 等
- **支持协议**：V2Ray (vmess/vless)、Shadowsocks (ss)、Trojan 等
- **纯内容**：每行一个节点，无注释，无元数据
- **自动解码**：Base64 内容自动解码
- **自动去重**：移除重复节点
- **格式验证**：验证节点格式，显示有效节点数量

**订阅链接示例：**
```
https://raw.githubusercontent.com/你的用户名/你的仓库名/main/output/node_1.txt
https://raw.githubusercontent.com/你的用户名/你的仓库名/main/output/node_2.txt
```

### `subscription.yaml` 🌟 订阅列表文件

这是一个**自动生成**的订阅列表文件，包含所有输出文件的 GitHub raw URL。

#### 文件内容示例

```yaml
sub-urls:
  - "https://raw.githubusercontent.com/你的用户名/你的仓库名/main/output/clash_1.yml"
  - "https://raw.githubusercontent.com/你的用户名/你的仓库名/main/output/clash_2.yml"
  - "https://raw.githubusercontent.com/你的用户名/你的仓库名/main/output/node_1.txt"
  - "https://raw.githubusercontent.com/你的用户名/你的仓库名/main/output/node_2.txt"
```

#### 使用方法

1. **订阅转换工具**
   - 将 `subscription.yaml` 的 raw URL 导入订阅转换工具
   - 例如：`https://raw.githubusercontent.com/你的用户名/你的仓库名/main/subscription.yaml`

2. **批量订阅**
   - 可以将此文件中的所有 URL 一次性导入
   - 适合订阅聚合服务

3. **直接使用**
   - 从列表中选择需要的订阅链接
   - 单独导入到 Clash 或其他代理工具

## ⚠️ 注意事项

1. 免费节点可能不稳定，仅供学习测试使用
2. 请遵守当地法律法规
3. 建议定期检查节点可用性
4. GitHub Actions 有使用限制，请合理设置更新频率

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！


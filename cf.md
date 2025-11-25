# Cloudflare IP 优选工具

基于 Shell 脚本的 Cloudflare CDN IP 优选工具，支持自动测速、国家筛选、DNS 自动更新和 Telegram 通知。

## 功能特性

- ✅ **多架构支持**：自动检测系统架构（amd64/386/arm64/arm/mips 等）
- ✅ **智能筛选**：支持按国家代码筛选，可限制每个国家取前 N 个最优 IP
- ✅ **自动更新 DNS**：集成 Cloudflare API，自动更新 DNS 记录
- ✅ **双栈支持**：同时支持 IPv4 和 IPv6 优选
- ✅ **Telegram 通知**：支持 Telegram Bot 推送结果通知
- ✅ **GitHub 镜像**：内置多个 GitHub 镜像源，自动切换
- ✅ **并发控制**：可自定义并发数（1-1000）
- ✅ **交互/自动模式**：支持交互式菜单和命令行参数

## 快速开始

### 1. 下载脚本

```bash
wget https://raw.githubusercontent.com/你的仓库/cf.sh
chmod +x cf.sh
```

### 2. 首次运行

```bash
bash cf.sh
```

首次运行会自动创建配置文件 `cf_config.conf` 和数据目录 `cf_data/`。

### 3. 配置文件

编辑 `cf_config.conf`：

```bash
# CF 优选配置文件
TASK=100                  # 并发数
IPV=1                     # 1=IPv4, 2=IPv6, 3=双栈

# 筛选国家（留空=所有国家）
REGIONS=""                # 如: "HK SG JP" 或 "HK" 或 ""

# 每个国家取前N个（0=不限）
TOP_N=5

# Cloudflare DNS 更新配置（可选）
CF_API_TOKEN=""           # API Token
CF_ZONE_ID=""             # Zone ID
CF_DOMAIN=""              # 域名 (如: example.com)

# Telegram 通知配置（可选）
TG_BOT_TOKEN=""           # Bot Token
TG_CHAT_ID=""             # Chat ID
TG_API_HOST=""            # Worker 代理 (可选)
TG_PROXY=""               # 本地代理 (可选)

# GitHub 镜像源（可选）
# GITHUB_MIRRORS="https://ghgo.xyz/https://raw.githubusercontent.com https://raw.githubusercontent.com"
```

## 使用方法

### 交互模式（默认）

直接运行脚本进入交互式菜单：

```bash
bash cf.sh
```

菜单选项：
1. IPv4 优选
2. IPv6 优选
3. IPv4 + IPv6 双栈优选
4. 配置并发数
5. 配置筛选（国家/数量）
6. 更新 Cloudflare DNS
7. 清理结果文件
0. 退出

### 命令行模式

#### 基本用法

```bash
# IPv4 优选
bash cf.sh -4

# IPv6 优选
bash cf.sh -6

# 双栈优选
bash cf.sh -d

# 按配置文件自动运行
bash cf.sh -a
```

#### 高级用法

```bash
# 香港 IPv4 优选，取前 5 个，并更新 DNS
bash cf.sh -4 -r "HK" -n 5 -u

# 多国家优选（香港、新加坡、日本）
bash cf.sh -4 -r "HK SG JP" -n 10 -u

# 临时修改并发数为 200
bash cf.sh -a -t 200

# 静默模式运行
bash cf.sh -4 -q

# 清理结果文件
bash cf.sh --clean
```

#### 命令行参数

| 参数 | 说明 |
|------|------|
| `-4, --ipv4` | 仅 IPv4 优选 |
| `-6, --ipv6` | 仅 IPv6 优选 |
| `-d, --dual` | IPv4 + IPv6 双栈优选 |
| `-a, --auto` | 按配置文件自动运行 |
| `-t, --task <数量>` | 设置并发数 (1-1000) |
| `-r, --regions <国家>` | 筛选国家 (如: "HK SG JP") |
| `-n, --top <数量>` | 每个国家取前 N 个 (0=不限) |
| `-u, --update-dns` | 优选后自动更新 DNS |
| `-q, --quiet` | 静默模式 |
| `--clean` | 清理结果文件 |
| `-h, --help` | 显示帮助信息 |

## 结果文件

优选结果保存在 `cf_data/results/` 目录：

```
cf_data/
├── results/
│   ├── ipv4/
│   │   ├── country_HK_IPv4.csv
│   │   ├── country_SG_IPv4.csv
│   │   └── ...
│   └── ipv6/
│       ├── country_HK_IPv6.csv
│       └── ...
├── cf                    # 优选程序
├── locations.json        # 数据中心位置
├── ips-v4.txt           # IPv4 地址段
└── ips-v6.txt           # IPv6 地址段
```

### CSV 文件格式

```csv
IP地址,数据中心,地区,城市,网络延迟
104.16.1.2,HKG,Asia,Hong Kong,45
```

## Cloudflare DNS 自动更新

### 1. 获取 API Token

访问 https://dash.cloudflare.com/profile/api-tokens

创建 Token，权限：`Zone - DNS - Edit`

### 2. 获取 Zone ID

在域名管理页面右侧可找到 `Zone ID`

### 3. 配置文件填入

```bash
CF_API_TOKEN="你的 API Token"
CF_ZONE_ID="你的 Zone ID"
CF_DOMAIN="example.com"
```

### 4. DNS 记录命名规则

自动生成的 DNS 记录格式：`{地区代码小写}{IP版本}.{域名}`

示例：
- 香港 IPv4：`hk4.example.com`
- 香港 IPv6：`hk6.example.com`
- 新加坡 IPv4：`sg4.example.com`

### 5. 中文域名支持

脚本支持中文域名（Punycode）：
- 需安装 `idn2` 或 `idn` 工具
- 或直接在配置文件中使用 Punycode 格式

## Telegram 通知

### 方式一：直连（需科学上网）

```bash
TG_BOT_TOKEN="你的 Bot Token"
TG_CHAT_ID="你的 Chat ID"
```

### 方式二：Cloudflare Worker 代理（推荐）

1. 部署 `tg_worker.js` 到 Cloudflare Workers
2. 获取 Worker 域名（如：`tg-proxy.your-name.workers.dev`）
3. 配置：

```bash
TG_BOT_TOKEN="你的 Bot Token"
TG_CHAT_ID="你的 Chat ID"
TG_API_HOST="tg-proxy.your-name.workers.dev"
```

### 方式三：本地代理

```bash
TG_BOT_TOKEN="你的 Bot Token"
TG_CHAT_ID="你的 Chat ID"
TG_PROXY="socks5://127.0.0.1:1080"
```

### 通知内容

DNS 更新成功后会发送通知：
```
Cloudflare DNS 更新成功
域名: hk4.example.com
类型: A
成功: 5/5
时间: 2025-01-25 12:00:00

1. 104.16.1.2 [HKG] - 45ms
2. 104.16.1.3 [HKG] - 48ms
...
```

## 定时任务

使用 crontab 定时运行：

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 3 点运行（香港 IPv4，前 5 个，更新 DNS）
0 3 * * * /root/cf/cf.sh -4 -r "HK" -n 5 -u -q

# 每 6 小时运行一次（按配置文件）
0 */6 * * * /root/cf/cf.sh -a -u -q
```

## 常用国家代码

| 代码 | 国家/地区 | 代码 | 国家/地区 |
|------|----------|------|----------|
| HK | 香港 | SG | 新加坡 |
| JP | 日本 | KR | 韩国 |
| TW | 台湾 | US | 美国 |
| CA | 加拿大 | GB | 英国 |
| DE | 德国 | FR | 法国 |
| NL | 荷兰 | IN | 印度 |
| TH | 泰国 | VN | 越南 |
| AU | 澳大利亚 | | |

## GitHub 镜像源

脚本内置多个镜像源，自动切换：

1. `ghgo.xyz`
2. `gh.api.99988866.xyz`
3. `github.moeyy.xyz`
4. `gh-proxy.com`
5. `ghps.cc`
6. `raw.githubusercontent.com`（直连）

### 自定义镜像源

在 `cf_config.conf` 中取消注释并修改：

```bash
GITHUB_MIRRORS="https://你的镜像1 https://你的镜像2 https://raw.githubusercontent.com"
```

## 锁文件机制

非交互模式下自动启用锁文件防止重复运行：

- 锁文件位置：`/tmp/cf_script.lock`
- 如遇到锁文件错误，可手动删除：`rm -f /tmp/cf_script.lock`

## 故障排查

### 1. 下载失败

```bash
✗ 下载失败
```

**原因**：所有 GitHub 镜像源不可用

**解决**：
- 手动下载文件到 `cf_data/` 目录
- 或在配置文件中指定可用镜像源

### 2. DNS 更新失败

```bash
⚠️  Cloudflare DNS配置不完整
```

**解决**：检查配置文件中的 `CF_API_TOKEN`、`CF_ZONE_ID`、`CF_DOMAIN` 是否正确

### 3. Telegram 通知无响应

**解决**：
- 检查 `TG_BOT_TOKEN` 和 `TG_CHAT_ID` 是否正确
- 如果使用代理，检查 `TG_API_HOST` 或 `TG_PROXY` 配置
- 查看是否被墙，考虑使用 Worker 代理

### 4. 架构不支持

```bash
当前架构为xxx，暂不支持
```

**解决**：手动编译 CloudflareST 程序或联系开发者

## 示例场景

### 场景 1：香港服务器优选

```bash
bash cf.sh -4 -r "HK" -n 5 -u
```

### 场景 2：多地区 CDN

```bash
bash cf.sh -4 -r "HK SG JP US" -n 3 -u
```

每个地区会创建对应的 DNS 记录：
- `hk4.example.com`
- `sg4.example.com`
- `jp4.example.com`
- `us4.example.com`

### 场景 3：定时自动优选

```bash
# crontab -e
0 2 * * * /root/cf/cf.sh -a -u -q
```

每天凌晨 2 点自动运行，并发送 Telegram 通知

## 相关文件

- `cf.sh` - 主脚本
- `cf_config.conf` - 配置文件
- `tg_worker.js` - Telegram API 代理 Worker

## 许可证

本项目基于原项目修改，遵循相同许可证。

## 常见问题

**Q: 为什么优选结果没有我的国家？**
A: 可能该国家没有 Cloudflare CDN 节点，或网络无法访问到该节点。

**Q: TOP_N 设置为 0 和留空有什么区别？**
A: 功能相同，都表示不限制数量。

**Q: 可以同时更新多个域名吗？**
A: 目前只支持单个域名，需要多域名请多次运行脚本。

**Q: DNS 记录会覆盖已有记录吗？**
A: 是的，脚本会先删除同名的所有记录，再添加新记录。

**Q: 如何获取 Telegram Chat ID？**
A: 给你的 Bot 发送消息，然后访问 `https://api.telegram.org/bot<TOKEN>/getUpdates` 查看。

## 更新日志

- **2025-01** - 更新 GitHub 镜像源列表（移除失效的 ghproxy.com）
- 添加 Telegram Worker 代理支持
- 添加本地代理支持
- 完善中文域名支持

## 贡献

欢迎提交 Issue 和 Pull Request！

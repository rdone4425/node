# Sub-Store VMess 优选域名批量生成器

用于 Sub-Store 的脚本操作，自动将节点服务器地址替换为优选域名，批量生成多个优选版本。

## 使用方法

在 Sub-Store 订阅的脚本操作中添加此脚本 URL。

## 支持参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `limit` | 限制每个节点生成的优选节点数量 | 全部 |
| `type` | 只处理指定类型节点（如 vmess） | 所有类型 |
| `tlsPort` | TLS 节点使用的端口 | 保持原端口 |
| `nonTlsPort` | 非 TLS 节点使用的端口 | 保持原端口 |
| `name` | 自定义节点名称格式 | 默认格式 |
| `url` | 自定义优选域名列表 URL | 内置地址 |

## 名称格式占位符

| 占位符 | 说明 |
|--------|------|
| `{name}` | 原节点名称 |
| `{domain}` | 优选域名 |
| `{comment}` | 域名注释 |
| `{port}` | 端口 |
| `{index}` | 序号 |

## 示例

### 基础使用
```
https://你的脚本地址/vmess-optimizer.js#limit=10
```

### 自定义端口
```
https://你的脚本地址/vmess-optimizer.js#tlsPort=443&nonTlsPort=80
```

### 自定义名称
```
https://你的脚本地址/vmess-optimizer.js#name={domain}-{index}
```

### 自定义域名列表
```
https://你的脚本地址/vmess-optimizer.js#url=https://example.com/domains.txt
```

### 完整配置
```
https://你的脚本地址/vmess-optimizer.js#type=vmess&limit=15&tlsPort=443&nonTlsPort=8080&name={name}_{index}
```

## 默认名称格式

```
原名 #序号 - 域名前缀 [注释] :端口
```

示例：`节点A #1 - cdn1 [香港] :443`

## 域名列表格式

每行一个域名，支持 `#` 后添加注释：

```
cdn1.example.com # 香港
cdn2.example.com # 日本
cdn3.example.com
```

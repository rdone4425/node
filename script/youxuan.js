/**
 * Sub-Store 代理优选域名批量生成器 (完善版)
 *
 * 支持协议: VMess, VLess, Trojan, Shadowsocks (SS)
 * 用法：在 Sub-Store 脚本操作中添加此脚本
 *
 * 支持的参数：
 * - limit=N: 限制每个节点生成的优选节点数量（默认全部）
 * - type=协议名: 只处理指定协议节点，如 vmess,vless,trojan,ss（默认处理所有）
 * - tls=N: TLS 节点使用的端口，支持多端口如 443,8443,2053（默认保持原端口）
 * - notls=N: 非 TLS 节点使用的端口，支持多端口如 80,8080,2052（默认保持原端口）
 * - name=格式: 自定义节点名称格式，支持占位符：{name}原名、{domain}域名、{comment}注释、{port}端口、{index}序号、{global}全局序号
 * - url=地址: 自定义优选域名列表URL，支持多个URL用逗号分隔（必需）
 * - debug: 启用详细调试日志
 *
 * 示例：
 * - 基础使用（所有协议）: #limit=10&url=https://xxx.txt
 * - 只处理 VMess: #type=vmess&limit=10&url=https://xxx.txt
 * - 自定义端口: #tls=443&notls=80&url=https://xxx.txt
 * - 自定义名称: #name={domain}-{comment}&url=https://xxx.txt
 * - 完整配置: #type=vless&limit=15&tls=443&notls=8080&url=https://xxx.txt
 */

// 从单个 URL 获取域名列表
async function fetchDomainsFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.text();

    // 解析域名列表
    const domains = data.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            // 移除注释部分（#后面的内容）
            const domain = line.split('#')[0].trim();
            const comment = line.includes('#') ? line.split('#')[1].trim() : '';
            return { domain, comment };
        })
        .filter(item => item.domain);

    return domains;
}

// 从多个 URL 获取并合并域名列表（增强版本）
async function fetchOptimalDomains(customUrl) {
    if (!customUrl) {
        return []; // 如果没有 URL，返回空数组
    }

    // 使用自定义 URL
    const urls = customUrl.split(',').map(u => u.trim()).filter(u => u);

    if (urls.length === 0) {
        return [];
    }

    const allDomains = [];
    const domainMap = new Map(); // 用于去重，key 为 domain，value 为 {domain, comments: []}

    // 从每个 URL 获取域名
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
            console.log(`📥 [${i + 1}/${urls.length}] 正在获取: ${url}`);
            const domains = await fetchDomainsFromUrl(url);
            console.log(`✅ [${i + 1}/${urls.length}] 成功获取 ${domains.length} 个域名`);

            // 合并到总列表，并去重
            domains.forEach(item => {
                if (domainMap.has(item.domain)) {
                    // 域名已存在，合并注释
                    const existing = domainMap.get(item.domain);
                    if (item.comment && !existing.comments.includes(item.comment)) {
                        existing.comments.push(item.comment);
                    }
                } else {
                    // 新域名
                    domainMap.set(item.domain, {
                        domain: item.domain,
                        comments: item.comment ? [item.comment] : []
                    });
                }
            });
        } catch (error) {
            console.error(`❌ [${i + 1}/${urls.length}] ${error.message}`);
            // 继续处理下一个 URL
        }
    }

    // 转换为最终格式
    domainMap.forEach((value, domain) => {
        allDomains.push({
            domain: domain,
            comment: value.comments.join(' | ') // 多个注释用 | 分隔
        });
    });

    if (allDomains.length === 0) {
        console.error('❌ 所有源都获取失败或为空，没有可用的优选域名');
        return []; // 返回空数组而不是抛出错误
    }

    console.log(`🎉 总计获取 ${allDomains.length} 个唯一域名（已去重）`);

    return allDomains;
}

// 检查节点是否使用 TLS（增强版本，支持更多协议）
function isTLSEnabled(proxy, debug = false) {
    const type = proxy.type?.toLowerCase() || '';

    // VMess 检查
    if (type === 'vmess') {
        const result = proxy.tls === 'tls' || proxy.tls === true || proxy.tls === 1;
        if (debug) console.log(`[TLS检查] VMess ${proxy.name}: ${result}`);
        return result;
    }

    // VLess 检查
    if (type === 'vless') {
        const result = proxy.tls === 'tls' || proxy.tls === true || proxy.tls === 1;
        if (debug) console.log(`[TLS检查] VLess ${proxy.name}: ${result}`);
        return result;
    }

    // Trojan 默认使用 TLS（但也检查 tls 字段）
    if (type === 'trojan') {
        const result = proxy.tls !== false && proxy.tls !== 'notls' && proxy.tls !== 0;
        if (debug) console.log(`[TLS检查] Trojan ${proxy.name}: ${result}`);
        return result;
    }

    // Shadowsocks 检查 plugin
    if (type === 'ss' || type === 'shadowsocks') {
        let result = false;
        if (proxy.plugin) {
            // obfs 插件
            if (proxy.plugin.includes('obfs')) {
                result = proxy['plugin-opts']?.mode === 'tls';
            }
            // v2ray-plugin
            else if (proxy.plugin.includes('v2ray-plugin')) {
                result = proxy['plugin-opts']?.tls === true;
            }
            // simple-obfs
            else if (proxy.plugin.includes('simple-obfs')) {
                result = proxy['plugin-opts']?.obfs === 'tls';
            }
        }
        if (debug) console.log(`[TLS检查] SS ${proxy.name}: ${result} (plugin: ${proxy.plugin || 'none'})`);
        return result;
    }

    // HTTP/HTTP2 检查
    if (type === 'http' || type === 'http2') {
        const result = proxy.tls === true || proxy.tls === 'tls';
        if (debug) console.log(`[TLS检查] HTTP(s) ${proxy.name}: ${result}`);
        return result;
    }

    // 通用检查
    const result = proxy.tls === true || proxy.tls === 'tls' || proxy.tls === 1;
    if (debug) console.log(`[TLS检查] ${type} ${proxy.name}: ${result} (通用)`);
    return result;
}

// 替换服务器地址和端口（增强版本，支持更多协议字段）
function replaceServerAddress(proxy, newAddress, comment = '', port = null, nameFormat = null, index = 1, globalIndex = 1) {
    const newProxy = JSON.parse(JSON.stringify(proxy)); // 深拷贝
    const type = proxy.type?.toLowerCase() || '';

    // 替换服务器地址 - 支持多种协议
    if (type === 'vmess' || type === 'vless' || type === 'ss' || type === 'shadowsocks' || type === 'trojan' || type === 'http' || type === 'http2') {
        newProxy.server = newAddress;
    } else if (type === 'socks5' || type === 'socks') {
        newProxy.server = newAddress;
    } else {
        // fallback：尝试替换 server 字段
        if (newProxy.server !== undefined) {
            newProxy.server = newAddress;
        }
        // 某些协议可能使用 host 字段
        if (newProxy.host !== undefined && newProxy.server === undefined) {
            newProxy.host = newAddress;
        }
    }

    // 设置端口 - 确保端口是有效的
    if (port && port > 0 && port <= 65535) {
        newProxy.port = port;
    }

    // 更新节点名称
    if (nameFormat) {
        // 使用自定义格式
        const customName = nameFormat
            .replace(/\{name\}/g, proxy.name || '')
            .replace(/\{domain\}/g, newAddress)
            .replace(/\{comment\}/g, comment || '')
            .replace(/\{port\}/g, newProxy.port || '')
            .replace(/\{index\}/g, index)
            .replace(/\{global\}/g, globalIndex);
        newProxy.name = `${customName} #${globalIndex}`;
    } else {
        // 默认格式：添加全局序号确保唯一性
        newProxy.name = `${proxy.name || '代理'} #${globalIndex}`;
    }

    return newProxy;
}

// 去重并为重复的节点添加序号（增强版本）
function deduplicateProxies(proxies) {
    const nameCount = new Map();
    const result = [];

    // 第一遍：统计名称出现次数
    proxies.forEach(proxy => {
        const name = proxy.name;
        nameCount.set(name, (nameCount.get(name) || 0) + 1);
    });

    // 第二遍：对重复的节点添加序号
    const nameCounter = new Map();
    proxies.forEach(proxy => {
        const count = nameCount.get(proxy.name) || 0;
        if (count > 1) {
            // 存在重复，需要添加序号
            const index = (nameCounter.get(proxy.name) || 0) + 1;
            nameCounter.set(proxy.name, index);
            // 如果已经有 # 标记，先移除
            const baseName = proxy.name.replace(/ #\d+$/, '');
            proxy.name = `${baseName} #${index}`;
        }
        result.push(proxy);
    });

    return result;
}

// 主处理函数（增强版本）
async function operator(proxies = []) {
    const $ = new Env('代理优选生成器');

    // 获取参数
    const args = $arguments || {};
    $.log('📝 接收到的参数:', JSON.stringify(args));

    const limit = args.limit ? parseInt(args.limit) : 0; // 0 表示不限制
    const filterTypes = args.type ? args.type.toLowerCase().split(',').map(t => t.trim()) : []; // 空表示处理所有类型
    const tlsPorts = args.tls ? args.tls.split(',').map(p => parseInt(p.trim())).filter(p => p > 0 && p <= 65535) : [];
    const nonTlsPorts = args.notls ? args.notls.split(',').map(p => parseInt(p.trim())).filter(p => p > 0 && p <= 65535) : [];
    const nameFormat = args.name || null; // 自定义名称格式
    const customUrl = args.url || null; // 自定义域名列表URL（支持多个）
    const debug = args.debug === '1' || args.debug === 'true'; // 调试模式

    try {
        $.log('🚀 开始处理节点...');
        $.log(`📊 原始节点数: ${proxies.length}`);

        // 统计协议分布
        const typeStats = {};
        proxies.forEach(proxy => {
            const type = proxy.type?.toLowerCase() || 'unknown';
            typeStats[type] = (typeStats[type] || 0) + 1;
        });
        $.log('📋 协议分布:', JSON.stringify(typeStats));

        // 显示过滤信息
        if (filterTypes.length > 0) {
            $.log(`🔍 过滤协议: ${filterTypes.join(', ')}`);
        }

        // 显示端口配置
        if (tlsPorts.length > 0 || nonTlsPorts.length > 0) {
            $.log('🔧 端口配置:');
            if (tlsPorts.length > 0) $.log(`   TLS 端口: ${tlsPorts.join(', ')}`);
            if (nonTlsPorts.length > 0) $.log(`   非 TLS 端口: ${nonTlsPorts.join(', ')}`);
        }

        // 如果没有节点，直接返回
        if (proxies.length === 0) {
            $.log('⚠️ 没有节点需要处理');
            return proxies;
        }

        // 获取优选域名列表
        $.log('🌐 正在获取优选域名列表...');
        const optimalDomains = await fetchOptimalDomains(customUrl);

        if (optimalDomains.length === 0) {
            $.log('⚠️ 未提供优选域名URL或获取失败');

            // 如果有 name 参数，只修改节点名称
            if (nameFormat) {
                $.log('📝 只修改节点名称模式');
                let globalIndex = 1;
                const newProxies = proxies.map(proxy => {
                    const newProxy = JSON.parse(JSON.stringify(proxy));

                    // 类型过滤
                    if (filterTypes.length > 0 && !filterTypes.includes(proxy.type?.toLowerCase() || '')) {
                        return newProxy;
                    }

                    // 检查是否包含占位符
                    const hasPlaceholder = /\{(name|domain|comment|port|index|global)\}/.test(nameFormat);

                    if (hasPlaceholder) {
                        newProxy.name = nameFormat
                            .replace(/\{name\}/g, proxy.name || '')
                            .replace(/\{domain\}/g, proxy.server || '')
                            .replace(/\{comment\}/g, '')
                            .replace(/\{port\}/g, proxy.port || '')
                            .replace(/\{index\}/g, globalIndex)
                            .replace(/\{global\}/g, globalIndex);
                    } else {
                        newProxy.name = `${nameFormat} #${globalIndex}`;
                    }
                    globalIndex++;
                    return newProxy;
                });
                $.log(`✅ 处理完成！修改了 ${newProxies.length} 个节点名称`);

                // 去重并为重复的节点添加序号
                const finalProxies = deduplicateProxies(newProxies);
                return finalProxies;
            } else {
                $.log('⚠️ 没有优选域名也没有名称格式，返回原始节点');
                return proxies;
            }
        }

        $.log(`✅ 成功获取 ${optimalDomains.length} 个优选域名`);

        // 应用限制
        const domainsToUse = limit > 0 ? optimalDomains.slice(0, limit) : optimalDomains;
        $.log(`🔄 将为每个节点生成 ${domainsToUse.length} 个优选版本`);

        // 显示前 5 个域名
        $.log('📋 前5个优选域名:', domainsToUse.slice(0, 5).map(d => d.domain).join(', '));

        // 生成新节点
        const newProxies = [];
        let processedCount = 0;
        let skippedCount = 0;
        const typeStats2 = {};
        let tlsCount = 0;
        let nonTlsCount = 0;
        let globalIndex = 1; // 全局索引，确保所有节点名称唯一

        proxies.forEach((proxy) => {
            const proxyType = proxy.type?.toLowerCase() || 'unknown';

            // 类型过滤
            if (filterTypes.length > 0 && !filterTypes.includes(proxyType)) {
                newProxies.push(proxy); // 保留不匹配的节点
                skippedCount++;
                return;
            }

            // 统计协议
            typeStats2[proxyType] = (typeStats2[proxyType] || 0) + 1;

            // 统计 TLS 状态
            const useTLS = isTLSEnabled(proxy, debug);
            if (useTLS) {
                tlsCount++;
            } else {
                nonTlsCount++;
            }

            // 获取当前节点应使用的端口列表
            const ports = useTLS ? tlsPorts : nonTlsPorts;

            // 为每个原始节点生成多个优选版本
            let nodeIndex = 1;
            domainsToUse.forEach((item) => {
                if (ports.length > 0) {
                    // 有指定端口，为每个端口生成节点
                    ports.forEach((port) => {
                        const newProxy = replaceServerAddress(proxy, item.domain, item.comment, port, nameFormat, nodeIndex, globalIndex++);
                        newProxies.push(newProxy);
                    });
                } else {
                    // 没有指定端口，保持原端口
                    const newProxy = replaceServerAddress(proxy, item.domain, item.comment, null, nameFormat, nodeIndex, globalIndex++);
                    newProxies.push(newProxy);
                }
                nodeIndex++;
            });

            processedCount++;
        });

        $.log(`✅ 处理完成！`);
        $.log(`📈 已处理节点数: ${processedCount}`);
        $.log(`   └─ TLS 节点: ${tlsCount}`);
        $.log(`   └─ 非 TLS 节点: ${nonTlsCount}`);
        $.log(`⏭️  跳过节点数: ${skippedCount} (类型过滤)`);
        $.log(`📊 已处理协议分布: ${JSON.stringify(typeStats2)}`);
        $.log(`📊 生成节点数: ${newProxies.length}`);
        if (processedCount > 0) {
            $.log(`🎯 平均每个节点生成: ${Math.round(newProxies.length / processedCount)} 个版本`);
        }

        // 去重并为重复的节点添加序号
        const finalProxies = deduplicateProxies(newProxies);
        $.log(`🔄 去重后节点数: ${finalProxies.length}`);

        if (debug) {
            $.log('🐛 调试信息 - 前3个节点:');
            finalProxies.slice(0, 3).forEach((p, i) => {
                $.log(`   [${i}] ${p.name} (${p.type}) - ${p.server}:${p.port}`);
            });
        }

        return finalProxies;

    } catch (error) {
        $.error('❌ 错误: ' + error.message);
        $.error('📍 错误位置: ' + (error.stack || '未知'));
        $.error('⚠️ 返回原始节点列表');
        return proxies; // 出错时返回原始节点
    }
}

// Sub-Store 环境类
function Env(name) {
    return {
        name,
        log: (...args) => console.log(`[${name}]`, ...args),
        error: (...args) => console.error(`[${name}]`, ...args)
    };
}

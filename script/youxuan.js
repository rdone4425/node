/**
 * Sub-Store VMess 优选域名批量生成器
 *
 * 用法：在 Sub-Store 脚本操作中添加此脚本
 * 支持的参数：
 * - limit=N: 限制每个节点生成的优选节点数量（默认全部）
 * - type=vmess: 只处理 vmess 类型节点（默认处理所有）
 * - tls=N: TLS 节点使用的端口，支持多端口如 443,8443,2053（默认保持原端口）
 * - notls=N: 非 TLS 节点使用的端口，支持多端口如 80,8080,2052（默认保持原端口）
 * - name=格式: 自定义节点名称格式，支持占位符：{name}原名、{domain}域名、{comment}注释、{port}端口、{index}序号、{global}全局序号
 * - url=地址: 自定义优选域名列表URL，支持多个URL用逗号分隔（可选）
 * - vless-encryption=处理方式: 如何处理不兼容的 VLESS 加密（remove|filter|keep，默认 remove）
 *   - remove: 移除 encryption 字段（推荐，Loon 可用）
 *   - filter: 完全过滤掉这些节点
 *   - keep: 保留原样（会导致 Sub-Store 报错）
 *
 * 示例：
 * - 基础使用: https://你的脚本地址/vmess-optimizer.js#limit=10
 * - 自定义端口: https://你的脚本地址/vmess-optimizer.js#tls=443&notls=80
 * - 自定义名称: https://你的脚本地址/vmess-optimizer.js#name={domain}-{comment}
 * - 移除不兼容VLESS加密: https://你的脚本地址/vmess-optimizer.js#vless-encryption=remove
 * - 过滤掉不兼容VLESS节点: https://你的脚本地址/vmess-optimizer.js#vless-encryption=filter
 * - 完整配置: https://你的脚本地址/vmess-optimizer.js#type=vmess&limit=15&tls=443&notls=8080&vless-encryption=remove
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

// 从多个 URL 获取并合并域名列表
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
        throw new Error('所有源都获取失败，没有可用的优选域名');
    }

    console.log(`🎉 总计获取 ${allDomains.length} 个唯一域名（已去重）`);

    return allDomains;
}

// 检查节点是否使用 TLS
function isTLSEnabled(proxy) {
    // VMess/VLess 检查
    if (proxy.type === 'vmess' || proxy.type === 'vless') {
        return proxy.tls === 'tls' || proxy.tls === true || proxy.tls === 1;
    }

    // Trojan 默认使用 TLS
    if (proxy.type === 'trojan') {
        return true;
    }

    // Shadowsocks 检查 plugin
    if (proxy.type === 'ss') {
        return proxy.plugin && (
            proxy.plugin.includes('obfs') && proxy['plugin-opts']?.mode === 'tls' ||
            proxy.plugin.includes('v2ray-plugin') && proxy['plugin-opts']?.tls === true
        );
    }

    // 其他类型检查 tls 字段
    return proxy.tls === true || proxy.tls === 'tls';
}

// 检查 VLESS 节点是否有不兼容的配置
function hasIncompatibleVlessConfig(proxy) {
    if (proxy.type !== 'vless') {
        return false;
    }

    // 检查超长的 encryption 字段
    if (proxy.encryption &&
        (proxy.encryption.includes('mlkem') ||
         proxy.encryption.includes('plus') ||
         proxy.encryption.length > 100)) {
        return true;
    }

    // 检查 XTLS flow 配置
    if (proxy.flow && (proxy.flow.includes('xtls') || proxy.flow.includes('rprx'))) {
        return true;
    }

    // 检查其他可能不兼容的配置
    if (proxy.reality) {
        return true;
    }

    return false;
}

// 清理 VLESS 节点的不兼容字段
function cleanVlessProxy(proxy) {
    if (proxy.type !== 'vless') {
        return proxy;
    }

    const cleaned = JSON.parse(JSON.stringify(proxy));
    let modified = false;

    // 移除不兼容的 encryption 字段
    if (cleaned.encryption &&
        (cleaned.encryption.includes('mlkem') ||
         cleaned.encryption.includes('plus') ||
         cleaned.encryption.length > 100)) {
        delete cleaned.encryption;
        modified = true;
    }

    // 移除 XTLS flow 配置
    if (cleaned.flow && (cleaned.flow.includes('xtls') || cleaned.flow.includes('rprx'))) {
        delete cleaned.flow;
        modified = true;
    }

    // 移除 reality 配置
    if (cleaned.reality) {
        delete cleaned.reality;
        modified = true;
    }

    return modified ? cleaned : proxy;
}

// 处理不兼容的 VLESS 配置
function handleIncompatibleVlessEncryption(proxy, mode) {
    // 检查是否有不兼容配置
    if (!hasIncompatibleVlessConfig(proxy)) {
        return proxy; // 没有不兼容配置，返回原样
    }

    if (mode === 'remove') {
        // remove 模式：清理不兼容字段
        return cleanVlessProxy(proxy);
    } else if (mode === 'filter') {
        // filter 模式：返回 null（被过滤掉）
        return null;
    }
    // keep 模式：保留原样
    return proxy;
}

// 替换服务器地址和端口
function replaceServerAddress(proxy, newAddress, comment = '', port = null, nameFormat = null, index = 1, globalIndex = 1) {
    const newProxy = JSON.parse(JSON.stringify(proxy)); // 深拷贝

    // ⭐ 新增：清理不兼容的 VLESS 字段
    if (newProxy.type === 'vless') {
        // 移除超长 encryption
        if (newProxy.encryption &&
            (newProxy.encryption.includes('mlkem') ||
             newProxy.encryption.includes('plus') ||
             newProxy.encryption.length > 100)) {
            delete newProxy.encryption;
        }
        // 移除 XTLS flow
        if (newProxy.flow && (newProxy.flow.includes('xtls') || newProxy.flow.includes('rprx'))) {
            delete newProxy.flow;
        }
        // 移除 reality
        if (newProxy.reality) {
            delete newProxy.reality;
        }
    }

    // 处理不同类型的节点 - 替换服务器地址
    if (proxy.type === 'vmess' || proxy.type === 'vless') {
        newProxy.server = newAddress;
    } else if (proxy.type === 'ss' || proxy.type === 'trojan') {
        newProxy.server = newAddress;
    } else {
        // 其他类型也尝试替换 server 字段
        if (newProxy.server) {
            newProxy.server = newAddress;
        }
    }

    // 设置端口
    if (port) {
        newProxy.port = port;
    }

    // 更新节点名称 - 确保唯一性
    if (nameFormat) {
        // 使用自定义格式，然后在最后加上序号
        const customName = nameFormat
            .replace(/\{name\}/g, proxy.name)
            .replace(/\{domain\}/g, newAddress)
            .replace(/\{comment\}/g, comment || '')
            .replace(/\{port\}/g, newProxy.port)
            .replace(/\{index\}/g, index);
        // 在自定义名称后面加上全局序号
        newProxy.name = `${customName} #${globalIndex}`;
    } else {
        // 默认格式：只保留原名，不添加域名和端口后缀
        newProxy.name = proxy.name;
    }

    return newProxy;
}

// 去重并为重复的节点添加序号
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
        if (nameCount.get(proxy.name) > 1) {
            // 存在重复，需要添加序号
            const index = (nameCounter.get(proxy.name) || 0) + 1;
            nameCounter.set(proxy.name, index);
            proxy.name = `${proxy.name} #${index}`;
        }
        result.push(proxy);
    });

    return result;
}

// 主处理函数
async function operator(proxies = []) {
    const $ = new Env('VMess 优选生成器');

    // 获取参数
    const args = $arguments || {};
    $.log('📝 接收到的参数:', JSON.stringify(args));

    const limit = args.limit ? parseInt(args.limit) : 0; // 0 表示不限制
    const filterType = args.type || ''; // 空表示处理所有类型
    const tlsPorts = args.tls ? args.tls.split(',').map(p => parseInt(p.trim())) : [];
    const nonTlsPorts = args.notls ? args.notls.split(',').map(p => parseInt(p.trim())) : [];
    const nameFormat = args.name || null; // 自定义名称格式
    const customUrl = args.url || null; // 自定义域名列表URL（支持多个）
    const vlessEncryptionMode = args['vless-encryption'] || 'remove'; // 处理不兼容 VLESS 加密的方式（remove|filter|keep）

    try {
        $.log('🚀 开始处理节点...');
        $.log(`📊 原始节点数: ${proxies.length}`);

        // 统计有不兼容配置的节点
        let incompatibleCount = 0;
        let filteredCount = 0;
        proxies.forEach(proxy => {
            if (hasIncompatibleVlessConfig(proxy)) {
                incompatibleCount++;
            }
        });
        if (incompatibleCount > 0) {
            const modeText = {
                'remove': '清理不兼容字段',
                'filter': '完全过滤掉',
                'keep': '保留原样（会报错）'
            };
            $.log(`ℹ️ 检测到 ${incompatibleCount} 个 VLESS 节点含有不兼容配置`);
            $.log(`   处理方式: ${modeText[vlessEncryptionMode] || '未知'}`);
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
                const newProxies = [];
                proxies.forEach(proxy => {
                    // 处理不兼容的 VLESS 加密
                    const processed = handleIncompatibleVlessEncryption(proxy, vlessEncryptionMode);
                    if (processed === null) {
                        // 被过滤掉
                        return;
                    }

                    const newProxy = JSON.parse(JSON.stringify(processed));

                    // 检查是否包含占位符
                    const hasPlaceholder = /\{(name|domain|comment|port|index|global)\}/.test(nameFormat);

                    if (hasPlaceholder) {
                        newProxy.name = nameFormat
                            .replace(/\{name\}/g, proxy.name)
                            .replace(/\{domain\}/g, proxy.server || '')
                            .replace(/\{comment\}/g, '')
                            .replace(/\{port\}/g, proxy.port || '')
                            .replace(/\{index\}/g, globalIndex)
                            .replace(/\{global\}/g, globalIndex);
                    } else {
                        newProxy.name = `${nameFormat} #${globalIndex}`;
                    }
                    globalIndex++;
                    newProxies.push(newProxy);
                });
                $.log(`✅ 处理完成！修改了 ${newProxies.length} 个节点名称`);

                // 去重并为重复的节点添加序号
                const finalProxies = deduplicateProxies(newProxies);
                return finalProxies;
            } else {
                $.log('⚠️ 没有优选域名也没有名称格式，处理不兼容的加密');
                const newProxies = [];
                proxies.forEach(proxy => {
                    const processed = handleIncompatibleVlessEncryption(proxy, vlessEncryptionMode);
                    if (processed !== null) {
                        newProxies.push(processed);
                    }
                });
                return newProxies;
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
        let tlsCount = 0;
        let nonTlsCount = 0;
        let globalIndex = 1; // 全局索引，确保所有节点名称唯一

        proxies.forEach((proxy) => {
            // 处理不兼容的 VLESS 加密
            const processed = handleIncompatibleVlessEncryption(proxy, vlessEncryptionMode);
            if (processed === null) {
                // 被过滤掉
                skippedCount++;
                return;
            }

            // 类型过滤
            if (filterType && processed.type !== filterType) {
                newProxies.push(processed); // 保留不匹配的节点
                return;
            }

            // 统计 TLS 状态
            const useTLS = isTLSEnabled(processed);
            if (useTLS) tlsCount++;
            else nonTlsCount++;

            // 获取当前节点应使用的端口列表
            const ports = useTLS ? tlsPorts : nonTlsPorts;

            // 为每个原始节点生成多个优选版本
            let nodeIndex = 1;
            domainsToUse.forEach((item) => {
                if (ports.length > 0) {
                    // 有指定端口，为每个端口生成节点
                    ports.forEach((port) => {
                        const newProxy = replaceServerAddress(processed, item.domain, item.comment, port, nameFormat, nodeIndex, globalIndex++);
                        newProxies.push(newProxy);
                    });
                } else {
                    // 没有指定端口，保持原端口
                    const newProxy = replaceServerAddress(processed, item.domain, item.comment, null, nameFormat, nodeIndex, globalIndex++);
                    newProxies.push(newProxy);
                }
                nodeIndex++;
            });

            processedCount++;
        });

        $.log(`✅ 处理完成！`);
        $.log(`📈 处理节点数: ${processedCount}`);
        if (skippedCount > 0) {
            $.log(`⏭️ 跳过节点数: ${skippedCount}`);
        }
        $.log(`   └─ TLS 节点: ${tlsCount}`);
        $.log(`   └─ 非 TLS 节点: ${nonTlsCount}`);
        $.log(`📊 生成节点数: ${newProxies.length}`);
        $.log(`🎯 平均每个节点生成: ${Math.round(newProxies.length / processedCount)} 个版本`);

        // 去重并为重复的节点添加序号
        const finalProxies = deduplicateProxies(newProxies);
        $.log(`🔄 去重后节点数: ${finalProxies.length}`);

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

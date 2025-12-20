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
 * - url=地址: 自定义优选域名列表URL，支持多个URL用逗号分隔（默认使用内置地址）
 *
 * 示例：
 * - 基础使用: https://你的脚本地址/vmess-optimizer.js#limit=10
 * - 自定义端口: https://你的脚本地址/vmess-optimizer.js#tls=443&notls=80
 * - 自定义名称: https://你的脚本地址/vmess-optimizer.js#name={domain}-{comment}
 * - 多个URL源: https://你的脚本地址/vmess-optimizer.js#url=https://url1.txt,https://url2.txt
 * - 完整配置: https://你的脚本地址/vmess-optimizer.js#type=vmess&limit=15&tls=443&notls=8080
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
    // 默认优选域名列表（更新为可用的源）
    const defaultUrls = [
        'https://raw.githubusercontent.com/XIU2/CloudflareSpeedTest/master/ip.txt',
        'https://cdn.jsdelivr.net/gh/XIU2/CloudflareSpeedTest@master/ip.txt',
        'https://raw.githubusercontent.com/badafans/better-cloudflare-ip/master/cloudflare.txt'
    ];

    // 使用自定义 URL 或默认 URL
    const urls = customUrl ? customUrl.split(',').map(u => u.trim()) : defaultUrls;

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

    // 替换服务器地址和端口
    function replaceServerAddress(proxy, newAddress, comment = '', port = null, nameFormat = null, index = 1, globalIndex = 1) {
        const newProxy = JSON.parse(JSON.stringify(proxy)); // 深拷贝

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
            // 默认格式：原名 - 域名[注释]:端口 #序号
            const domainShort = newAddress.split('.')[0];
            const commentSuffix = comment ? `[${comment}]` : '';
            const portSuffix = port ? `:${port}` : '';
            newProxy.name = `${proxy.name} - ${domainShort}${commentSuffix}${portSuffix} #${globalIndex}`;
        }

        return newProxy;
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

        try {
            $.log('🚀 开始处理节点...');
            $.log(`📊 原始节点数: ${proxies.length}`);

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
            $.log(`✅ 成功获取 ${optimalDomains.length} 个优选域名`);

            // 应用限制
            const domainsToUse = limit > 0 ? optimalDomains.slice(0, limit) : optimalDomains;
            $.log(`🔄 将为每个节点生成 ${domainsToUse.length} 个优选版本`);

            // 显示前 5 个域名
            $.log('📋 前5个优选域名:', domainsToUse.slice(0, 5).map(d => d.domain).join(', '));

            // 生成新节点
            const newProxies = [];
            let processedCount = 0;
            let tlsCount = 0;
            let nonTlsCount = 0;
            let globalIndex = 1; // 全局索引，确保所有节点名称唯一

            proxies.forEach((proxy) => {
                // 类型过滤
                if (filterType && proxy.type !== filterType) {
                    newProxies.push(proxy); // 保留不匹配的节点
                    return;
                }

                // 统计 TLS 状态
                const useTLS = isTLSEnabled(proxy);
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
            $.log(`📈 处理节点数: ${processedCount}`);
            $.log(`   └─ TLS 节点: ${tlsCount}`);
            $.log(`   └─ 非 TLS 节点: ${nonTlsCount}`);
            $.log(`📊 生成节点数: ${newProxies.length}`);
            $.log(`🎯 平均每个节点生成: ${Math.round(newProxies.length / processedCount)} 个版本`);

            return newProxies;

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

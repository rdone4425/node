// Stash 配置生成器 (兼容版本)
// 注意: Stash 不支持 include-all, filter, lazy 等 Mihomo 特有字段

// 国内DNS服务器
const domesticNameservers = [
    "https://223.5.5.5/dns-query", // 阿里DoH
    "https://doh.pub/dns-query" // 腾讯DoH
];

// 国外DNS服务器
const foreignNameservers = [
    "https://1.1.1.1/dns-query", // CloudflareDNS
    "https://8.8.4.4/dns-query" // GoogleDNS
];

// DNS配置 (Stash 兼容 - 防止DNS泄露)
const dnsConfig = {
    "enable": true,
    "ipv6": false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": [
        "+.lan",
        "+.local",
        "localhost.ptlogin2.qq.com",
        "localhost.sec.qq.com"
    ],
    "default-nameserver": ["223.5.5.5", "119.29.29.29"], // 用于解析 DoH 服务器
    "nameserver": [...domesticNameservers], // 默认使用国内 DNS
    "proxy-server-nameserver": [...domesticNameservers], // 代理服务器使用国内 DNS 解析
    "fallback": [...foreignNameservers], // 备用国外 DNS (通过代理)
    "fallback-filter": {
        "geoip": true,
        "geoip-code": "CN",
        "ipcidr": ["240.0.0.0/4"],
        "domain": [
            "+.google.com",
            "+.facebook.com",
            "+.youtube.com",
            "+.twitter.com",
            "+.github.com"
        ]
    }
};

// 规则集通用配置
const ruleProviderCommon = {
    "type": "http",
    "interval": 86400
};

// 规则集配置
const ruleBase = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash";
const ruleProviders = {
    "Advertising": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Advertising/Advertising.yaml`,
        "path": "./ruleset/Advertising.yaml"
    },
    "Hijacking": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Hijacking/Hijacking.yaml`,
        "path": "./ruleset/Hijacking.yaml"
    },
    "Privacy": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Privacy/Privacy.yaml`,
        "path": "./ruleset/Privacy.yaml"
    },
    "private": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Lan/Lan.yaml`,
        "path": "./ruleset/private.yaml"
    },
    "icloud": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/iCloud/iCloud.yaml`,
        "path": "./ruleset/icloud.yaml"
    },
    "apple": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Apple/Apple.yaml`,
        "path": "./ruleset/apple.yaml"
    },
    "google": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Google/Google.yaml`,
        "path": "./ruleset/google.yaml"
    },
    "Microsoft": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Microsoft/Microsoft.yaml`,
        "path": "./ruleset/Microsoft.yaml"
    },
    "YouTube": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/YouTube/YouTube.yaml`,
        "path": "./ruleset/YouTube.yaml"
    },
    "Netflix": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Netflix/Netflix.yaml`,
        "path": "./ruleset/Netflix.yaml"
    },
    "Spotify": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Spotify/Spotify.yaml`,
        "path": "./ruleset/Spotify.yaml"
    },
    "Bilibili": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/BiliBili/BiliBili.yaml`,
        "path": "./ruleset/Bilibili.yaml"
    },
    "Bahamut": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Bahamut/Bahamut.yaml`,
        "path": "./ruleset/Bahamut.yaml"
    },
    "OpenAI": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/OpenAI/OpenAI.yaml`,
        "path": "./ruleset/OpenAI.yaml"
    },
    "Claude": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Claude/Claude.yaml`,
        "path": "./ruleset/Claude.yaml"
    },
    "Gemini": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Gemini/Gemini.yaml`,
        "path": "./ruleset/Gemini.yaml"
    },
    "Copilot": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Copilot/Copilot.yaml`,
        "path": "./ruleset/Copilot.yaml"
    },
    "TikTok": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/TikTok/TikTok.yaml`,
        "path": "./ruleset/TikTok.yaml"
    },
    "GitHub": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/GitHub/GitHub.yaml`,
        "path": "./ruleset/GitHub.yaml"
    },
    "Telegram": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Telegram/Telegram.yaml`,
        "path": "./ruleset/Telegram.yaml"
    },
    "Twitter": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Twitter/Twitter.yaml`,
        "path": "./ruleset/Twitter.yaml"
    },
    "Game": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Game/Game.yaml`,
        "path": "./ruleset/Game.yaml"
    },
    "ChinaMax": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/ChinaMax/ChinaMax.yaml`,
        "path": "./ruleset/ChinaMax.yaml"
    },
    "Global": {
        ...ruleProviderCommon,
        "behavior": "classical",
        "url": `${ruleBase}/Global/Global.yaml`,
        "path": "./ruleset/Global.yaml"
    }
};

const rules = [
    // 自定义域名规则
    "DOMAIN-SUFFIX,googleapis.cn,节点选择",
    "DOMAIN-SUFFIX,gstatic.com,节点选择",
    "DOMAIN-SUFFIX,xn--ngstr-lra8j.com,节点选择",
    // AI 服务补充规则 (确保覆盖)
    "DOMAIN-SUFFIX,openai.com,AI",
    "DOMAIN-SUFFIX,ai.com,AI",
    "DOMAIN-SUFFIX,claude.ai,AI",
    "DOMAIN-SUFFIX,anthropic.com,AI",
    "DOMAIN-SUFFIX,perplexity.ai,AI",
    "DOMAIN-SUFFIX,poe.com,AI",
    "DOMAIN-SUFFIX,midjourney.com,AI",
    "DOMAIN-SUFFIX,notion.ai,AI",
    // 安全防护规则
    "RULE-SET,Hijacking,广告过滤",
    "RULE-SET,Privacy,广告过滤",
    "RULE-SET,Advertising,广告过滤",
    // 局域网直连
    "RULE-SET,private,DIRECT",
    "RULE-SET,icloud,苹果服务",
    "RULE-SET,apple,苹果服务",
    "RULE-SET,Microsoft,微软服务",
    "RULE-SET,google,谷歌服务",
    "RULE-SET,YouTube,YouTube",
    "RULE-SET,Netflix,节点选择",
    "RULE-SET,Spotify,Spotify",
    "RULE-SET,Bilibili,DIRECT",
    "RULE-SET,Bahamut,节点选择",
    "RULE-SET,OpenAI,AI",
    "RULE-SET,Claude,AI",
    "RULE-SET,Gemini,AI",
    "RULE-SET,Copilot,AI",
    "RULE-SET,TikTok,节点选择",
    "RULE-SET,GitHub,GitHub",
    "RULE-SET,Telegram,节点选择",
    "RULE-SET,Twitter,节点选择",
    "RULE-SET,Game,节点选择",
    "RULE-SET,Global,节点选择",
    "RULE-SET,ChinaMax,DIRECT",
    // GeoIP
    "GEOIP,LAN,DIRECT,no-resolve",
    "GEOIP,CN,DIRECT,no-resolve",
    "MATCH,漏网之鱼"
];

// 代理组通用配置 (Stash 兼容)
const groupBaseOption = {
    "interval": 300,
    "timeout": 3000,
    "url": "https://www.google.com/generate_204"
};

// 过滤节点的辅助函数
function filterProxies(proxies, filterKeywords) {
    if (!proxies || !Array.isArray(proxies)) return [];

    const regex = new RegExp(filterKeywords, "i");
    return proxies
        .filter(proxy => {
            if (typeof proxy === 'string') return !regex.test(proxy);
            if (proxy && proxy.name) return !regex.test(proxy.name);
            return false;
        })
        .map(proxy => typeof proxy === 'string' ? proxy : proxy.name);
}

// 按地区分组节点
function groupProxiesByRegion(proxies, regionKeyword) {
    if (!proxies || !Array.isArray(proxies)) return [];

    const regex = new RegExp(regionKeyword, "i");
    return proxies
        .filter(proxy => {
            const name = typeof proxy === 'string' ? proxy : proxy.name;
            return regex.test(name);
        })
        .map(proxy => typeof proxy === 'string' ? proxy : proxy.name);
}

// 程序入口
function main(config) {
    const proxyCount = config?.proxies?.length ?? 0;
    const proxyProviderCount =
        typeof config?.["proxy-providers"] === "object" ? Object.keys(config["proxy-providers"]).length : 0;

    if (proxyCount === 0 && proxyProviderCount === 0) {
        throw new Error("配置文件中未找到任何代理");
    }

    // 覆盖DNS配置
    config["dns"] = dnsConfig;

    // 定义过滤关键词
    const filterKeywords = "官网|套餐|流量|expiring|剩余|時間|重置|URL|到期|过期|机场|group|sub|订阅|查询|续费|观看|频道|客服|M3U|车费|车友|上车|通知|公告|严禁|测速";

    // 获取所有代理节点名称
    let allProxies = [];

    // 从 proxies 获取
    if (config.proxies && Array.isArray(config.proxies)) {
        allProxies = config.proxies.map(p => p.name);
    }

    // 过滤节点
    const filteredProxies = filterProxies(allProxies, filterKeywords);

    // 按地区分组
    const hkProxies = groupProxiesByRegion(filteredProxies, "HK|Hong Kong|香港");
    const twProxies = groupProxiesByRegion(filteredProxies, "TW|Taiwan|台湾");
    const jpProxies = groupProxiesByRegion(filteredProxies, "JP|Japan|日本");
    const sgProxies = groupProxiesByRegion(filteredProxies, "SG|Singapore|狮城|新加坡");
    const usProxies = groupProxiesByRegion(filteredProxies, "US|United States|America|美国");
    const deProxies = groupProxiesByRegion(filteredProxies, "DE|Germany|德国|法兰克福");

    // 获取其他节点 (不在上述地区的)
    const regionKeywords = "HK|Hong Kong|香港|TW|Taiwan|台湾|JP|Japan|日本|SG|Singapore|狮城|新加坡|US|United States|America|美国|DE|Germany|德国|法兰克福";
    const otherProxies = filteredProxies.filter(name => !new RegExp(regionKeywords, "i").test(name));

    // 自动选择分组名称
    const countryGroups = [
        "🇭🇰 自动-HK",
        "🇹🇼 自动-TW",
        "🇯🇵 自动-JP",
        "🇸🇬 自动-SG",
        "🇺🇸 自动-US",
        "🇩🇪 自动-DE"
    ];
    const autoRegionGroups = [...countryGroups, "🌐 其他节点"];

    // 图标基础路径 - Koolson/Qure
    const iconBase = "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color";

    // 构建代理组 (Stash 兼容格式)
    config["proxy-groups"] = [
        {
            "name": "节点选择",
            "type": "select",
            "proxies": [...autoRegionGroups],
            "icon": `${iconBase}/Proxy.png`
        },
        {
            ...groupBaseOption,
            "name": "AI",
            "type": "select", // 优先美国节点,不可用时自动切换
            "proxies": ["🇺🇸 自动-US", "🇯🇵 自动-JP", "🇸🇬 自动-SG", "🇭🇰 自动-HK", "🇹🇼 自动-TW", "🇩🇪 自动-DE", "🌐 其他节点"],
            "icon": `${iconBase}/Bot.png`
        },
        {
            ...groupBaseOption,
            "name": "YouTube",
            "type": "url-test",
            "proxies": [...autoRegionGroups],
            "icon": `${iconBase}/YouTube.png`
        },
        {
            ...groupBaseOption,
            "name": "谷歌服务",
            "type": "url-test",
            "proxies": [...autoRegionGroups],
            "icon": `${iconBase}/Google_Search.png`
        },
        {
            ...groupBaseOption,
            "name": "苹果服务",
            "type": "select",
            "proxies": ["DIRECT", ...autoRegionGroups],
            "icon": `${iconBase}/Apple.png`
        },
        {
            ...groupBaseOption,
            "name": "微软服务",
            "type": "select",
            "proxies": ["DIRECT", ...autoRegionGroups],
            "icon": `${iconBase}/Microsoft.png`
        },
        {
            ...groupBaseOption,
            "name": "Spotify",
            "type": "url-test",
            "proxies": [...autoRegionGroups],
            "icon": `${iconBase}/Spotify.png`
        },
        {
            ...groupBaseOption,
            "name": "GitHub",
            "type": "url-test",
            "proxies": [...autoRegionGroups],
            "icon": `${iconBase}/GitHub.png`
        },
        {
            "name": "广告过滤",
            "type": "select",
            "proxies": ["REJECT", "DIRECT"],
            "icon": `${iconBase}/Advertising.png`
        },
        {
            ...groupBaseOption,
            "name": "漏网之鱼",
            "type": "url-test",
            "proxies": [...autoRegionGroups],
            "icon": `${iconBase}/Final.png`
        },
        {
            "name": "全局拦截",
            "type": "select",
            "proxies": ["REJECT", "DIRECT"],
            "icon": `${iconBase}/Reject.png`
        },
        {
            ...groupBaseOption,
            "name": "🇭🇰 自动-HK",
            "type": "url-test",
            "proxies": hkProxies.length > 0 ? hkProxies : ["DIRECT"],
            "icon": `${iconBase}/Hong_Kong.png`
        },
        {
            ...groupBaseOption,
            "name": "🇹🇼 自动-TW",
            "type": "url-test",
            "proxies": twProxies.length > 0 ? twProxies : ["DIRECT"],
            "icon": `${iconBase}/Taiwan.png`
        },
        {
            ...groupBaseOption,
            "name": "🇯🇵 自动-JP",
            "type": "url-test",
            "proxies": jpProxies.length > 0 ? jpProxies : ["DIRECT"],
            "icon": `${iconBase}/Japan.png`
        },
        {
            ...groupBaseOption,
            "name": "🇸🇬 自动-SG",
            "type": "url-test",
            "proxies": sgProxies.length > 0 ? sgProxies : ["DIRECT"],
            "icon": `${iconBase}/Singapore.png`
        },
        {
            ...groupBaseOption,
            "name": "🇺🇸 自动-US",
            "type": "url-test",
            "proxies": usProxies.length > 0 ? usProxies : ["DIRECT"],
            "icon": `${iconBase}/United_States.png`
        },
        {
            ...groupBaseOption,
            "name": "🇩🇪 自动-DE",
            "type": "url-test",
            "proxies": deProxies.length > 0 ? deProxies : ["DIRECT"],
            "icon": `${iconBase}/Germany.png`
        },
        {
            ...groupBaseOption,
            "name": "🌐 其他节点",
            "type": "url-test",
            "proxies": otherProxies.length > 0 ? otherProxies : ["DIRECT"],
            "icon": `${iconBase}/World_Map.png`
        }
    ];

    // 覆盖规则配置
    config["rule-providers"] = ruleProviders;
    config["rules"] = rules;

    // 为每个节点启用 UDP
    if (config["proxies"]) {
        config["proxies"].forEach(proxy => {
            proxy.udp = true;
        });
    }

    // 返回修改后的配置
    return config;
}

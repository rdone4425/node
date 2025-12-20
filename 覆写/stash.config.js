// Stash 配置预处理脚本 - 参考 mihomo 风格
// 用于 Sub-Store 的脚本操作

// 国内DNS服务器
const domesticNameservers = [
  "223.5.5.5",
  "119.28.28.28"
];

// 国外DNS服务器  
const foreignNameservers = [
  "https://dns.alidns.com/dns-query",
  "https://doh.dns.sb/dns-query"
];

// DNS配置
const dnsConfig = {
  enable: true,
  ipv6: false,
  listen: "0.0.0.0:53",
  "default-nameserver": domesticNameservers,
  nameserver: foreignNameservers,
  "enhanced-mode": "fake-ip",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter": [
    "+.lan",
    "localhost.ptlogin2.qq.com",
    "*.battle.net",
    "*.blzstatic.cn",
    "*.battlenet.com",
    "*.battlenet.com.cn",
    "lens.l.google.com",
    "+.srv.nintendo.net",
    "+.stun.playstation.net",
    "+.msftncsi.com",
    "+.xboxlive.com",
    "msftconnecttest.com",
    "xbox.*.*.microsoft.com",
    "+.msftconnecttest.com",
    "*.msftncsi.com",
    "*.msftconnecttest.com",
    "*.mcdn.bilivideo.cn"
  ]
};

// 代理提供商通用配置
const proxyProviderCommon = {
  interval: 600,
  "health-check": {
    enable: true,
    url: "http://www.google.com/generate_204",
    interval: 300
  }
};

// 代理组通用配置
const groupBaseOption = {
  interval: 120,
  timeout: 2000,
  url: "http://www.google.com/generate_204",
  lazy: true,
  tolerance: 50
};

// 图标基础路径
const iconBase = "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color";

// 远程规则集配置
const ruleProviderCommon = {
  type: "http",
  interval: 86400,
  behavior: "classical",
  format: "yaml"
};

// 规则集基础 URL
const ruleBase = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash";

// 规则集配置
const ruleProviders = {
  reject: {
    ...ruleProviderCommon,
    behavior: "domain",
    url: `${ruleBase}/Advertising/Advertising.yaml`,
    path: "./ruleset/reject.yaml"
  },
  icloud: {
    ...ruleProviderCommon,
    url: `${ruleBase}/iCloud/iCloud.yaml`,
    path: "./ruleset/icloud.yaml"
  },
  apple: {
    ...ruleProviderCommon,
    url: `${ruleBase}/Apple/Apple.yaml`,
    path: "./ruleset/apple.yaml"
  },
  google: {
    ...ruleProviderCommon,
    url: `${ruleBase}/Google/Google.yaml`,
    path: "./ruleset/google.yaml"
  },
  proxy: {
    ...ruleProviderCommon,
    url: `${ruleBase}/Proxy/Proxy.yaml`,
    path: "./ruleset/proxy.yaml"
  },
  direct: {
    ...ruleProviderCommon,
    url: `${ruleBase}/Direct/Direct.yaml`,
    path: "./ruleset/direct.yaml"
  },
  private: {
    ...ruleProviderCommon,
    url: `${ruleBase}/Lan/Lan.yaml`,
    path: "./ruleset/private.yaml"
  },
  gfw: {
    ...ruleProviderCommon,
    url: `${ruleBase}/Global/Global.yaml`,
    path: "./ruleset/gfw.yaml"
  },
  greatfire: {
    ...ruleProviderCommon,
    url: `${ruleBase}/GreatFire/GreatFire.yaml`,
    path: "./ruleset/greatfire.yaml"
  },
  "tld-not-cn": {
    ...ruleProviderCommon,
    url: `${ruleBase}/Global/Global_Domain.yaml`,
    path: "./ruleset/tld-not-cn.yaml"
  },
  telegramcidr: {
    ...ruleProviderCommon,
    behavior: "ipcidr",
    url: `${ruleBase}/Telegram/Telegram.yaml`,
    path: "./ruleset/telegramcidr.yaml"
  },
  cncidr: {
    ...ruleProviderCommon,
    behavior: "ipcidr",
    url: `${ruleBase}/ChinaIPs/ChinaIPs_IP.yaml`,
    path: "./ruleset/cncidr.yaml"
  },
  lancidr: {
    ...ruleProviderCommon,
    behavior: "ipcidr",
    url: `${ruleBase}/Lan/Lan_IP.yaml`,
    path: "./ruleset/lancidr.yaml"
  },
  applications: {
    ...ruleProviderCommon,
    url: `${ruleBase}/Download/Download.yaml`,
    path: "./ruleset/applications.yaml"
  }
};

// 规则配置 - 使用远程规则集
const rules = [
  // 脚本规则
  "SCRIPT,quic,REJECT",
  
  // 广告拦截
  "RULE-SET,reject,广告拦截",
  
  // 局域网
  "RULE-SET,private,DIRECT",
  "RULE-SET,lancidr,DIRECT,no-resolve",
  
  // AI 服务
  "DOMAIN-SUFFIX,openai.com,美国节点",
  "DOMAIN-SUFFIX,anthropic.com,美国节点",
  "DOMAIN-SUFFIX,claude.ai,美国节点",
  "DOMAIN-KEYWORD,openai,美国节点",
  "DOMAIN-KEYWORD,chatgpt,美国节点",
  
  // Apple 服务
  "RULE-SET,icloud,选择代理",
  "RULE-SET,apple,选择代理",
  
  // Google 服务
  "RULE-SET,google,选择代理",
  
  // Telegram
  "RULE-SET,telegramcidr,选择代理,no-resolve",
  
  // 下载工具
  "RULE-SET,applications,DIRECT",
  
  // 国外网站
  "RULE-SET,proxy,选择代理",
  "RULE-SET,gfw,选择代理",
  "RULE-SET,greatfire,选择代理",
  "RULE-SET,tld-not-cn,选择代理",
  
  // 国内网站
  "RULE-SET,direct,DIRECT",
  "RULE-SET,cncidr,DIRECT,no-resolve",
  
  // GeoIP
  "GEOIP,LAN,DIRECT,no-resolve",
  "GEOIP,CN,DIRECT,no-resolve",
  
  // 兜底规则
  "MATCH,选择代理"
];

// 主函数 - Sub-Store 脚本操作入口
function main(config) {
  try {
    const proxyCount = config?.proxies?.length ?? 0;
    const proxyProviderCount = 
      typeof config?.["proxy-providers"] === "object" ? Object.keys(config["proxy-providers"]).length : 0;
    
    if (proxyCount === 0 && proxyProviderCount === 0) {
      console.log("⚠️ 配置文件中未找到任何代理，返回原始配置");
      return config;
    }

    console.log(`📊 找到 ${proxyCount} 个节点, ${proxyProviderCount} 个订阅源`);

    // 覆盖基础配置
    config["mixed-port"] = 7890;
    config["allow-lan"] = true;
    config["bind-address"] = "*";
    config["ipv6"] = false;
    config["mode"] = "Rule";
    config["log-level"] = "info";
    config["external-controller"] = "127.0.0.1:9090";

    // 覆盖 DNS 配置
    config["dns"] = dnsConfig;

    // 应用代理提供商通用配置
    if (config["proxy-providers"]) {
      Object.keys(config["proxy-providers"]).forEach(key => {
        config["proxy-providers"][key] = {
          ...proxyProviderCommon,
          ...config["proxy-providers"][key]
        };
      });
    }

    // 定义过滤器关键词
    const filterKeywords = "官网|套餐|流量|expiring|剩余|時間|重置|到期|过期|机场|订阅|续费|观看|频道|客服|通知|公告|严禁|测速";
    
    // 定义地区关键词
    const regionKeywords = "HK|Hong Kong|香港|TW|Taiwan|台湾|JP|Japan|日本|SG|Singapore|狮城|新加坡|US|United States|America|美国|KR|Korea|韩国";

    // 创建过滤器
    const otherFilterString = `(?i)^(?!.*(${filterKeywords}))(?!.*(${regionKeywords})).*$`;

    // 定义自动选择分组
    const autoRegionGroups = [
      "香港节点",
      "台湾节点",
      "日本节点",
      "狮城节点",
      "美国节点",
      "韩国节点",
      "其他节点"
    ];

    // 配置代理组
    config["proxy-groups"] = [
      {
        ...groupBaseOption,
        name: "选择代理",
        type: "select",
        proxies: ["自动切换", "手动选择", ...autoRegionGroups, "DIRECT"],
        icon: `${iconBase}/Available.png`
      },
      {
        ...groupBaseOption,
        name: "自动切换",
        type: "url-test",
        "include-all": true,
        icon: `${iconBase}/Auto.png`
      },
      {
        ...groupBaseOption,
        name: "手动选择",
        type: "select",
        "include-all": true,
        icon: `${iconBase}/Static.png`
      },
      {
        ...groupBaseOption,
        name: "广告拦截",
        type: "select",
        proxies: ["REJECT", "DIRECT"],
        icon: `${iconBase}/Advertising.png`
      },
      {
        ...groupBaseOption,
        name: "香港节点",
        type: "url-test",
        "include-all": true,
        filter: "(?i)🇭🇰|港|HK|Hong",
        icon: `${iconBase}/Hong_Kong.png`
      },
      {
        ...groupBaseOption,
        name: "台湾节点",
        type: "url-test",
        "include-all": true,
        filter: "(?i)🇹🇼|台|TW|Tai",
        icon: `${iconBase}/Taiwan.png`
      },
      {
        ...groupBaseOption,
        name: "狮城节点",
        type: "url-test",
        "include-all": true,
        filter: "(?i)🇸🇬|坡|狮城|SG|Singapore",
        icon: `${iconBase}/Singapore.png`
      },
      {
        ...groupBaseOption,
        name: "日本节点",
        type: "url-test",
        "include-all": true,
        filter: "(?i)🇯🇵|日|JP|Japan",
        icon: `${iconBase}/Japan.png`
      },
      {
        ...groupBaseOption,
        name: "美国节点",
        type: "url-test",
        "include-all": true,
        filter: "(?i)🇺🇸|美|US|States|American",
        icon: `${iconBase}/United_States.png`
      },
      {
        ...groupBaseOption,
        name: "韩国节点",
        type: "url-test",
        "include-all": true,
        filter: "(?i)🇰🇷|韩|KR|KOR|Korea",
        icon: `${iconBase}/Korea.png`
      },
      {
        ...groupBaseOption,
        name: "其他节点",
        type: "url-test",
        "include-all": true,
        filter: otherFilterString,
        icon: `${iconBase}/United_Nations.png`
      }
    ];

    // 覆盖规则
    config["rules"] = rules;

    // 覆盖规则集
    config["rule-providers"] = ruleProviders;

    // 添加脚本配置
    config["script"] = {
      shortcuts: {
        quic: "network == 'udp' and dst_port == 443"
      }
    };

    // 为所有节点启用 UDP
    if (config["proxies"]) {
      config["proxies"].forEach(proxy => {
        proxy.udp = true;
      });
      console.log(`✅ 已为 ${config["proxies"].length} 个节点启用 UDP`);
    }

    console.log("🎉 配置处理完成");
    return config;
    
  } catch (error) {
    console.error("❌ 脚本执行出错:", error.message);
    console.error("📍 错误堆栈:", error.stack);
    console.log("⚠️ 返回原始配置");
    return config;
  }
}

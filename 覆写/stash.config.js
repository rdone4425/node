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

// 规则配置
const rules = [
  "SCRIPT,quic,REJECT",
  "GEOSITE,category-ads-all,广告拦截",
  "GEOSITE,private,DIRECT",
  "GEOIP,private,DIRECT",
  "GEOSITE,openai,美国节点",
  "GEOSITE,PayPal,美国节点",
  "GEOSITE,spotify,选择代理",
  "GEOSITE,github,选择代理",
  "IP-ASN,62014,选择代理,no-resolve",
  "IP-ASN,59930,选择代理,no-resolve",
  "IP-ASN,44907,选择代理,no-resolve",
  "IP-ASN,211157,选择代理,no-resolve",
  "PROCESS-NAME,Telegram.exe,选择代理",
  "PROCESS-NAME,Telegram,选择代理",
  "GEOSITE,telegram,选择代理",
  "GEOSITE,youtube,选择代理",
  "GEOSITE,google,选择代理",
  "GEOSITE,twitter,选择代理",
  "DOMAIN-SUFFIX,tapbots.com,选择代理",
  "GEOSITE,instagram,选择代理",
  "GEOSITE,facebook,选择代理",
  "GEOSITE,steam@cn,DIRECT",
  "GEOSITE,steam,选择代理",
  "DOMAIN-SUFFIX,iphone-ld.apple.com,DIRECT",
  "DOMAIN-SUFFIX,lcdn-locator.apple.com,DIRECT",
  "DOMAIN-SUFFIX,lcdn-registration.apple.com,DIRECT",
  "DOMAIN-SUFFIX,push.apple.com,DIRECT",
  "PROCESS-NAME,trustd,选择代理",
  "GEOSITE,microsoft@cn,DIRECT",
  "GEOSITE,microsoft,选择代理",
  "GEOSITE,xbox,选择代理",
  "PROCESS-NAME,v2ray,DIRECT",
  "PROCESS-NAME,Surge,DIRECT",
  "PROCESS-NAME,ss-local,DIRECT",
  "PROCESS-NAME,privoxy,DIRECT",
  "PROCESS-NAME,trojan,DIRECT",
  "PROCESS-NAME,trojan-go,DIRECT",
  "PROCESS-NAME,naive,DIRECT",
  "PROCESS-NAME,CloudflareWARP,DIRECT",
  "PROCESS-NAME,Cloudflare WARP,DIRECT",
  "IP-CIDR,162.159.193.0/24,DIRECT,no-resolve",
  "PROCESS-NAME,p4pclient,DIRECT",
  "PROCESS-NAME,Thunder,DIRECT",
  "PROCESS-NAME,DownloadService,DIRECT",
  "PROCESS-NAME,qbittorrent,DIRECT",
  "PROCESS-NAME,Transmission,DIRECT",
  "PROCESS-NAME,fdm,DIRECT",
  "PROCESS-NAME,aria2c,DIRECT",
  "PROCESS-NAME,Folx,DIRECT",
  "PROCESS-NAME,NetTransport,DIRECT",
  "PROCESS-NAME,uTorrent,DIRECT",
  "PROCESS-NAME,WebTorrent,DIRECT",
  "GEOSITE,geolocation-!cn,选择代理",
  "GEOIP,LAN,DIRECT",
  "GEOIP,CN,DIRECT",
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

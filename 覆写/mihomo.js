// 国内DNS服务器
const domesticNameservers = [
  "https://223.5.5.5/dns-query", // 阿里DoH
  "https://doh.pub/dns-query" // 腾讯DoH
];
// 国外DNS服务器
const foreignNameservers = [
  "https://208.67.222.222/dns-query", // OpenDNS
  "https://77.88.8.8/dns-query", //YandexDNS
  "https://1.1.1.1/dns-query", // CloudflareDNS
  "https://8.8.4.4/dns-query", // GoogleDNS  

];
// DNS配置
const dnsConfig = {
  "enable": true,
  "listen": "0.0.0.0:1053",
  "ipv6": false,
  "prefer-h3": false,
  "respect-rules": true, // DNS查询遵循规则分流
  "use-system-hosts": false,
  "cache-algorithm": "arc",
  "enhanced-mode": "fake-ip",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter": [
    "+.lan",
    "+.local",
    "+.msftconnecttest.com",
    "+.msftncsi.com",
    "localhost.ptlogin2.qq.com",
    "localhost.sec.qq.com",
    "+.in-addr.arpa",
    "+.ip6.arpa",
    "time.*.com",
    "time.*.gov",
    "pool.ntp.org",
    "localhost.work.weixin.qq.com"
  ],
  "default-nameserver": ["223.5.5.5", "1.2.4.8"], // 仅用于解析DoH服务器
  "nameserver": [...domesticNameservers], // 默认DNS（直连出站）
  "proxy-server-nameserver": [...domesticNameservers], // 解析代理服务器
  "nameserver-policy": {
    // 直连出站 - 使用国内DNS
    "geosite:private": domesticNameservers,
    "geosite:cn": domesticNameservers,
    "geosite:apple-cn": domesticNameservers,
    "geosite:google-cn": domesticNameservers,
    "geosite:microsoft@cn": domesticNameservers,
    // 代理出站 - 使用国外DNS（通过代理查询）
    "geosite:gfw": foreignNameservers,
    "geosite:geolocation-!cn": foreignNameservers,
    "geosite:google": foreignNameservers,
    "geosite:youtube": foreignNameservers,
    "geosite:twitter": foreignNameservers,
    "geosite:telegram": foreignNameservers,
    "geosite:openai": foreignNameservers,
    "geosite:netflix": foreignNameservers
  }
};
// 规则集通用配置
const ruleProviderCommon = {
  "type": "http",
  "format": "yaml",
  "interval": 86400
};
// 规则集配置 - 统一使用 blackmatrix7/ios_rule_script
const ruleBase = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash";
const ruleProviders = {
  "Advertising": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Advertising/Advertising.list`,
    "path": "./ruleset/blackmatrix7/Advertising.yaml",
    "format": "text"
  },
  "Hijacking": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Hijacking/Hijacking.list`,
    "path": "./ruleset/blackmatrix7/Hijacking.yaml",
    "format": "text"
  },
  "Privacy": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Privacy/Privacy.list`,
    "path": "./ruleset/blackmatrix7/Privacy.yaml",
    "format": "text"
  },
  "private": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Lan/Lan.list`,
    "path": "./ruleset/blackmatrix7/private.yaml",
    "format": "text"
  },
  "icloud": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/iCloud/iCloud.list`,
    "path": "./ruleset/blackmatrix7/icloud.yaml",
    "format": "text"
  },
  "apple": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Apple/Apple.list`,
    "path": "./ruleset/blackmatrix7/apple.yaml",
    "format": "text"
  },
  "google": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Google/Google.list`,
    "path": "./ruleset/blackmatrix7/google.yaml",
    "format": "text"
  },
  "Microsoft": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Microsoft/Microsoft.list`,
    "path": "./ruleset/blackmatrix7/Microsoft.yaml",
    "format": "text"
  },
  "YouTube": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/YouTube/YouTube.list`,
    "path": "./ruleset/blackmatrix7/YouTube.yaml",
    "format": "text"
  },
  "Netflix": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Netflix/Netflix.list`,
    "path": "./ruleset/blackmatrix7/Netflix.yaml",
    "format": "text"
  },
  "Spotify": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Spotify/Spotify.list`,
    "path": "./ruleset/blackmatrix7/Spotify.yaml",
    "format": "text"
  },
  "Bilibili": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/BiliBili/BiliBili.list`,
    "path": "./ruleset/blackmatrix7/Bilibili.yaml",
    "format": "text"
  },
  "Bahamut": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Bahamut/Bahamut.list`,
    "path": "./ruleset/blackmatrix7/Bahamut.yaml",
    "format": "text"
  },
  "OpenAI": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/OpenAI/OpenAI.list`,
    "path": "./ruleset/blackmatrix7/OpenAI.yaml",
    "format": "text"
  },
  "Claude": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Claude/Claude.list`,
    "path": "./ruleset/blackmatrix7/Claude.yaml",
    "format": "text"
  },
  "Gemini": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Gemini/Gemini.list`,
    "path": "./ruleset/blackmatrix7/Gemini.yaml",
    "format": "text"
  },
  "Copilot": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Copilot/Copilot.list`,
    "path": "./ruleset/blackmatrix7/Copilot.yaml",
    "format": "text"
  },
  "TikTok": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/TikTok/TikTok.list`,
    "path": "./ruleset/blackmatrix7/TikTok.yaml",
    "format": "text"
  },
  "GitHub": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/GitHub/GitHub.list`,
    "path": "./ruleset/blackmatrix7/GitHub.yaml",
    "format": "text"
  },
  "Telegram": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Telegram/Telegram.list`,
    "path": "./ruleset/blackmatrix7/Telegram.yaml",
    "format": "text"
  },
  "Twitter": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Twitter/Twitter.list`,
    "path": "./ruleset/blackmatrix7/Twitter.yaml",
    "format": "text"
  },
  "Game": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Game/Game.list`,
    "path": "./ruleset/blackmatrix7/Game.yaml",
    "format": "text"
  },
  "ChinaMax": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/ChinaMax/ChinaMax.list`,
    "path": "./ruleset/blackmatrix7/ChinaMax.yaml",
    "format": "text"
  },
  "Global": {
    ...ruleProviderCommon,
    "behavior": "classical",
    "url": `${ruleBase}/Global/Global.list`,
    "path": "./ruleset/blackmatrix7/Global.yaml",
    "format": "text"
  },
};


const rules = [
  // 自定义域名规则
  "DOMAIN-SUFFIX,googleapis.cn,节点选择",
  "DOMAIN-SUFFIX,gstatic.com,节点选择",
  "DOMAIN-SUFFIX,xn--ngstr-lra8j.com,节点选择",
  // 安全防护规则 - 最高优先级
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
  // GeoIP/GeoSite
  "GEOSITE,CN,DIRECT",
  "GEOIP,LAN,DIRECT,no-resolve",
  "GEOIP,CN,DIRECT,no-resolve",
  "MATCH,漏网之鱼"
];

// 代理组通用配置
const groupBaseOption = {
  "interval": 300,
  "timeout": 3000,
  "url": "https://www.google.com/generate_204",
  "lazy": true,
  "max-failed-times": 3,
  "hidden": false
};

// 程序入口 (已添加 "其他" 分组)
function main(config) {
  const proxyCount = config?.proxies?.length ?? 0;
  const proxyProviderCount =
    typeof config?.["proxy-providers"] === "object" ? Object.keys(config["proxy-providers"]).length : 0;
  if (proxyCount === 0 && proxyProviderCount === 0) {
    throw new Error("配置文件中未找到任何代理");
  }

  // 覆盖原配置中DNS配置
  config["dns"] = dnsConfig;

  // 1. 定义过滤器关键词 (排除 "官网" "流量" 等)
  const filterKeywords = "官网|套餐|流量| expiring|剩余|時間|重置|URL|到期|过期|机场|group|sub|订阅|查询|续费|观看|频道|官网|客服|M3U|车费|车友|上车|通知|公告|严禁|测速";
  
  // 2. 定义地区关键词 (已分组的地区)
  const regionKeywords = "HK|Hong Kong|香港|TW|Taiwan|台湾|JP|Japan|日本|SG|Singapore|狮城|新加坡|US|United States|America|美国|DE|Germany|德国";

  // 3. 创建过滤器
  // 节点过滤器 (Global, 节点选择, 漏网之鱼 使用)
  const nodeFilterString = `(?i)^(?!.*(${filterKeywords})).*$`;
  // "其他" 过滤器 (排除 "信息" 和 "已分组地区")
  const otherFilterString = `(?i)^(?!.*(${filterKeywords}))(?!.*(${regionKeywords})).*$`;

  // 4. 定义自动选择分组的名称
  const countryGroups = [
    "🇭🇰 自动-HK",
    "🇹🇼 自动-TW",
    "🇯🇵 自动-JP",
    "🇸🇬 自动-SG",
    "🇺🇸 自动-US",
    "🇩🇪 自动-DE"
  ];
  const autoRegionGroups = [...countryGroups, "🌐 其他节点"];

  // 图标基础路径
  const iconBase = "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color";

  config["proxy-groups"] = [

    {
      ...groupBaseOption,
      "name": "节点选择",
      "type": "select",
      "proxies": [...autoRegionGroups],
      "icon": `${iconBase}/Proxy.png`
    },
    {
      ...groupBaseOption,
      "name": "AI",
      "type": "url-test",
      "proxies": [...autoRegionGroups],
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
      ...groupBaseOption,
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
      ...groupBaseOption,
      "name": "全局拦截",
      "type": "select",
      "proxies": ["REJECT", "DIRECT"],
      "icon": `${iconBase}/Reject.png`
    },
    {
      ...groupBaseOption,
      "name": "🇭🇰 自动-HK",
      "type": "url-test",
      "include-all": true,
      "filter": "(?i)HK|Hong Kong|香港",
      "icon": `${iconBase}/Hong_Kong.png`
    },
    {
      ...groupBaseOption,
      "name": "🇹🇼 自动-TW",
      "type": "url-test",
      "include-all": true,
      "filter": "(?i)TW|Taiwan|台湾",
      "icon": `${iconBase}/Taiwan.png`
    },
    {
      ...groupBaseOption,
      "name": "🇯🇵 自动-JP",
      "type": "url-test",
      "include-all": true,
      "filter": "(?i)JP|Japan|日本",
      "icon": `${iconBase}/Japan.png`
    },
    {
      ...groupBaseOption,
      "name": "🇸🇬 自动-SG",
      "type": "url-test",
      "include-all": true,
      "filter": "(?i)SG|Singapore|狮城|新加坡",
      "icon": `${iconBase}/Singapore.png`
    },
    {
      ...groupBaseOption,
      "name": "🇺🇸 自动-US",
      "type": "url-test",
      "include-all": true,
      "filter": "(?i)US|United States|America|美国",
      "icon": `${iconBase}/United_States.png`
    },
    {
      ...groupBaseOption,
      "name": "🇩🇪 自动-DE",
      "type": "url-test",
      "include-all": true,
      "filter": "(?i)DE|Germany|德国|法兰克福",
      "icon": `${iconBase}/Germany.png`
    },
    {
      ...groupBaseOption,
      "name": "🌐 其他节点",
      "type": "url-test",
      "include-all": true,
      "filter": otherFilterString,
      "icon": `${iconBase}/World_Map.png`
    }
  ];

  // 覆盖原配置中的规则
  config["rule-providers"] = ruleProviders;
  config["rules"] = rules;
  // 添加判断
  if (config["proxies"]) {
    config["proxies"].forEach(proxy => {
      // 为每个节点设置 udp = true
      proxy.udp = true
    })
  }
  // 返回修改后的配置
  return config;
}

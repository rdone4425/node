/**
 * Sub-Store 脚本：按地区统一重命名节点（自动识别 + 手动兜底）
 *
 * 行为：
 *   1) 先从节点名里识别地区关键词（中文/英文/缩写），命中就按地区改名
 *   2) 识别不到时，如果你设置了 name，就把节点归到 name 指定的地区
 *   3) 没设 name 又没识别到 → 保留原名不动
 *   4) 同一地区内自动连号 01、02、03 ...
 *
 * 可选参数（URL 后用 #key=value&key=value 传入）：
 *   name=hk            识别失败时归到这里。可写两种值：
 *                        - 预设代号 (hk/jp/us 等)  → 用预设的名字 + 国旗
 *                        - 任意自定义文字          → 当成显示名，无国旗
 *   emoji=             自定义 emoji，覆盖预设国旗；或给自定义名字加 emoji
 *   pad=2              序号补零位数            默认 2  → 01, 02 ...
 *   flag=true          是否显示 emoji          默认 true，false 全局关闭
 *   sep=               地区与序号的分隔符      默认空格
 *   sort=true          是否按地区分组排序后再编号  默认 true
 *
 * 例子：
 *   #name=hk                           识别失败的 → 🇭🇰 香港 01、02 ...
 *   #name=jp&pad=3                     识别失败的 → 🇯🇵 日本 001、002 ...
 *   #name=hk&emoji=🔥                  覆盖预设国旗 → 🔥 香港 01、02 ...
 *   #name=自建&emoji=🌟                完全自定义 → 🌟 自建 01、02 ...
 *   #name=自建                         无 emoji   → 自建 01、02 ...
 */

/**
 * @typedef {Object} Region
 * @property {string} code     URL 参数用的代号
 * @property {string} name     显示名
 * @property {string} flag     emoji
 * @property {RegExp[]} patterns 用于在原名里识别该地区
 */

/**
 * @typedef {Object} RunOptions
 * @property {number} pad
 * @property {boolean} flag
 * @property {string} sep
 * @property {boolean} sort
 * @property {Region|null} fallback
 */

// ──────────────────────────────────────────────────────────────────────────
// 地区规则表：从上到下顺序匹配，命中即停。code 用于 fallback 参数引用。
// ──────────────────────────────────────────────────────────────────────────
/** @type {Region[]} */
const REGIONS = [
  { code: 'hk', name: '香港',     flag: '🇭🇰', patterns: [/香港|港|\bHK(?![A-Za-z])|Hong\s?Kong|\bHKG(?![A-Za-z])/i] },
  { code: 'tw', name: '台湾',     flag: '🇹🇼', patterns: [/台湾|台北|高雄|\bTW(?![A-Za-z])|Taiwan|\bTPE(?![A-Za-z])/i] },
  { code: 'jp', name: '日本',     flag: '🇯🇵', patterns: [/日本|东京|大阪|\bJP(?![A-Za-z])|Japan|\bJPN(?![A-Za-z])|Tokyo|Osaka/i] },
  { code: 'kr', name: '韩国',     flag: '🇰🇷', patterns: [/韩国|首尔|\bKR(?![A-Za-z])|Korea|\bKOR(?![A-Za-z])|Seoul/i] },
  { code: 'sg', name: '新加坡',   flag: '🇸🇬', patterns: [/新加坡|狮城|\bSG(?![A-Za-z])|Singapore|\bSIN(?![A-Za-z])/i] },
  { code: 'us', name: '美国',     flag: '🇺🇸', patterns: [/美国|\bUS(?![A-Za-z])|United\s?States|\bUSA(?![A-Za-z])|America/i] },
  { code: 'ca', name: '加拿大',   flag: '🇨🇦', patterns: [/加拿大|\bCA(?![A-Za-z])|Canada/i] },
  { code: 'uk', name: '英国',     flag: '🇬🇧', patterns: [/英国|\bUK(?![A-Za-z])|United\s?Kingdom|Britain|London/i] },
  { code: 'de', name: '德国',     flag: '🇩🇪', patterns: [/德国|法兰克福|\bDE(?![A-Za-z])|Germany|\bGER(?![A-Za-z])/i] },
  { code: 'fr', name: '法国',     flag: '🇫🇷', patterns: [/法国|\bFR(?![A-Za-z])|France|Paris/i] },
  { code: 'nl', name: '荷兰',     flag: '🇳🇱', patterns: [/荷兰|\bNL(?![A-Za-z])|Netherlands|Holland|Amsterdam/i] },
  { code: 'ru', name: '俄罗斯',   flag: '🇷🇺', patterns: [/俄罗斯|\bRU(?![A-Za-z])|Russia|Moscow/i] },
  { code: 'tr', name: '土耳其',   flag: '🇹🇷', patterns: [/土耳其|\bTR(?![A-Za-z])|Turkey/i] },
  { code: 'au', name: '澳大利亚', flag: '🇦🇺', patterns: [/澳大利亚|澳洲|\bAU(?![A-Za-z])|Australia|Sydney/i] },
  { code: 'in', name: '印度',     flag: '🇮🇳', patterns: [/印度|\bIN(?![A-Za-z])|India/i] },
  { code: 'ar', name: '阿根廷',   flag: '🇦🇷', patterns: [/阿根廷|\bAR(?![A-Za-z])|Argentina/i] },
  { code: 'br', name: '巴西',     flag: '🇧🇷', patterns: [/巴西|\bBR(?![A-Za-z])|Brazil/i] },
  { code: 'th', name: '泰国',     flag: '🇹🇭', patterns: [/泰国|\bTH(?![A-Za-z])|Thailand/i] },
  { code: 'vn', name: '越南',     flag: '🇻🇳', patterns: [/越南|\bVN(?![A-Za-z])|Vietnam/i] },
  { code: 'ph', name: '菲律宾',   flag: '🇵🇭', patterns: [/菲律宾|\bPH(?![A-Za-z])|Philippines/i] },
  { code: 'my', name: '马来西亚', flag: '🇲🇾', patterns: [/马来西亚|\bMY(?![A-Za-z])|Malaysia/i] },
  { code: 'id', name: '印尼',     flag: '🇮🇩', patterns: [/印尼|印度尼西亚|\bID(?![A-Za-z])|Indonesia/i] },
  { code: 'ae', name: '阿联酋',   flag: '🇦🇪', patterns: [/阿联酋|迪拜|\bAE(?![A-Za-z])|\bUAE(?![A-Za-z])|Dubai/i] },
];

/**
 * @param {string} name
 * @returns {Region|null}
 */
function detectRegion(name) {
  const s = String(name || '');
  for (const r of REGIONS) {
    for (const p of r.patterns) {
      if (p.test(s)) return r;
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown>} a
 * @returns {Region|null}
 */
function resolveFallback(a) {
  const v = String(a.name ?? '').trim();
  if (!v) return null;
  const preset = REGIONS.find((r) => r.code === v.toLowerCase());
  if (preset) {
    return {
      code: preset.code,
      name: preset.name,
      flag: String(a.emoji ?? preset.flag),
      patterns: [],
    };
  }
  return {
    code: 'custom',
    name: v,
    flag: String(a.emoji ?? ''),
    patterns: [],
  };
}

/**
 * @param {unknown} ctx
 * @returns {RunOptions}
 */
function parseArgs(ctx) {
  const fromCtx = ctx && typeof ctx === 'object' && /** @type {any} */ (ctx).$arguments;
  const fromGlobal = (typeof $arguments !== 'undefined') ? $arguments : null; // eslint-disable-line no-undef
  const a = fromCtx || fromGlobal || {};
  return {
    pad:  parseInt(a.pad ?? 2, 10) || 2,
    flag: String(a.flag ?? 'true') !== 'false',
    sep:  a.sep ?? ' ',
    sort: String(a.sort ?? 'true') !== 'false',
    fallback: resolveFallback(a),
  };
}

/**
 * @param {Region} region
 * @param {number} index
 * @param {RunOptions} opts
 * @returns {string}
 */
function buildName(region, index, opts) {
  const num = String(index).padStart(opts.pad, '0');
  const flagPart = opts.flag && region.flag ? `${region.flag} ` : '';
  return `${flagPart}${region.name}${opts.sep}${num}`;
}

/**
 * Sub-Store 节点操作入口
 * @param {Array<Record<string, any>>} proxies
 * @param {string} [targetPlatform]
 * @param {{ $arguments?: Record<string, unknown> }} [context]
 * @returns {Array<Record<string, any>>}
 */
function operator(proxies = [], targetPlatform, context) {
  const opts = parseArgs(context);

  const tagged = proxies.map((proxy) => ({
    proxy,
    region: detectRegion(proxy?.name) || opts.fallback,
  }));

  if (opts.sort) {
    const order = new Map(REGIONS.map((r, i) => [r.code, i]));
    if (opts.fallback && !order.has(opts.fallback.code)) {
      order.set(opts.fallback.code, REGIONS.length);
    }
    const idx = (r) => (r ? (order.get(r.code) ?? 998) : 999);
    tagged.sort((a, b) => idx(a.region) - idx(b.region));
  }

  const counters = {};
  return tagged.map(({ proxy, region }) => {
    if (!region) return proxy;
    counters[region.code] = (counters[region.code] || 0) + 1;
    return { ...proxy, name: buildName(region, counters[region.code], opts) };
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { operator };
}

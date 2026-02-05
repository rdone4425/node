/**
 * Cloudflare Worker - 订阅转换器
 * 用于处理不兼容的 VLESS 节点配置
 *
 * 部署到 Cloudflare Workers
 * 使用方式: https://your-worker.workers.dev/?url=订阅链接&mode=remove
 *
 * 参数说明:
 * - url: 原始订阅链接（必需）
 * - mode: 处理模式 (remove|filter)
 *   - remove: 清理不兼容字段（默认）
 *   - filter: 完全过滤掉不兼容节点
 */

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const sourceUrl = url.searchParams.get('url');
      const mode = url.searchParams.get('mode') || 'remove';

      // 验证参数
      if (!sourceUrl) {
        return new Response('Error: url parameter is required', { status: 400 });
      }

      // 获取原始订阅
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        return new Response(`Error: Failed to fetch subscription (${response.status})`, {
          status: 500
        });
      }

      const contentType = response.headers.get('content-type');

      // 判断是否为 base64 编码
      const text = await response.text();
      const isBase64 = !text.includes('\n') && text.length > 100;

      let subscriptionContent;
      if (isBase64) {
        // Base64 编码的订阅
        subscriptionContent = atob(text);
      } else {
        // 纯文本订阅
        subscriptionContent = text;
      }

      // 处理订阅
      const processed = processSubscription(subscriptionContent, mode);

      // 返回结果（保持原始格式）
      const result = isBase64 ? btoa(processed) : processed;

      return new Response(result, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="subscription.txt"',
        },
      });

    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },
};

/**
 * 处理订阅内容
 */
function processSubscription(content, mode) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const processed = [];

  for (const line of lines) {
    if (line.startsWith('ss://') || line.startsWith('ssr://') ||
        line.startsWith('vmess://') || line.startsWith('trojan://')) {
      // 不是 VLESS，直接保留
      processed.push(line);
      continue;
    }

    if (line.startsWith('vless://')) {
      const result = processVlessProxy(line, mode);
      if (result) {
        processed.push(result);
      }
      continue;
    }

    // 其他格式直接保留
    processed.push(line);
  }

  return processed.join('\n');
}

/**
 * 处理 VLESS 代理
 */
function processVlessProxy(vlessLine, mode) {
  try {
    // 解析 VLESS URL
    // 格式: vless://uuid@server:port?params#name

    const parsed = parseVlessUrl(vlessLine);
    if (!parsed) return vlessLine;

    // 检查是否有不兼容配置
    if (!hasIncompatibleConfig(parsed.params)) {
      // 没有不兼容配置，返回原样
      return vlessLine;
    }

    if (mode === 'filter') {
      // 过滤模式：返回 null（不包含此节点）
      console.log(`[FILTER] Removed VLESS: ${parsed.name}`);
      return null;
    }

    // remove 模式：清理不兼容字段
    cleanVlessParams(parsed.params);

    // 重新组装 URL
    return buildVlessUrl(parsed);

  } catch (error) {
    console.error(`Error processing VLESS: ${error.message}`);
    return vlessLine; // 出错时返回原样
  }
}

/**
 * 解析 VLESS URL
 */
function parseVlessUrl(url) {
  try {
    // vless://uuid@server:port?param1=value1&param2=value2#name
    const match = url.match(/^vless:\/\/([^@]+)@([^:]+):(\d+)\?([^#]*)#?(.*)$/);

    if (!match) return null;

    const [, uuid, server, port, queryString, name] = match;
    const params = {};

    // 解析查询参数
    if (queryString) {
      const pairs = queryString.split('&');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      }
    }

    return {
      uuid,
      server,
      port,
      params,
      name: decodeURIComponent(name || 'VLESS'),
    };
  } catch (error) {
    return null;
  }
}

/**
 * 检查是否有不兼容配置
 */
function hasIncompatibleConfig(params) {
  // 检查超长 encryption 字段
  if (params.encryption) {
    if (params.encryption.includes('mlkem') ||
        params.encryption.includes('plus') ||
        params.encryption.length > 100) {
      return true;
    }
  }

  // 检查 XTLS flow
  if (params.flow) {
    if (params.flow.includes('xtls') || params.flow.includes('rprx')) {
      return true;
    }
  }

  // 检查 reality
  if (params.reality) {
    return true;
  }

  return false;
}

/**
 * 清理不兼容字段
 */
function cleanVlessParams(params) {
  // 移除超长 encryption
  if (params.encryption) {
    if (params.encryption.includes('mlkem') ||
        params.encryption.includes('plus') ||
        params.encryption.length > 100) {
      delete params.encryption;
      console.log('[CLEAN] Removed encryption field');
    }
  }

  // 移除 XTLS flow
  if (params.flow) {
    if (params.flow.includes('xtls') || params.flow.includes('rprx')) {
      delete params.flow;
      console.log('[CLEAN] Removed flow field');
    }
  }

  // 移除 reality
  if (params.reality) {
    delete params.reality;
    console.log('[CLEAN] Removed reality field');
  }
}

/**
 * 重新组装 VLESS URL
 */
function buildVlessUrl(parsed) {
  // 构建查询参数
  const queryParts = [];
  for (const [key, value] of Object.entries(parsed.params)) {
    queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }

  const queryString = queryParts.length > 0 ? '?' + queryParts.join('&') : '';
  const nameHash = parsed.name ? '#' + encodeURIComponent(parsed.name) : '';

  return `vless://${parsed.uuid}@${parsed.server}:${parsed.port}${queryString}${nameHash}`;
}

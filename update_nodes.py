#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动更新免费节点配置文件
从多个源获取配置并保存
"""

import requests
import yaml
import json
import base64
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

# 配置
SOURCES_FILE = "node.txt"
OUTPUT_DIR = "data"
TIMEOUT = 30

def read_sources():
    """从配置文件读取节点源"""
    sources_file = Path(SOURCES_FILE)
    if not sources_file.exists():
        print(f"❌ 未找到配置文件: {SOURCES_FILE}")
        return []
    
    with open(sources_file, 'r', encoding='utf-8') as f:
        sources = [line.strip() for line in f if line.strip() and line.startswith('http')]
    
    print(f"📋 找到 {len(sources)} 个配置源")
    return sources

def download_config(url):
    """下载配置文件"""
    try:
        print(f"⬇️  正在下载: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
        print(f"✅ 下载成功: {len(response.text)} 字节")
        return response.text
    except requests.exceptions.Timeout:
        print(f"⏱️  下载超时: {url}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"❌ 下载失败: {str(e)}")
        return None

def is_clash_config(content):
    """判断是否为 Clash 配置"""
    try:
        data = yaml.safe_load(content)
        return isinstance(data, dict) and ('proxies' in data or 'proxy-groups' in data)
    except:
        return False

def is_base64_config(content):
    """判断是否为 Base64 编码的配置"""
    try:
        # 尝试解码
        decoded = base64.b64decode(content.strip())
        decoded_str = decoded.decode('utf-8')
        # 检查是否包含常见的代理协议
        return any(protocol in decoded_str for protocol in ['vmess://', 'vless://', 'ss://', 'trojan://'])
    except:
        return False

def save_config(content, filename):
    """保存配置文件"""
    output_path = Path(OUTPUT_DIR) / filename
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 已保存: {filename}")

def process_config(content, index, url):
    """处理并保存配置文件"""
    if not content:
        return None
    
    # 判断配置类型并保存
    if is_clash_config(content):
        filename = f"clash_{index}.yml"
        config_type = "Clash"
    elif is_base64_config(content):
        filename = f"v2ray_{index}_base64.txt"
        config_type = "V2Ray (Base64)"
        # 同时保存解码后的版本
        try:
            decoded = base64.b64decode(content.strip()).decode('utf-8')
            save_config(decoded, f"v2ray_{index}_decoded.txt")
        except:
            pass
    elif any(protocol in content for protocol in ['vmess://', 'vless://', 'ss://', 'trojan://']):
        filename = f"v2ray_{index}.txt"
        config_type = "V2Ray"
    else:
        filename = f"config_{index}.txt"
        config_type = "Unknown"
    
    save_config(content, filename)
    
    return {
        "index": index,
        "url": url,
        "type": config_type,
        "filename": filename,
        "size": len(content),
        "download_time": datetime.now().isoformat()
    }

def merge_clash_configs(configs):
    """合并多个 Clash 配置"""
    merged = {
        'proxies': [],
        'proxy-groups': [],
        'rules': []
    }
    
    for config_file in Path(OUTPUT_DIR).glob("clash_*.yml"):
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                if isinstance(data, dict):
                    if 'proxies' in data:
                        merged['proxies'].extend(data['proxies'])
                    if 'proxy-groups' in data:
                        merged['proxy-groups'].extend(data['proxy-groups'])
                    if 'rules' in data:
                        merged['rules'].extend(data['rules'])
        except Exception as e:
            print(f"⚠️  合并配置失败 {config_file}: {str(e)}")
    
    if merged['proxies']:
        # 保存合并后的配置
        merged_file = Path(OUTPUT_DIR) / "clash_merged.yml"
        with open(merged_file, 'w', encoding='utf-8') as f:
            yaml.dump(merged, f, allow_unicode=True, sort_keys=False)
        print(f"🔗 已合并 {len(merged['proxies'])} 个代理节点到 clash_merged.yml")

def merge_v2ray_configs():
    """合并多个 V2Ray 配置"""
    all_nodes = []
    
    for config_file in Path(OUTPUT_DIR).glob("v2ray_*.txt"):
        if 'merged' in config_file.name:
            continue
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                # 按行分割节点
                nodes = [line.strip() for line in content.split('\n') if line.strip()]
                all_nodes.extend(nodes)
        except Exception as e:
            print(f"⚠️  读取配置失败 {config_file}: {str(e)}")
    
    if all_nodes:
        # 去重
        unique_nodes = list(set(all_nodes))
        merged_file = Path(OUTPUT_DIR) / "v2ray_merged.txt"
        with open(merged_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(unique_nodes))
        print(f"🔗 已合并 {len(unique_nodes)} 个节点到 v2ray_merged.txt")

def generate_report(results):
    """生成更新报告"""
    report = {
        "last_update": datetime.now().isoformat(),
        "total_sources": len(results),
        "successful": sum(1 for r in results if r is not None),
        "failed": sum(1 for r in results if r is None),
        "configs": [r for r in results if r is not None]
    }
    
    report_file = Path(OUTPUT_DIR) / "update_report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n📊 更新报告:")
    print(f"   总源数: {report['total_sources']}")
    print(f"   成功: {report['successful']}")
    print(f"   失败: {report['failed']}")
    
    return report

def main():
    """主函数"""
    print("="*50)
    print(f"🚀 开始更新节点配置")
    print(f"⏰ 时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*50)
    
    # 读取配置源
    sources = read_sources()
    if not sources:
        print("❌ 没有可用的配置源")
        return
    
    # 下载并处理配置
    results = []
    for i, url in enumerate(sources, 1):
        print(f"\n[{i}/{len(sources)}] 处理中...")
        content = download_config(url)
        result = process_config(content, i, url)
        results.append(result)
    
    # 合并配置
    print(f"\n{'='*50}")
    print("🔗 开始合并配置文件...")
    merge_clash_configs(results)
    merge_v2ray_configs()
    
    # 生成报告
    print(f"\n{'='*50}")
    generate_report(results)
    
    print(f"\n{'='*50}")
    print("✅ 所有任务完成！")
    print(f"📁 配置文件保存在: {OUTPUT_DIR}/")
    print("="*50)

if __name__ == "__main__":
    main()


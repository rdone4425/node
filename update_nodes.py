#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动更新免费节点配置文件
从 node.txt 读取 URL，下载内容并写入新文件
"""

import requests
import yaml
import base64
from datetime import datetime
from pathlib import Path

# 配置
SOURCES_FILE = "node.txt"
OUTPUT_FILE = "node_content.txt"
OUTPUT_DIR = "."
TIMEOUT = 30

def read_sources():
    """从 node.txt 读取节点源 URL"""
    sources_file = Path(SOURCES_FILE)
    if not sources_file.exists():
        print(f"❌ 未找到配置文件: {SOURCES_FILE}")
        return []
    
    with open(sources_file, 'r', encoding='utf-8') as f:
        sources = [line.strip() for line in f if line.strip() and line.startswith('http')]
    
    print(f"📋 找到 {len(sources)} 个配置源")
    return sources

def download_config(url):
    """下载配置文件内容"""
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

def extract_content(content):
    """提取并处理内容"""
    if not content:
        return None
    
    # 尝试解码 Base64
    try:
        decoded = base64.b64decode(content.strip()).decode('utf-8')
        # 如果解码成功且包含节点信息，返回解码后的内容
        if any(protocol in decoded for protocol in ['vmess://', 'vless://', 'ss://', 'trojan://', 'http://', 'https://']):
            return decoded
    except:
        pass
    
    # 如果是 YAML 格式（Clash 配置）
    try:
        data = yaml.safe_load(content)
        if isinstance(data, dict) and 'proxies' in data:
            # 提取 proxies 部分
            return yaml.dump(data['proxies'], allow_unicode=True, sort_keys=False)
    except:
        pass
    
    # 直接返回原始内容
    return content

def main():
    """主函数"""
    print("="*60)
    print(f"🚀 开始从 {SOURCES_FILE} 提取内容")
    print(f"⏰ 时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # 读取配置源
    sources = read_sources()
    if not sources:
        print("❌ 没有可用的配置源")
        return
    
    # 存储所有下载的内容
    all_contents = []
    success_count = 0
    fail_count = 0
    
    # 下载并提取内容
    for i, url in enumerate(sources, 1):
        print(f"\n{'─'*60}")
        print(f"[{i}/{len(sources)}] 处理: {url}")
        
        content = download_config(url)
        
        if content:
            extracted = extract_content(content)
            if extracted:
                all_contents.append(f"# 来源 {i}: {url}")
                all_contents.append(f"# 下载时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                all_contents.append(f"# 内容大小: {len(extracted)} 字节")
                all_contents.append("")
                all_contents.append(extracted)
                all_contents.append("")
                all_contents.append("="*60)
                all_contents.append("")
                success_count += 1
                print(f"✅ 内容提取成功")
            else:
                fail_count += 1
                print(f"⚠️  内容提取失败")
        else:
            fail_count += 1
    
    # 写入到新文件
    if all_contents:
        output_path = Path(OUTPUT_FILE)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(all_contents))
        
        print(f"\n{'='*60}")
        print(f"📊 统计信息:")
        print(f"   总源数: {len(sources)}")
        print(f"   成功: {success_count}")
        print(f"   失败: {fail_count}")
        print(f"\n💾 所有内容已写入: {OUTPUT_FILE}")
        print(f"📄 文件大小: {output_path.stat().st_size} 字节")
        print("="*60)
    else:
        print("\n❌ 没有成功提取任何内容")

if __name__ == "__main__":
    main()


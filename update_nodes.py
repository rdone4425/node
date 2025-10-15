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
OUTPUT_DIR = "output"
OUTPUT_FILE = f"{OUTPUT_DIR}/node_content.txt"
CLASH_OUTPUT_FILE = f"{OUTPUT_DIR}/clash.yml"
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

def is_clash_config(content):
    """判断是否为 Clash 配置"""
    try:
        data = yaml.safe_load(content)
        return isinstance(data, dict) and ('proxies' in data or 'proxy-groups' in data)
    except:
        return False

def extract_content(content):
    """提取并处理内容"""
    if not content:
        return None, None
    
    clash_data = None
    
    # 如果是 YAML 格式（Clash 配置）
    if is_clash_config(content):
        try:
            clash_data = yaml.safe_load(content)
        except:
            pass
    
    # 尝试解码 Base64
    try:
        decoded = base64.b64decode(content.strip()).decode('utf-8')
        # 如果解码成功且包含节点信息，返回解码后的内容
        if any(protocol in decoded for protocol in ['vmess://', 'vless://', 'ss://', 'trojan://', 'http://', 'https://']):
            return decoded, clash_data
    except:
        pass
    
    # 直接返回原始内容
    return content, clash_data

def merge_clash_configs(clash_configs):
    """合并所有 Clash 配置"""
    if not clash_configs:
        return None
    
    # 创建合并后的配置结构
    merged = {
        'proxies': [],
        'proxy-groups': [
            {
                'name': 'auto',
                'type': 'url-test',
                'proxies': [],
                'url': 'http://www.gstatic.com/generate_204',
                'interval': 300
            },
            {
                'name': 'PROXY',
                'type': 'select',
                'proxies': ['auto']
            }
        ],
        'rules': [
            'MATCH,PROXY'
        ]
    }
    
    proxy_names = []
    
    # 合并所有代理节点
    for clash_data in clash_configs:
        if 'proxies' in clash_data and isinstance(clash_data['proxies'], list):
            for proxy in clash_data['proxies']:
                if isinstance(proxy, dict) and 'name' in proxy:
                    # 确保节点名称唯一
                    original_name = proxy['name']
                    name = original_name
                    counter = 1
                    while name in proxy_names:
                        name = f"{original_name}_{counter}"
                        counter += 1
                    
                    proxy['name'] = name
                    proxy_names.append(name)
                    merged['proxies'].append(proxy)
    
    # 更新代理组
    if proxy_names:
        merged['proxy-groups'][0]['proxies'] = proxy_names.copy()
        merged['proxy-groups'][1]['proxies'].insert(0, 'auto')
        merged['proxy-groups'][1]['proxies'].extend(proxy_names)
    
    return merged

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
    clash_configs = []
    success_count = 0
    fail_count = 0
    
    # 下载并提取内容
    for i, url in enumerate(sources, 1):
        print(f"\n{'─'*60}")
        print(f"[{i}/{len(sources)}] 处理: {url}")
        
        content = download_config(url)
        
        if content:
            extracted, clash_data = extract_content(content)
            
            if extracted:
                # 收集 Clash 配置
                if clash_data:
                    clash_configs.append(clash_data)
                    print(f"📦 发现 Clash 配置 - 将写入 clash.yml")
                else:
                    # 只有非 Clash 内容才写入 node_content.txt（纯内容，无注释）
                    all_contents.append(extracted)
                    print(f"✅ 内容已加入 node_content.txt")
                
                success_count += 1
            else:
                fail_count += 1
                print(f"⚠️  内容提取失败")
        else:
            fail_count += 1
    
    # 确保输出目录存在
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    
    # 写入所有内容到 node_content.txt（合并为一个文件，按行分隔）
    if all_contents:
        output_path = Path(OUTPUT_FILE)
        # 合并所有内容，每个内容的行合并在一起
        all_lines = []
        for content in all_contents:
            lines = content.strip().split('\n')
            all_lines.extend(lines)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(all_lines))
        print(f"\n💾 所有内容已写入: {OUTPUT_FILE} ({output_path.stat().st_size} 字节)")
    
    # 合并并保存 Clash 配置
    if clash_configs:
        print(f"\n{'─'*60}")
        print(f"🔗 开始合并 Clash 配置...")
        merged_clash = merge_clash_configs(clash_configs)
        
        if merged_clash and merged_clash['proxies']:
            clash_path = Path(CLASH_OUTPUT_FILE)
            with open(clash_path, 'w', encoding='utf-8') as f:
                yaml.dump(merged_clash, f, allow_unicode=True, sort_keys=False)
            
            print(f"✅ Clash 配置已合并")
            print(f"   节点总数: {len(merged_clash['proxies'])}")
            print(f"   文件大小: {clash_path.stat().st_size} 字节")
            print(f"   保存位置: {CLASH_OUTPUT_FILE}")
        else:
            print(f"⚠️  没有找到有效的 Clash 节点")
    
    # 统计信息
    print(f"\n{'='*60}")
    print(f"📊 统计信息:")
    print(f"   总源数: {len(sources)}")
    print(f"   成功: {success_count}")
    print(f"   失败: {fail_count}")
    print(f"   Clash 配置: {len(clash_configs)} 个")
    print("="*60)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动更新免费节点配置文件
从 node.txt 读取 URL，下载内容并写入新文件
"""

import requests
import yaml
import base64
import os
import time
import argparse
from datetime import datetime
from pathlib import Path

# 配置
SOURCES_FILE = "node.txt"
OUTPUT_DIR = "output"
TIMEOUT = 30
MAX_RETRIES = 3  # 最大重试次数
RETRY_DELAY = 2  # 重试延迟（秒）
GITHUB_REPO = os.getenv('GITHUB_REPOSITORY', 'your-username/your-repo')  # 从环境变量获取
SUBSCRIPTION_FILE = "subscription.yaml"  # 订阅列表文件

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

def download_config(url, retries=MAX_RETRIES):
    """下载配置文件内容（带重试机制）"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    for attempt in range(retries):
        try:
            if attempt > 0:
                print(f"🔄 重试 {attempt}/{retries-1}: {url}")
            else:
                print(f"⬇️  正在下载: {url}")
            
            response = requests.get(url, headers=headers, timeout=TIMEOUT)
            response.raise_for_status()
            print(f"✅ 下载成功: {len(response.text)} 字节")
            return response.text
            
        except requests.exceptions.Timeout:
            print(f"⏱️  下载超时 (尝试 {attempt + 1}/{retries})")
            if attempt < retries - 1:
                time.sleep(RETRY_DELAY)
        except requests.exceptions.RequestException as e:
            print(f"❌ 下载失败 (尝试 {attempt + 1}/{retries}): {str(e)}")
            if attempt < retries - 1:
                time.sleep(RETRY_DELAY)
    
    print(f"💥 达到最大重试次数，下载失败")
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
        except Exception as e:
            print(f"   ⚠️  Clash 配置解析失败: {str(e)}")
    
    # 尝试解码 Base64
    try:
        decoded = base64.b64decode(content.strip()).decode('utf-8')
        # 如果解码成功且包含节点信息，返回解码后的内容
        if any(protocol in decoded for protocol in ['vmess://', 'vless://', 'ss://', 'trojan://', 'http://', 'https://']):
            return decoded, clash_data
    except Exception:
        pass
    
    # 直接返回原始内容
    return content, clash_data

def deduplicate_nodes(content):
    """去除重复节点"""
    lines = content.strip().split('\n')
    unique_lines = []
    seen = set()
    
    for line in lines:
        line = line.strip()
        if line and line not in seen:
            seen.add(line)
            unique_lines.append(line)
    
    removed = len(lines) - len(unique_lines)
    if removed > 0:
        print(f"   🔄 去重: 移除 {removed} 个重复节点")
    
    return '\n'.join(unique_lines)

def validate_node(line):
    """验证节点格式是否正确"""
    protocols = ['vmess://', 'vless://', 'ss://', 'ssr://', 'trojan://', 'http://', 'https://']
    return any(line.startswith(protocol) for protocol in protocols)

def count_valid_nodes(content):
    """统计有效节点数量"""
    lines = content.strip().split('\n')
    valid_count = sum(1 for line in lines if validate_node(line.strip()))
    return valid_count

def save_clash_config(clash_data, index):
    """保存单个 Clash 配置文件"""
    filename = f"clash_{index}.yml"
    filepath = Path(OUTPUT_DIR) / filename
    
    with open(filepath, 'w', encoding='utf-8') as f:
        yaml.dump(clash_data, f, allow_unicode=True, sort_keys=False)
    
    proxy_count = len(clash_data.get('proxies', []))
    print(f"   💾 已保存: {filename} ({proxy_count} 个节点)")
    return filename

def save_v2ray_content(content, index):
    """保存单个 V2Ray 等其他节点文件"""
    filename = f"node_{index}.txt"
    filepath = Path(OUTPUT_DIR) / filename
    
    # 去重
    content = deduplicate_nodes(content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # 统计有效节点
    valid_count = count_valid_nodes(content)
    total_count = len(content.strip().split('\n'))
    
    print(f"   💾 已保存: {filename} (共 {total_count} 行，有效节点 {valid_count} 个)")
    return filename

def generate_subscription_list(clash_files, v2ray_files):
    """生成订阅列表文件"""
    print(f"\n{'─'*60}")
    print("📝 正在生成订阅列表文件...")
    
    # 生成所有文件的 GitHub raw URL
    sub_urls = []
    base_url = f"https://raw.githubusercontent.com/{GITHUB_REPO}/main/{OUTPUT_DIR}"
    
    # 添加 Clash 配置文件 URL
    for filename in sorted(clash_files):
        url = f"{base_url}/{filename}"
        sub_urls.append(url)
    
    # 添加 V2Ray 等节点文件 URL
    for filename in sorted(v2ray_files):
        url = f"{base_url}/{filename}"
        sub_urls.append(url)
    
    # 创建订阅列表数据
    subscription_data = {
        'sub-urls': sub_urls
    }
    
    # 保存到文件
    subscription_path = Path(SUBSCRIPTION_FILE)
    with open(subscription_path, 'w', encoding='utf-8') as f:
        yaml.dump(subscription_data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
    
    print(f"✅ 订阅列表已生成: {SUBSCRIPTION_FILE}")
    print(f"   包含 {len(sub_urls)} 个订阅链接")
    print(f"\n📋 订阅列表内容:")
    print(f"   仓库: {GITHUB_REPO}")
    print(f"   Clash 配置: {len(clash_files)} 个")
    print(f"   V2Ray 节点: {len(v2ray_files)} 个")
    
    return subscription_path

def parse_args():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='自动更新免费节点配置文件')
    parser.add_argument('-s', '--sources', default=SOURCES_FILE, 
                        help=f'节点源文件路径 (默认: {SOURCES_FILE})')
    parser.add_argument('-o', '--output', default=OUTPUT_DIR, 
                        help=f'输出目录 (默认: {OUTPUT_DIR})')
    parser.add_argument('-r', '--repo', default=GITHUB_REPO, 
                        help=f'GitHub 仓库 (格式: username/repo)')
    parser.add_argument('--no-subscription', action='store_true',
                        help='不生成订阅列表文件')
    return parser.parse_args()

def main():
    """主函数"""
    # 解析命令行参数
    args = parse_args()
    
    # 更新全局配置
    global SOURCES_FILE, OUTPUT_DIR, GITHUB_REPO
    SOURCES_FILE = args.sources
    OUTPUT_DIR = args.output
    GITHUB_REPO = args.repo
    
    print("="*60)
    print(f"🚀 开始从 {SOURCES_FILE} 提取内容")
    print(f"⏰ 时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📂 输出目录: {OUTPUT_DIR}")
    print(f"📦 仓库地址: {GITHUB_REPO}")
    print("="*60)
    
    # 读取配置源
    sources = read_sources()
    if not sources:
        print("❌ 没有可用的配置源")
        return
    
    # 确保输出目录存在
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    
    # 统计
    success_count = 0
    fail_count = 0
    clash_files = []
    v2ray_files = []
    
    # 下载并保存内容（每个源单独保存）
    for i, url in enumerate(sources, 1):
        print(f"\n{'─'*60}")
        print(f"[{i}/{len(sources)}] 处理: {url}")
        
        content = download_config(url)
        
        if content:
            extracted, clash_data = extract_content(content)
            
            if extracted:
                # 保存 Clash 配置
                if clash_data:
                    print(f"📦 发现 Clash 配置")
                    filename = save_clash_config(clash_data, i)
                    clash_files.append(filename)
                else:
                    # 保存 V2Ray 等其他节点
                    print(f"📝 发现其他节点")
                    filename = save_v2ray_content(extracted, i)
                    v2ray_files.append(filename)
                
                success_count += 1
            else:
                fail_count += 1
                print(f"⚠️  内容提取失败")
        else:
            fail_count += 1
    
    # 统计信息
    print(f"\n{'='*60}")
    print(f"📊 统计信息:")
    print(f"   总源数: {len(sources)}")
    print(f"   成功: {success_count}")
    print(f"   失败: {fail_count}")
    
    if clash_files:
        print(f"\n📁 Clash 配置文件 ({len(clash_files)} 个):")
        for filename in clash_files:
            print(f"   - {OUTPUT_DIR}/{filename}")
    
    if v2ray_files:
        print(f"\n📁 V2Ray 等节点文件 ({len(v2ray_files)} 个):")
        for filename in v2ray_files:
            print(f"   - {OUTPUT_DIR}/{filename}")
    
    # 生成订阅列表文件
    if not args.no_subscription and (clash_files or v2ray_files):
        generate_subscription_list(clash_files, v2ray_files)
    
    print("="*60)
    print("✨ 更新完成！")
    
    # 显示使用提示
    if clash_files or v2ray_files:
        print(f"\n💡 使用提示:")
        print(f"   1. 查看输出文件: {OUTPUT_DIR}/")
        if not args.no_subscription:
            print(f"   2. 订阅列表文件: {SUBSCRIPTION_FILE}")
            print(f"   3. 可直接导入订阅转换工具使用")

if __name__ == "__main__":
    main()
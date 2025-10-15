#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动更新免费节点配置文件
从多个源获取配置并保存
"""

import requests
import yaml
import json
from datetime import datetime
from pathlib import Path

# 配置源列表（从 1.txt 读取）
def read_sources():
    """从 1.txt 读取配置源"""
    sources_file = Path("1.txt")
    if sources_file.exists():
        with open(sources_file, 'r', encoding='utf-8') as f:
            return [line.strip() for line in f if line.strip() and line.startswith('http')]
    return []

def download_config(url):
    """下载配置文件"""
    try:
        print(f"正在下载: {url}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"下载失败 {url}: {str(e)}")
        return None

def save_clash_config(content, filename="data/clash.yml"):
    """保存 Clash 配置"""
    output_path = Path(filename)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"已保存: {filename}")

def save_v2ray_config(content, filename="data/v2ray.txt"):
    """保存 V2Ray 配置"""
    output_path = Path(filename)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"已保存: {filename}")

def merge_configs(configs):
    """合并多个配置（可选功能）"""
    # 这里可以添加合并逻辑
    pass

def main():
    """主函数"""
    print(f"开始更新节点配置 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    sources = read_sources()
    
    if not sources:
        print("警告: 未找到配置源")
        return
    
    for i, url in enumerate(sources):
        content = download_config(url)
        
        if content:
            # 根据 URL 判断配置类型
            if 'clash' in url.lower():
                save_clash_config(content, f"data/clash_{i+1}.yml")
            elif 'v2ray' in url.lower():
                save_v2ray_config(content, f"data/v2ray_{i+1}.txt")
            else:
                # 默认保存为文本
                save_v2ray_config(content, f"data/config_{i+1}.txt")
    
    # 生成更新信息
    update_info = {
        "last_update": datetime.now().isoformat(),
        "sources_count": len(sources),
        "status": "success"
    }
    
    with open("data/update_info.json", 'w', encoding='utf-8') as f:
        json.dump(update_info, f, indent=2, ensure_ascii=False)
    
    print("✅ 更新完成！")

if __name__ == "__main__":
    main()


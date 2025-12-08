#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cloudflare DNS记录获取工具
通过Cloudflare API自动获取所有域名的DNS记录和子域名
"""

import requests
import json
import os
import sys
from datetime import datetime


class CloudflareAPI:
    def __init__(self, api_token):
        self.api_token = api_token
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

    def _request(self, url, params=None):
        """通用请求方法"""
        all_results = []
        page = 1
        
        while True:
            p = params.copy() if params else {}
            p.update({"page": page, "per_page": 100})
            
            try:
                response = requests.get(url, headers=self.headers, params=p, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                if not data.get("success"):
                    return None
                
                all_results.extend(data.get("result", []))
                
                if page >= data.get("result_info", {}).get("total_pages", 1):
                    break
                page += 1
                
            except Exception as e:
                print(f"Error: {e}")
                return None
        
        return all_results

    def get_zones(self):
        """获取所有域名"""
        return self._request(f"{self.base_url}/zones")

    def get_dns_records(self, zone_id):
        """获取DNS记录"""
        return self._request(f"{self.base_url}/zones/{zone_id}/dns_records")


def main():
    # 获取API Token
    api_token = os.getenv('CLOUDFLARE_API_TOKEN', '').strip()
    
    if not api_token:
        print("Error: CLOUDFLARE_API_TOKEN not set")
        return 1

    print("Fetching Cloudflare DNS records...")
    
    # 初始化API
    cf = CloudflareAPI(api_token)
    
    # 获取所有域名
    zones = cf.get_zones()
    if not zones:
        print("No zones found")
        return 1
    
    print(f"Found {len(zones)} zones")
    
    # 收集所有子域名
    all_subdomains = set()
    domain_results = {}
    
    for zone in zones:
        zone_name = zone['name']
        print(f"Processing: {zone_name}")
        
        dns_records = cf.get_dns_records(zone['id'])
        if dns_records:
            subdomains = sorted(set(r.get('name', '') for r in dns_records if r.get('name')))
            domain_results[zone_name] = subdomains
            all_subdomains.update(subdomains)
            print(f"  Found {len(subdomains)} subdomains")
    
    # 保存结果
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # 按域名保存
    for domain, subdomains in domain_results.items():
        filename = f"subdomains_{domain.replace('.', '_')}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"# Domain: {domain}\n")
            f.write(f"# Count: {len(subdomains)}\n")
            f.write(f"# Time: {timestamp}\n\n")
            f.write('\n'.join(subdomains))
        print(f"Saved: {filename}")
    
    # 保存合并文件
    if len(zones) > 1:
        filename = "subdomains_all.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"# Total: {len(all_subdomains)} subdomains\n")
            f.write(f"# Time: {timestamp}\n\n")
            f.write('\n'.join(sorted(all_subdomains)))
        print(f"Saved: {filename}")
    
    print(f"\nDone! {len(zones)} zones, {len(all_subdomains)} subdomains")
    return 0


if __name__ == "__main__":
    sys.exit(main())

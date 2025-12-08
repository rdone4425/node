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
        """
        初始化Cloudflare API客户端

        参数:
            api_token: Cloudflare API Token
        """
        self.api_token = api_token
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

        # 配置会话
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.session.verify = True

    def get_all_zones(self):
        """
        获取当前API Token有权限访问的所有Zone

        返回:
            zones: Zone列表 [{id, name}, ...], 失败返回None
        """
        url = f"{self.base_url}/zones"
        all_zones = []
        page = 1
        per_page = 50

        try:
            params = {
                "page": page,
                "per_page": per_page
            }

            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            if not data["success"]:
                errors = data.get('errors', [])
                if errors:
                    error_msg = errors[0].get('message', '未知错误')
                    print(f"API错误: {error_msg}")
                return None

            zones = data["result"]
            all_zones.extend(zones)

            # 检查是否还有更多页
            total_pages = data["result_info"]["total_pages"]

            # 获取剩余页面
            for page in range(2, total_pages + 1):
                params["page"] = page
                response = self.session.get(url, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()

                if data["success"]:
                    all_zones.extend(data["result"])

        except requests.exceptions.HTTPError as e:
            print(f"HTTP错误: {e}")
            print(f"状态码: {response.status_code}")
            if response.status_code == 403:
                print("权限不足: 请确保Token有 Zone > Zone > Read 权限")
            return None
        except requests.exceptions.RequestException as e:
            print(f"网络错误: {e}")
            return None

        return all_zones

    def get_all_dns_records(self, zone_id):
        """
        获取Zone下的所有DNS记录

        参数:
            zone_id: Zone ID

        返回:
            records: DNS记录列表
        """
        url = f"{self.base_url}/zones/{zone_id}/dns_records"
        all_records = []
        page = 1
        per_page = 100

        while True:
            params = {
                "page": page,
                "per_page": per_page
            }

            try:
                response = self.session.get(url, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()

                if not data["success"]:
                    break

                records = data["result"]
                all_records.extend(records)

                # 检查是否还有更多页
                total_pages = data["result_info"]["total_pages"]
                if page >= total_pages:
                    break

                page += 1

            except requests.exceptions.RequestException:
                break

        return all_records


def extract_subdomains(dns_records):
    """
    从DNS记录中提取所有子域名

    参数:
        dns_records: DNS记录列表

    返回:
        subdomains: 排序后的唯一子域名列表
    """
    subdomains = set()

    for record in dns_records:
        name = record.get("name", "")
        if name:
            subdomains.add(name)

    return sorted(list(subdomains))


def save_to_single_file(subdomains, filename='subdomains.txt'):
    """
    保存所有子域名到单个文件

    参数:
        subdomains: 子域名列表
        filename: 输出文件名
    """
    with open(filename, 'w', encoding='utf-8') as f:
        for subdomain in subdomains:
            f.write(f"{subdomain}\n")


def save_by_domain(domain_results, base_filename='subdomains'):
    """
    按域名分别保存子域名

    参数:
        domain_results: 字典 {域名: 子域名列表}
        base_filename: 基础文件名
    """
    for domain, subdomains in domain_results.items():
        # 将域名转换为安全的文件名
        safe_domain = domain.replace(':', '_').replace('/', '_')
        filename = f"{base_filename}_{safe_domain}.txt"

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"# 域名: {domain}\n")
            f.write(f"# 子域名数量: {len(subdomains)}\n")
            f.write(f"# 获取时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            for subdomain in subdomains:
                f.write(f"{subdomain}\n")


def main():
    # 获取API Token
    api_token = None

    # 优先从环境变量读取
    env_token = os.getenv('CLOUDFLARE_API_TOKEN', '').strip()

    if env_token:
        api_token = env_token
    # 检查是否从命令行提供
    elif len(sys.argv) > 1 and sys.argv[1] != '--':
        api_token = sys.argv[1]
    else:
        # 交互式输入
        print("请输入Cloudflare API Token:")
        api_token = input("Token: ").strip()

        if not api_token:
            print("未提供API Token")
            return

    if not api_token:
        return

    # 初始化API客户端
    cf = CloudflareAPI(api_token)

    # 自动获取所有Zone
    zones = cf.get_all_zones()

    if not zones:
        print("未找到任何域名")
        return

    # 存储每个域名的结果
    domain_results = {}
    all_subdomains = set()

    # 遍历每个Zone获取DNS记录
    for zone in zones:
        zone_id = zone['id']
        zone_name = zone['name']

        # 直接使用zone_id获取DNS记录
        dns_records = cf.get_all_dns_records(zone_id)

        if dns_records:
            subdomains = extract_subdomains(dns_records)
            domain_results[zone_name] = subdomains
            all_subdomains.update(subdomains)

    if domain_results:
        # 按域名分别保存
        base_filename = 'subdomains'
        if len(sys.argv) > 2:
            base_filename = sys.argv[2].replace('.txt', '')

        save_by_domain(domain_results, base_filename)

        # 如果有多个域名,也保存一个合并文件
        if len(zones) > 1:
            all_subdomains_sorted = sorted(list(all_subdomains))
            merged_file = f"{base_filename}_all.txt"
            save_to_single_file(all_subdomains_sorted, merged_file)

        print(f"完成! 共 {len(zones)} 个域名, {len(all_subdomains)} 个子域名")


if __name__ == "__main__":
    main()

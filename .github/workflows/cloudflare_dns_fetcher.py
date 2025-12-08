#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cloudflare DNS记录获取工具
通过Cloudflare API获取域名的所有DNS记录和子域名,输出到单个文件
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

    def get_zone_id(self, domain):
        """
        获取域名的Zone ID

        参数:
            domain: 域名

        返回:
            zone_id: Zone ID
        """
        url = f"{self.base_url}/zones"
        params = {"name": domain}

        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            if data["success"] and len(data["result"]) > 0:
                zone_id = data["result"][0]["id"]
                zone_name = data["result"][0]["name"]
                print(f"✓ 找到Zone: {zone_name} (ID: {zone_id})")
                return zone_id
            else:
                print(f"✗ 未找到域名: {domain}")
                return None

        except requests.exceptions.RequestException as e:
            print(f"✗ API请求失败: {e}")
            return None

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

        print(f"\n正在获取DNS记录...")

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
                    print(f"✗ 获取失败: {data.get('errors', 'Unknown error')}")
                    break

                records = data["result"]
                all_records.extend(records)

                print(f"  第 {page} 页: {len(records)} 条记录")

                # 检查是否还有更多页
                total_pages = data["result_info"]["total_pages"]
                if page >= total_pages:
                    break

                page += 1

            except requests.exceptions.RequestException as e:
                print(f"✗ API请求失败: {e}")
                break

        print(f"\n✓ 总共获取 {len(all_records)} 条DNS记录")
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

    print(f"\n✓ 已保存 {len(subdomains)} 个子域名到: {filename}")


def process_single_token(api_token, domain):
    """
    处理单个API Token,获取域名记录

    参数:
        api_token: API Token
        domain: 目标域名

    返回:
        subdomains: 子域名列表,失败返回None
    """
    # 初始化API客户端
    cf = CloudflareAPI(api_token)

    # 获取Zone ID
    zone_id = cf.get_zone_id(domain)

    if not zone_id:
        print(f"  ✗ 无法找到域名 {domain}")
        return None

    # 获取所有DNS记录
    dns_records = cf.get_all_dns_records(zone_id)

    if not dns_records:
        print(f"  ✗ 未找到任何DNS记录")
        return None

    # 提取子域名
    subdomains = extract_subdomains(dns_records)
    return subdomains


def main():
    print("=" * 80)
    print("Cloudflare DNS记录获取工具 (支持多Token)")
    print("=" * 80)

    # 获取API Tokens
    api_tokens = []

    # 优先从环境变量读取 (适合GitHub Actions)
    env_tokens = os.getenv('CLOUDFLARE_API_TOKENS', '').strip()

    if env_tokens:
        # 环境变量中的tokens用逗号分隔
        api_tokens = [t.strip() for t in env_tokens.split(',') if t.strip()]
        print(f"\n✓ 从环境变量 CLOUDFLARE_API_TOKENS 读取了 {len(api_tokens)} 个Token")
    # 检查是否从命令行提供
    elif len(sys.argv) > 1 and sys.argv[1] != '--':
        # 单个token或逗号分隔的多个tokens
        token_input = sys.argv[1]
        if ',' in token_input:
            api_tokens = [t.strip() for t in token_input.split(',') if t.strip()]
            print(f"\n✓ 从命令行参数读取了 {len(api_tokens)} 个Token")
        else:
            api_tokens.append(token_input)
            print(f"\n✓ 从命令行参数读取API Token")
    else:
        # 交互式输入多个tokens
        print("\n请输入Cloudflare API Token(s):")
        print("(在 https://dash.cloudflare.com/profile/api-tokens 创建)")
        print("权限需要: Zone > DNS > Read, Zone > Zone > Read")
        print("\n支持多个Token:")
        print("  1. 输入单个Token并回车")
        print("  2. 输入多个Token,用逗号分隔: token1,token2,token3")
        print("  3. 从文件读取,输入: file:tokens.txt (每行一个token)")
        print("  4. 环境变量: 设置 CLOUDFLARE_API_TOKENS=token1,token2")

        user_input = input("\nAPI Token(s): ").strip()

        if not user_input:
            print("✗ 未提供API Token")
            print("\n使用方法:")
            print("  1. 环境变量: export CLOUDFLARE_API_TOKENS=token1,token2,token3")
            print("  2. 命令行: python cloudflare_dns_fetcher.py <TOKEN>")
            print("  3. 命令行多Token: python cloudflare_dns_fetcher.py <TOKEN1,TOKEN2,TOKEN3>")
            print("  4. 或直接运行程序后输入Token")
            return

        # 检查是否从文件读取
        if user_input.startswith('file:'):
            token_file = user_input[5:].strip()
            try:
                with open(token_file, 'r', encoding='utf-8') as f:
                    api_tokens = [line.strip() for line in f if line.strip() and not line.strip().startswith('#')]
                print(f"✓ 从文件 {token_file} 读取了 {len(api_tokens)} 个Token")
            except FileNotFoundError:
                print(f"✗ 文件 {token_file} 不存在")
                return
            except Exception as e:
                print(f"✗ 读取文件失败: {e}")
                return
        elif ',' in user_input:
            # 逗号分隔的多个tokens
            api_tokens = [t.strip() for t in user_input.split(',') if t.strip()]
            print(f"✓ 读取了 {len(api_tokens)} 个Token")
        else:
            # 单个token
            api_tokens = [user_input]

    if not api_tokens:
        print("✗ 未提供有效的API Token")
        return

    # 目标域名 - 优先从环境变量读取
    domain = os.getenv('CLOUDFLARE_DOMAIN', 'xn--6qqu3c16e.netlib.re').strip()

    # 命令行参数可以覆盖环境变量
    domain_arg_index = 2 if len(sys.argv) > 1 and sys.argv[1] != '--' else 1
    if len(sys.argv) > domain_arg_index:
        domain = sys.argv[domain_arg_index]

    print(f"\n目标域名: {domain}")
    print(f"使用 {len(api_tokens)} 个API Token进行查询")

    # 合并所有token的结果
    all_subdomains = set()
    success_count = 0
    token_results = {}  # 记录每个token的结果,用于去重检查

    for idx, token in enumerate(api_tokens, 1):
        print("\n" + "=" * 80)
        print(f"处理Token #{idx}/{len(api_tokens)}")
        print("=" * 80)

        subdomains = process_single_token(token, domain)

        if subdomains:
            success_count += 1

            # 检查是否与之前的token结果重复
            subdomain_set = set(subdomains)
            is_duplicate = False

            for prev_idx, prev_subdomains in token_results.items():
                if subdomain_set == prev_subdomains:
                    print(f"  ⚠️  Token #{idx} 的结果与 Token #{prev_idx} 完全相同 (可能是同一账户的不同Token)")
                    is_duplicate = True
                    break

            if not is_duplicate:
                before_count = len(all_subdomains)
                all_subdomains.update(subdomains)
                new_count = len(all_subdomains) - before_count
                print(f"  ✓ Token #{idx} 获取到 {len(subdomains)} 个子域名 (新增 {new_count} 个)")
            else:
                all_subdomains.update(subdomains)
                print(f"  ✓ Token #{idx} 获取到 {len(subdomains)} 个子域名 (无新增)")

            token_results[idx] = subdomain_set
        else:
            print(f"  ✗ Token #{idx} 未能获取到数据")

    # 转换为排序列表
    final_subdomains = sorted(list(all_subdomains))

    # 显示汇总结果
    print("\n" + "=" * 80)
    print("汇总结果")
    print("=" * 80)
    print(f"成功的Token: {success_count}/{len(api_tokens)}")
    print(f"总共发现: {len(final_subdomains)} 个唯一子域名")

    if final_subdomains:
        print("\n发现的子域名:")
        for subdomain in final_subdomains:
            print(f"  {subdomain}")

        # 保存到单个文件
        print("\n" + "=" * 80)
        output_file = 'subdomains.txt'
        output_arg_index = 3 if len(sys.argv) > 1 and sys.argv[1] != '--' else 2
        if len(sys.argv) > output_arg_index:
            output_file = sys.argv[output_arg_index]

        save_to_single_file(final_subdomains, output_file)

        print("\n✓ 完成!")
        print(f"\n所有子域名已保存到: {output_file}")
    else:
        print("\n✗ 未找到任何子域名")


if __name__ == "__main__":
    main()

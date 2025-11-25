#!/bin/bash
export LANG=en_US.UTF-8

# 帮助信息
show_help() {
    cat << EOF
Cloudflare IP 优选工具

用法:
    bash cf.sh [选项]

选项:
    -4, --ipv4              仅 IPv4 优选
    -6, --ipv6              仅 IPv6 优选
    -d, --dual              IPv4 + IPv6 双栈优选
    -a, --auto              按配置文件自动运行（使用配置文件的IPV值）
    -t, --task <数量>       设置并发数 (1-1000)
    -r, --regions <国家>    筛选国家 (多个用空格分隔，如: "HK SG JP")
    -n, --top <数量>        每个国家取前N个 (0=不限)
    -u, --update-dns        优选后自动更新Cloudflare DNS
    -q, --quiet             静默模式 (仅输出关键结果)
    --clean                 清理结果文件
    -h, --help              显示此帮助信息

示例:
    bash cf.sh -a                          # 完全按配置文件运行
    bash cf.sh -4 -u                       # IPv4优选并更新DNS
    bash cf.sh -4 -r "HK" -n 5 -u          # 香港前5个并更新DNS
    bash cf.sh -a -t 200                   # 按配置文件运行，临时改并发为200
    bash cf.sh --clean                     # 清理结果文件

无参数运行将进入交互模式
EOF
    exit 0
}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/cf_data"
RESULT_DIR="$DATA_DIR/results"
RESULT_V4_DIR="$RESULT_DIR/ipv4"
RESULT_V6_DIR="$RESULT_DIR/ipv6"
CONFIG_FILE="$SCRIPT_DIR/cf_config.conf"

# 默认 GitHub 镜像源（按优先级排序）
DEFAULT_MIRRORS="https://ghgo.xyz/https://raw.githubusercontent.com https://gh.api.99988866.xyz/https://raw.githubusercontent.com https://github.moeyy.xyz/https://raw.githubusercontent.com https://gh-proxy.com/https://raw.githubusercontent.com https://ghps.cc/https://raw.githubusercontent.com https://raw.githubusercontent.com"

# 创建数据目录
mkdir -p "$DATA_DIR"
mkdir -p "$RESULT_V4_DIR"
mkdir -p "$RESULT_V6_DIR"

# 创建默认配置文件
if [ ! -f "$CONFIG_FILE" ]; then
    cat > "$CONFIG_FILE" <<'EOF'
# CF 优选配置文件
TASK=100
IPV=1

# 筛选国家（留空=所有国家，多个用空格分隔）
# 示例: REGIONS="HK"           # 只要香港
# 示例: REGIONS="HK SG JP"     # 只要香港、新加坡、日本
# 示例: REGIONS=""             # 所有国家
REGIONS=""

# 每个国家取前N个（0或留空=不限制，同时也是DNS更新的IP数量）
TOP_N=5

# Cloudflare DNS 更新配置（可选）
# 获取方式：https://dash.cloudflare.com/profile/api-tokens
CF_API_TOKEN=""           # API Token (需要DNS编辑权限)
CF_ZONE_ID=""             # Zone ID (在域名概述页面可以找到)
CF_DOMAIN=""              # 要更新的域名 (如: example.com)
# 注意：DNS记录名会自动生成，格式为 地区代码+IP版本号
#       例如：HK的IPv4会创建 hk4.example.com, HK的IPv6会创建 hk6.example.com

# Telegram 通知配置 (可选)
TG_BOT_TOKEN=""           # 机器人 Token
TG_CHAT_ID=""             # 接收通知的 Chat ID
TG_API_HOST=""            # API 代理地址 (如: tg-proxy.your-name.workers.dev)，留空使用官方 api.telegram.org
TG_PROXY=""               # HTTP/SOCKS 代理 (如: socks5://127.0.0.1:1080)，留空不使用代理

# GitHub 镜像源 (可选，取消注释以覆盖默认值)
# GITHUB_MIRRORS="https://ghgo.xyz/https://raw.githubusercontent.com https://gh.api.99988866.xyz/https://raw.githubusercontent.com https://raw.githubusercontent.com"
EOF
fi

# 加载配置
source "$CONFIG_FILE"

# 解析命令行参数
MODE=""
PARAM_TASK=""
PARAM_REGIONS=""
PARAM_TOP=""
CLEAN_ONLY=false
UPDATE_DNS=false
INTERACTIVE=true
QUIET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -4|--ipv4)
            MODE="ipv4"
            INTERACTIVE=false
            shift
            ;;
        -6|--ipv6)
            MODE="ipv6"
            INTERACTIVE=false
            shift
            ;;
        -d|--dual)
            MODE="dual"
            INTERACTIVE=false
            shift
            ;;
        -a|--auto)
            # 按配置文件的IPV值运行
            INTERACTIVE=false
            shift
            ;;
        -t|--task)
            PARAM_TASK="$2"
            shift 2
            ;;
        -r|--regions)
            PARAM_REGIONS="$2"
            shift 2
            ;;
        -n|--top)
            PARAM_TOP="$2"
            shift 2
            ;;
        -u|--update-dns)
            UPDATE_DNS=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            INTERACTIVE=false
            shift
            ;;
        --clean)
            CLEAN_ONLY=true
            INTERACTIVE=false
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 -h 或 --help 查看帮助"
            exit 1
            ;;
    esac
done

# 应用命令行参数到配置
if [ -n "$PARAM_TASK" ]; then
    TASK=$PARAM_TASK
fi
if [ -n "$PARAM_REGIONS" ]; then
    REGIONS="$PARAM_REGIONS"
fi
if [ -n "$PARAM_TOP" ]; then
    TOP_N=$PARAM_TOP
fi

# 如果没有通过命令行指定模式，根据配置文件的IPV决定
if [ "$INTERACTIVE" = false ] && [ -z "$MODE" ]; then
    case "$IPV" in
        1) MODE="ipv4" ;;
        2) MODE="ipv6" ;;
        3) MODE="dual" ;;
        *) MODE="ipv4" ;;  # 默认IPv4
    esac
fi

# 保存配置
save_config() {
    sed -i "s/^TASK=.*/TASK=$TASK/" "$CONFIG_FILE"
    sed -i "s/^IPV=.*/IPV=$IPV/" "$CONFIG_FILE"
}

# 日志函数
log() {
    if [ "$QUIET" = false ]; then
        echo "$@"
    fi
}

# Telegram 通知函数
send_notification() {
    local message="$1"
    local api_host="${TG_API_HOST:-api.telegram.org}"
    local proxy_cmd=""

    if [ -n "$TG_PROXY" ]; then
        proxy_cmd="-x $TG_PROXY"
    fi

    if [ -n "$TG_BOT_TOKEN" ] && [ -n "$TG_CHAT_ID" ]; then
        curl -s $proxy_cmd -X POST "https://${api_host}/bot${TG_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TG_CHAT_ID}" \
            -d text="${message}" \
            -d parse_mode="HTML" >/dev/null
    fi
}

# 锁文件机制
LOCK_FILE="/tmp/cf_script.lock"
if [ "$INTERACTIVE" = false ]; then
    if [ -f "$LOCK_FILE" ]; then
        pid=$(cat "$LOCK_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "⚠️  脚本正在运行中 (PID: $pid)，跳过本次执行"
            exit 0
        else
            echo "⚠️  发现无效的锁文件，自动清理"
            rm -f "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"' EXIT
fi

# 架构检测
case "$(uname -m)" in
    x86_64 | x64 | amd64 ) cpu=amd64 ;;
    i386 | i686 ) cpu=386 ;;
    armv8 | armv8l | arm64 | aarch64 ) cpu=arm64 ;;
    armv7l ) cpu=arm ;;
    mips64le ) cpu=mips64le ;;
    mips64 ) cpu=mips64 ;;
    mips | mipsle ) cpu=mipsle ;;
    * ) echo "当前架构为$(uname -m)，暂不支持" ; exit 1 ;;
esac

# 下载函数
download_file() {
    local file=$1
    local output=$2
    local github_path="yonggekkk/Cloudflare_vless_trojan/main/cf/$file"

    local github_path="yonggekkk/Cloudflare_vless_trojan/main/cf/$file"
    local mirrors="${GITHUB_MIRRORS:-$DEFAULT_MIRRORS}"

    for mirror in $mirrors; do
        if [[ "$mirror" == *"raw.githubusercontent.com"* ]] || [[ "$mirror" == *"ghproxy"* ]]; then
            url="$mirror/$github_path"
        else
            url="$mirror/https://raw.githubusercontent.com/$github_path"
        fi

        log "尝试从 $(echo $mirror | awk -F[/:] '{print $4}') 下载 $file ..."

        if curl -fL --connect-timeout 10 --max-time 60 -o "$output" "$url" 2>/dev/null; then
            if [ -s "$output" ]; then
                log "✓ 下载成功"
                return 0
            else
                rm -f "$output"
            fi
        fi
    done
    echo "✗ 下载失败"
    return 1
}

# 按国家分组统计
process_results() {
    local csv_file=$1
    local csv_type=$2

    if [ ! -f "$csv_file" ] || [ ! -s "$csv_file" ]; then
        echo "⚠️  未找到结果文件: $csv_file"
        return
    fi

    # 根据类型选择输出目录
    local output_dir
    if [ "$csv_type" = "IPv4" ]; then
        output_dir="$RESULT_V4_DIR"
    else
        output_dir="$RESULT_V6_DIR"
    fi

    echo ""
    log "================================================="
    log "正在处理 $csv_type 结果..."
    log "================================================="

    # 国家名称映射
    declare -A COUNTRY_NAMES
    COUNTRY_NAMES[SG]="新加坡" COUNTRY_NAMES[HK]="香港" COUNTRY_NAMES[JP]="日本"
    COUNTRY_NAMES[KR]="韩国" COUNTRY_NAMES[TW]="台湾" COUNTRY_NAMES[US]="美国"
    COUNTRY_NAMES[CA]="加拿大" COUNTRY_NAMES[GB]="英国" COUNTRY_NAMES[DE]="德国"
    COUNTRY_NAMES[FR]="法国" COUNTRY_NAMES[NL]="荷兰" COUNTRY_NAMES[IN]="印度"
    COUNTRY_NAMES[TH]="泰国" COUNTRY_NAMES[VN]="越南" COUNTRY_NAMES[AU]="澳大利亚"

    # 创建数据中心到国家的映射
    local mapping_file="$DATA_DIR/.dc_mapping"
    if [ -f "$DATA_DIR/locations.json" ]; then
        cat "$DATA_DIR/locations.json" | \
            grep -o '"iata":"[^"]*","lat":[^,]*,"lon":[^,]*,"cca2":"[^"]*"' | \
            sed 's/"iata":"\([^"]*\)".*"cca2":"\([^"]*\)"/\1,\2/' > "$mapping_file"
    else
        echo "⚠️  未找到 locations.json"
        return
    fi

    # 提取所有数据中心
    local datacenters=$(awk -F',' 'NR>1 {print $2}' "$csv_file" | sort -u)

    # 统计
    declare -A COUNTRY_COUNT
    declare -A COUNTRY_DCS

    for dc in $datacenters; do
        local country=$(grep "^${dc}," "$mapping_file" | cut -d',' -f2 | head -n1)
        if [ -n "$country" ]; then
            local count=$(awk -F',' -v dc="$dc" 'NR>1 && $2==dc' "$csv_file" | wc -l)
            COUNTRY_COUNT[$country]=$((${COUNTRY_COUNT[$country]:-0} + count))

            if [ -z "${COUNTRY_DCS[$country]}" ]; then
                COUNTRY_DCS[$country]="$dc"
            else
                COUNTRY_DCS[$country]="${COUNTRY_DCS[$country]} $dc"
            fi
        fi
    done

    # 按国家创建CSV
    for country in "${!COUNTRY_COUNT[@]}"; do
        # 如果设置了REGIONS筛选，跳过不在列表中的国家
        if [ -n "$REGIONS" ]; then
            if ! echo "$REGIONS" | grep -qw "$country"; then
                continue
            fi
        fi

        local output_file="$output_dir/country_${country}_${csv_type}.csv"
        echo "IP地址,数据中心,地区,城市,网络延迟" > "$output_file"

        for dc in ${COUNTRY_DCS[$country]}; do
            awk -F',' -v dc="$dc" 'NR>1 && $2==dc' "$csv_file" >> "$output_file"
        done

        # 如果设置了TOP_N，按延迟排序并只取前N个
        if [ -n "$TOP_N" ] && [ "$TOP_N" -gt 0 ]; then
            local temp_file="$output_file.tmp"
            head -n 1 "$output_file" > "$temp_file"
            tail -n +2 "$output_file" | sort -t ',' -k5,5n | head -n "$TOP_N" >> "$temp_file"
            mv "$temp_file" "$output_file"
        fi
    done

    # 显示统计
    echo ""
    echo "【按国家统计】"
    for country in "${!COUNTRY_COUNT[@]}"; do
        # 如果设置了REGIONS筛选，跳过不在列表中的国家
        if [ -n "$REGIONS" ]; then
            if ! echo "$REGIONS" | grep -qw "$country"; then
                continue
            fi
        fi

        local count=${COUNTRY_COUNT[$country]}
        local dcs=${COUNTRY_DCS[$country]}
        local country_name="${COUNTRY_NAMES[$country]}"
        [ -z "$country_name" ] && country_name="$country"

        # 如果设置了TOP_N，显示实际输出的数量
        if [ -n "$TOP_N" ] && [ "$TOP_N" -gt 0 ] && [ "$count" -gt "$TOP_N" ]; then
            count=$TOP_N
        fi

        echo "$country|$country_name|$count|$dcs"
    done | sort -t'|' -k3 -rn | while IFS='|' read -r country country_name count dcs; do
        printf "  %-4s %-15s: %5d 个IP (数据中心: %s)\n" "$country" "($country_name)" "$count" "$dcs"
    done

    echo ""
    log "✓ 已生成文件: $output_dir/country_*_${csv_type}.csv"
    rm -f "$mapping_file"
}

# 更新Cloudflare DNS记录
update_cloudflare_dns() {
    local csv_file=$1
    local record_type=$2  # A 或 AAAA

    # 检查配置
    if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ZONE_ID" ] || [ -z "$CF_DOMAIN" ]; then
        echo "⚠️  Cloudflare DNS配置不完整，跳过更新"
        echo "   请在配置文件中设置: CF_API_TOKEN, CF_ZONE_ID, CF_DOMAIN"
        return 1
    fi

    if [ ! -f "$csv_file" ] || [ ! -s "$csv_file" ]; then
        echo "⚠️  未找到结果文件: $csv_file"
        return 1
    fi

    # 从CSV文件名中提取地区代码（如 country_HK_IPv4.csv -> HK）
    local basename=$(basename "$csv_file")
    local region=$(echo "$basename" | sed -E 's/country_([A-Z]+)_IPv[46]\.csv/\1/')
    local region_lower=$(echo "$region" | awk '{print tolower($0)}')

    # 根据record_type确定IP版本号（A=4, AAAA=6）
    local ip_version="4"
    if [ "$record_type" = "AAAA" ]; then
        ip_version="6"
    fi

    # 生成DNS记录名：地区代码小写 + IP版本号（如 hk4, hk6）
    local record_name="${region_lower}${ip_version}"
    local full_record_name="${record_name}.${CF_DOMAIN}"

    # 如果域名包含中文，尝试转换为 Punycode
    local query_name="$full_record_name"
    if command -v idn2 &> /dev/null; then
        query_name=$(echo "$full_record_name" | idn2 2>/dev/null || echo "$full_record_name")
        if [ "$query_name" != "$full_record_name" ]; then
            echo "域名 Punycode 转换: $full_record_name -> $query_name"
        fi
    elif command -v idn &> /dev/null; then
        query_name=$(echo "$full_record_name" | idn 2>/dev/null || echo "$full_record_name")
        if [ "$query_name" != "$full_record_name" ]; then
            echo "域名 Punycode 转换: $full_record_name -> $query_name"
        fi
    else
        # 检查是否包含非ASCII字符
        if ! echo "$full_record_name" | LC_ALL=C grep -q '^[[:alnum:].-]*$'; then
            echo "⚠️  警告: 域名包含非ASCII字符但未安装 idn 工具"
            echo "   建议: 1) 安装 idn2 工具，或 2) 在配置文件中使用 Punycode 格式"
            echo "   当前域名: $full_record_name"
            echo "   继续尝试使用原始域名..."
        fi
    fi

    echo ""
    log "================================================="
    log "更新 Cloudflare DNS: $full_record_name ($record_type)"
    log "================================================="

    # 获取前N个IP
    local update_count=${TOP_N:-5}
    if [ "$update_count" -le 0 ]; then
        update_count=5
    fi
    local ips=$(tail -n +2 "$csv_file" | head -n "$update_count" | cut -d',' -f1)

    if [ -z "$ips" ]; then
        echo "⚠️  没有可用的IP"
        return 1
    fi

    # 先删除已存在的记录
    log "正在查找已存在的DNS记录..."
    local existing_records=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?type=${record_type}&name=${query_name}" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json")

    # 检查API响应是否成功
    if ! echo "$existing_records" | grep -q '"success":true'; then
        echo "⚠️  查询DNS记录失败"
        echo "     $(echo $existing_records | grep -o '"message":"[^"]*"' | head -1)"
        return 1
    fi

    # 使用jq或grep提取ID（优先使用jq，如果没有则用兼容性更好的grep/sed）
    local record_ids=""
    if command -v jq &> /dev/null; then
        echo "使用 jq 解析JSON..."
        record_ids=$(echo "$existing_records" | jq -r '.result[].id' 2>/dev/null)
    else
        echo "使用 grep/sed 解析JSON..."
        # 备用：使用兼容性更好的grep+sed（支持BusyBox）
        record_ids=$(echo "$existing_records" | grep -o '"id":"[^"]*"' | sed 's/"id":"//g; s/"//g' | head -100)
    fi

    if [ -n "$record_ids" ]; then
        local delete_count=0
        local total_to_delete=$(echo "$record_ids" | wc -l)
        log "找到 $total_to_delete 条旧记录，正在删除..."

        for record_id in $record_ids; do
            local del_response=$(curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${record_id}" \
                -H "Authorization: Bearer ${CF_API_TOKEN}" \
                -H "Content-Type: application/json")

            if echo "$del_response" | grep -q '"success":true'; then
                delete_count=$((delete_count + 1))
                log "  ✓ [$delete_count/$total_to_delete] 已删除记录: $record_id"
            else
                echo "  ✗ 删除失败: $record_id"
                local error_msg=$(echo "$del_response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 | head -1)
                if [ -n "$error_msg" ]; then
                    echo "     错误: $error_msg"
                fi
            fi
        done
        echo "✓ 成功删除 $delete_count 条旧记录"
    else
        log "没有找到旧记录（这是首次创建）"
    fi

    # 添加新记录
    # 添加新记录
    log "添加新记录到 $full_record_name ..."
    local count=0
    local success_count=0
    local ip_details=""
    
    for ip in $ips; do
        count=$((count + 1))
        
        # 从CSV获取IP详情 (IP, Colo, Latency)
        # CSV格式: IP,Colo,Region,City,Latency
        local ip_info=$(grep "^$ip," "$csv_file" | head -1)
        local colo=$(echo "$ip_info" | cut -d',' -f2)
        local latency=$(echo "$ip_info" | cut -d',' -f5)
        
        local response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
            -H "Authorization: Bearer ${CF_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"${record_type}\",\"name\":\"${full_record_name}\",\"content\":\"${ip}\",\"ttl\":60,\"proxied\":false}")

        if echo "$response" | grep -q '"success":true'; then
            success_count=$((success_count + 1))
            log "  ✓ [$count/$update_count] 添加成功: $ip ($colo - ${latency}ms)"
            ip_details="${ip_details}${count}. <code>${ip}</code> [${colo}] - ${latency}ms%0A"
        else
            log "  ✗ [$count/$update_count] 添加失败: $ip"
            local error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 | head -1)
            log "    错误信息: $error_msg"
        fi
    done

    echo ""
    log "✓ DNS更新完成: 成功添加 $success_count/$update_count 条记录"

    # 发送 Telegram 通知
    if [ "$success_count" -gt 0 ]; then
        local msg="<b>Cloudflare DNS 更新成功</b>%0A"
        msg="${msg}<b>域名:</b> ${full_record_name}%0A"
        msg="${msg}<b>类型:</b> ${record_type}%0A"
        msg="${msg}<b>成功:</b> ${success_count}/${update_count}%0A"
        msg="${msg}<b>时间:</b> $(date '+%Y-%m-%d %H:%M:%S')"
        send_notification "$msg"
    fi
}

# 主程序
if [ "$INTERACTIVE" = true ]; then
    clear
fi

log "================================================="
log "Cloudflare IP 优选工具"
log "================================================="
log "并发数: $TASK"
log "程序目录: $DATA_DIR"
log "IPv4结果: $RESULT_V4_DIR"
log "IPv6结果: $RESULT_V6_DIR"
if [ -n "$REGIONS" ]; then
    log "筛选国家: $REGIONS"
else
    log "筛选国家: 全部"
fi
if [ -n "$TOP_N" ] && [ "$TOP_N" -gt 0 ]; then
    log "每国数量: 前 $TOP_N 个"
else
    log "每国数量: 不限制"
fi
log ""

if [ "$INTERACTIVE" = true ]; then
    # 网络检测
    if timeout 3 ping -c 2 2400:3200::1 &> /dev/null; then
        echo "当前网络: IPv4 + IPv6"
    else
        echo "当前网络: 仅 IPv4"
    fi
    echo ""
fi

# 下载必要文件
if [ ! -f "$DATA_DIR/cf" ]; then
    download_file "$cpu" "$DATA_DIR/cf" || exit 1
fi
chmod +x "$DATA_DIR/cf"

if [ ! -f "$DATA_DIR/locations.json" ]; then
    download_file "locations.json" "$DATA_DIR/locations.json"
fi

if [ ! -f "$DATA_DIR/ips-v4.txt" ]; then
    download_file "ips-v4.txt" "$DATA_DIR/ips-v4.txt"
fi

if [ ! -f "$DATA_DIR/ips-v6.txt" ]; then
    download_file "ips-v6.txt" "$DATA_DIR/ips-v6.txt"
fi

# 非交互模式处理
if [ "$INTERACTIVE" = false ]; then
    if [ "$CLEAN_ONLY" = true ]; then
        echo "清理结果文件..."
        rm -f "$RESULT_V4_DIR"/*.csv
        rm -f "$RESULT_V6_DIR"/*.csv
        echo "✓ 已清理所有CSV文件"
        exit 0
    fi

    case "$MODE" in
        ipv4)
            log "执行 IPv4 优选..."
            cd "$DATA_DIR" && ./cf -task $TASK -ips 4 -outfile results/4.csv
            cd "$SCRIPT_DIR"
            process_results "$RESULT_DIR/4.csv" "IPv4"

            # 更新DNS（如果启用）
            if [ "$UPDATE_DNS" = true ]; then
                if [ -n "$REGIONS" ]; then
                    # 为每个指定的国家创建DNS记录
                    for region in $REGIONS; do
                        dns_csv="$RESULT_V4_DIR/country_${region}_IPv4.csv"
                        if [ -f "$dns_csv" ]; then
                            update_cloudflare_dns "$dns_csv" "A"
                        fi
                    done
                else
                    # 为所有国家文件创建DNS记录
                    for dns_csv in "$RESULT_V4_DIR"/country_*_IPv4.csv; do
                        if [ -f "$dns_csv" ]; then
                            update_cloudflare_dns "$dns_csv" "A"
                        fi
                    done
                fi
            fi
            ;;
        ipv6)
            log "执行 IPv6 优选..."
            cd "$DATA_DIR" && ./cf -task $TASK -ips 6 -outfile results/6.csv
            cd "$SCRIPT_DIR"
            process_results "$RESULT_DIR/6.csv" "IPv6"

            # 更新DNS（如果启用）
            if [ "$UPDATE_DNS" = true ]; then
                if [ -n "$REGIONS" ]; then
                    # 为每个指定的国家创建DNS记录
                    for region in $REGIONS; do
                        dns_csv="$RESULT_V6_DIR/country_${region}_IPv6.csv"
                        if [ -f "$dns_csv" ]; then
                            update_cloudflare_dns "$dns_csv" "AAAA"
                        fi
                    done
                else
                    # 为所有国家文件创建DNS记录
                    for dns_csv in "$RESULT_V6_DIR"/country_*_IPv6.csv; do
                        if [ -f "$dns_csv" ]; then
                            update_cloudflare_dns "$dns_csv" "AAAA"
                        fi
                    done
                fi
            fi
            ;;
        dual)
            log "执行双栈优选..."
            log "正在测试 IPv4..."
            cd "$DATA_DIR" && ./cf -task $TASK -ips 4 -outfile results/4.csv
            cd "$SCRIPT_DIR"
            process_results "$RESULT_DIR/4.csv" "IPv4"

            echo ""
            log "正在测试 IPv6..."
            cd "$DATA_DIR" && ./cf -task $TASK -ips 6 -outfile results/6.csv
            cd "$SCRIPT_DIR"
            process_results "$RESULT_DIR/6.csv" "IPv6"

            # 更新DNS（如果启用）
            if [ "$UPDATE_DNS" = true ]; then
                if [ -n "$REGIONS" ]; then
                    # 为每个指定的国家创建IPv4和IPv6的DNS记录
                    for region in $REGIONS; do
                        dns_csv_v4="$RESULT_V4_DIR/country_${region}_IPv4.csv"
                        dns_csv_v6="$RESULT_V6_DIR/country_${region}_IPv6.csv"

                        if [ -f "$dns_csv_v4" ]; then
                            update_cloudflare_dns "$dns_csv_v4" "A"
                        fi

                        if [ -f "$dns_csv_v6" ]; then
                            update_cloudflare_dns "$dns_csv_v6" "AAAA"
                        fi
                    done
                else
                    # 为所有国家文件创建DNS记录
                    for dns_csv_v4 in "$RESULT_V4_DIR"/country_*_IPv4.csv; do
                        if [ -f "$dns_csv_v4" ]; then
                            update_cloudflare_dns "$dns_csv_v4" "A"
                        fi
                    done

                    for dns_csv_v6 in "$RESULT_V6_DIR"/country_*_IPv6.csv; do
                        if [ -f "$dns_csv_v6" ]; then
                            update_cloudflare_dns "$dns_csv_v6" "AAAA"
                        fi
                    done
                fi
            fi
            ;;
    esac

    echo ""
    echo "================================================="
    echo "完成"
    echo "================================================="
    exit 0
fi

# 菜单
echo "================================================="
echo "请选择操作"
echo "================================================="
echo "1. IPv4 优选 [默认]"
echo "2. IPv6 优选"
echo "3. IPv4 + IPv6 双栈优选"
echo "4. 配置并发数 (当前: $TASK)"
echo "5. 配置筛选 (国家: ${REGIONS:-全部}, 数量: ${TOP_N:-不限})"
echo "6. 更新Cloudflare DNS"
echo "7. 清理结果文件"
echo "0. 退出"
echo "================================================="
read -p "请选择 [0-7]: " menu

[ -z "$menu" ] && menu="1"

case "$menu" in
    1)
        echo ""
        echo "执行 IPv4 优选..."
        IPV=1
        save_config
        cd "$DATA_DIR" && ./cf -task $TASK -ips 4 -outfile results/4.csv
        cd "$SCRIPT_DIR"
        process_results "$RESULT_DIR/4.csv" "IPv4"

        # 优选完成后询问是否更新DNS
        echo ""
        read -p "是否更新Cloudflare DNS? [y/N]: " update_dns
        if [ "$update_dns" = "y" ] || [ "$update_dns" = "Y" ]; then
            if [ -n "$REGIONS" ]; then
                # 为每个指定的国家创建DNS记录
                for region in $REGIONS; do
                    dns_csv="$RESULT_V4_DIR/country_${region}_IPv4.csv"
                    if [ -f "$dns_csv" ]; then
                        update_cloudflare_dns "$dns_csv" "A"
                    fi
                done
            else
                # 为所有国家文件创建DNS记���
                for dns_csv in "$RESULT_V4_DIR"/country_*_IPv4.csv; do
                    if [ -f "$dns_csv" ]; then
                        update_cloudflare_dns "$dns_csv" "A"
                    fi
                done
            fi
        fi
        ;;
    2)
        echo ""
        echo "执行 IPv6 优选..."
        IPV=2
        save_config
        cd "$DATA_DIR" && ./cf -task $TASK -ips 6 -outfile results/6.csv
        cd "$SCRIPT_DIR"
        process_results "$RESULT_DIR/6.csv" "IPv6"

        # 优选完成后询问是否更新DNS
        echo ""
        read -p "是否更新Cloudflare DNS? [y/N]: " update_dns
        if [ "$update_dns" = "y" ] || [ "$update_dns" = "Y" ]; then
            if [ -n "$REGIONS" ]; then
                # 为每个指定的国家创建DNS记录
                for region in $REGIONS; do
                    dns_csv="$RESULT_V6_DIR/country_${region}_IPv6.csv"
                    if [ -f "$dns_csv" ]; then
                        update_cloudflare_dns "$dns_csv" "AAAA"
                    fi
                done
            else
                # 为所有国家文件创建DNS记录
                for dns_csv in "$RESULT_V6_DIR"/country_*_IPv6.csv; do
                    if [ -f "$dns_csv" ]; then
                        update_cloudflare_dns "$dns_csv" "AAAA"
                    fi
                done
            fi
        fi
        ;;
    3)
        echo ""
        echo "执行双栈优选..."
        IPV=3
        save_config
        echo "正在测试 IPv4..."
        cd "$DATA_DIR" && ./cf -task $TASK -ips 4 -outfile results/4.csv
        cd "$SCRIPT_DIR"
        process_results "$RESULT_DIR/4.csv" "IPv4"

        echo ""
        echo "正在测试 IPv6..."
        cd "$DATA_DIR" && ./cf -task $TASK -ips 6 -outfile results/6.csv
        cd "$SCRIPT_DIR"
        process_results "$RESULT_DIR/6.csv" "IPv6"

        # 优选完成后询问是否更新DNS
        echo ""
        read -p "是否更新Cloudflare DNS? [y/N]: " update_dns
        if [ "$update_dns" = "y" ] || [ "$update_dns" = "Y" ]; then
            if [ -n "$REGIONS" ]; then
                # 为每个指定的国家创建IPv4和IPv6的DNS记录
                for region in $REGIONS; do
                    dns_csv_v4="$RESULT_V4_DIR/country_${region}_IPv4.csv"
                    dns_csv_v6="$RESULT_V6_DIR/country_${region}_IPv6.csv"

                    if [ -f "$dns_csv_v4" ]; then
                        update_cloudflare_dns "$dns_csv_v4" "A"
                    fi

                    if [ -f "$dns_csv_v6" ]; then
                        update_cloudflare_dns "$dns_csv_v6" "AAAA"
                    fi
                done
            else
                # 为所有国家文件创建DNS记录
                for dns_csv_v4 in "$RESULT_V4_DIR"/country_*_IPv4.csv; do
                    if [ -f "$dns_csv_v4" ]; then
                        update_cloudflare_dns "$dns_csv_v4" "A"
                    fi
                done

                for dns_csv_v6 in "$RESULT_V6_DIR"/country_*_IPv6.csv; do
                    if [ -f "$dns_csv_v6" ]; then
                        update_cloudflare_dns "$dns_csv_v6" "AAAA"
                    fi
                done
            fi
        fi
        ;;
    4)
        echo ""
        read -p "请输入新的并发数 [1-1000]: " new_task
        if [ -n "$new_task" ] && [ "$new_task" -ge 1 ] 2>/dev/null && [ "$new_task" -le 1000 ] 2>/dev/null; then
            TASK=$new_task
            save_config
            echo "配置已更新，重新运行..."
            exec bash "$0"
        else
            echo "无效输入"
        fi
        ;;
    5)
        echo ""
        echo "配置筛选"
        echo "================================================="
        echo "当前配置："
        echo "  筛选国家: ${REGIONS:-全部}"
        echo "  每国数量: ${TOP_N:-不限}"
        echo ""
        echo "常用国家代码: HK(香港) SG(新加坡) JP(日本) KR(韩国) TW(台湾) US(美国)"
        echo ""
        read -p "输入国家代码 (多个用空格分隔，留空=全部): " new_regions
        read -p "每个国家取前几个IP (留空或0=不限): " new_top

        # 更新REGIONS
        if grep -q "^REGIONS=" "$CONFIG_FILE"; then
            if [ -z "$new_regions" ]; then
                sed -i 's/^REGIONS=.*/REGIONS=""/' "$CONFIG_FILE"
            else
                sed -i "s/^REGIONS=.*/REGIONS=\"$new_regions\"/" "$CONFIG_FILE"
            fi
        else
            if [ -z "$new_regions" ]; then
                echo 'REGIONS=""' >> "$CONFIG_FILE"
            else
                echo "REGIONS=\"$new_regions\"" >> "$CONFIG_FILE"
            fi
        fi

        # 更新TOP_N
        if grep -q "^TOP_N=" "$CONFIG_FILE"; then
            if [ -z "$new_top" ] || [ "$new_top" -eq 0 ] 2>/dev/null; then
                sed -i 's/^TOP_N=.*/TOP_N=0/' "$CONFIG_FILE"
            else
                sed -i "s/^TOP_N=.*/TOP_N=$new_top/" "$CONFIG_FILE"
            fi
        else
            if [ -z "$new_top" ] || [ "$new_top" -eq 0 ] 2>/dev/null; then
                echo 'TOP_N=0' >> "$CONFIG_FILE"
            else
                echo "TOP_N=$new_top" >> "$CONFIG_FILE"
            fi
        fi

        echo "配置已更新，重新运行..."
        exec bash "$0"
        ;;
    6)
        echo ""
        echo "更新Cloudflare DNS"
        echo "================================================="

        # 选择IP版本
        read -p "选择IP版本 [1=IPv4, 2=IPv6, 3=两者]: " dns_ipv
        [ -z "$dns_ipv" ] && dns_ipv="1"

        # 列出可用的国家文件
        echo ""
        echo "可用的结果文件："
        if [ "$dns_ipv" = "1" ] || [ "$dns_ipv" = "3" ]; then
            echo "【IPv4】"
            ls "$RESULT_V4_DIR"/country_*_IPv4.csv 2>/dev/null | while read file; do
                basename_file=$(basename "$file")
                country=$(echo "$basename_file" | sed 's/country_\([^_]*\)_IPv4.csv/\1/')
                count=$(tail -n +2 "$file" | wc -l)
                echo "  $country: $count 个IP"
            done
        fi
        if [ "$dns_ipv" = "2" ] || [ "$dns_ipv" = "3" ]; then
            echo "【IPv6】"
            ls "$RESULT_V6_DIR"/country_*_IPv6.csv 2>/dev/null | while read file; do
                basename_file=$(basename "$file")
                country=$(echo "$basename_file" | sed 's/country_\([^_]*\)_IPv6.csv/\1/')
                count=$(tail -n +2 "$file" | wc -l)
                echo "  $country: $count 个IP"
            done
        fi

        echo ""
        read -p "输入要使用的国家代码 (如: HK): " dns_country

        if [ -z "$dns_country" ]; then
            echo "未指定国家，跳过"
        else
            if [ "$dns_ipv" = "1" ]; then
                csv_file="$RESULT_V4_DIR/country_${dns_country}_IPv4.csv"
                if [ -f "$csv_file" ]; then
                    update_cloudflare_dns "$csv_file" "A"
                else
                    echo "⚠️  文件不存在: $csv_file"
                fi
            elif [ "$dns_ipv" = "2" ]; then
                csv_file="$RESULT_V6_DIR/country_${dns_country}_IPv6.csv"
                if [ -f "$csv_file" ]; then
                    update_cloudflare_dns "$csv_file" "AAAA"
                else
                    echo "⚠️  文件不存在: $csv_file"
                fi
            elif [ "$dns_ipv" = "3" ]; then
                csv_v4="$RESULT_V4_DIR/country_${dns_country}_IPv4.csv"
                csv_v6="$RESULT_V6_DIR/country_${dns_country}_IPv6.csv"
                if [ -f "$csv_v4" ]; then
                    update_cloudflare_dns "$csv_v4" "A"
                fi
                if [ -f "$csv_v6" ]; then
                    update_cloudflare_dns "$csv_v6" "AAAA"
                fi
            fi
        fi
        ;;
    7)
        rm -f "$RESULT_V4_DIR"/*.csv
        rm -f "$RESULT_V6_DIR"/*.csv
        echo "已清理所有CSV文件"
        ;;
    0)
        exit 0
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo ""
echo "================================================="
echo "完成"
echo "================================================="

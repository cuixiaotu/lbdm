#!/bin/bash

# 开发环境配置文件设置脚本

set -e

echo "🔧 设置开发环境配置..."

# 检查示例配置文件是否存在
if [ ! -f "config.dev.example.json" ]; then
    echo "❌ 错误: 找不到 config.dev.example.json"
    exit 1
fi

# 检查配置文件是否已存在
if [ -f "config.dev.json" ]; then
    echo "⚠️  config.dev.json 已存在"
    read -p "是否覆盖? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 取消操作"
        exit 0
    fi
fi

# 复制示例配置
cp config.dev.example.json config.dev.json
echo "✅ 已创建 config.dev.json"

# 检查 .gitignore
if ! grep -q "config.dev.json" .gitignore; then
    echo "⚠️  警告: .gitignore 中未找到 config.dev.json"
    echo "添加到 .gitignore..."
    echo -e "\n# Development configuration\nconfig.dev.json" >> .gitignore
    echo "✅ 已添加到 .gitignore"
fi

echo ""
echo "📝 下一步:"
echo "   1. 编辑 config.dev.json 填入你的配置"
echo "   2. 运行 pnpm dev 启动开发环境"
echo ""
echo "📖 详细文档: docs/DEV_CONFIG.md"
echo ""
echo "✨ 设置完成!"

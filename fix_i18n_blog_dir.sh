#!/bin/bash

# 设置语言列表（根据需要添加更多语言）
languages=("en" "ja" "ko" "fr" "de" "es" "ru" "pt")

# 插件前缀（默认博客是 docusaurus-plugin-content-blog）
plugin_prefix="docusaurus-plugin-content-blog"

# 查找所有当前目录下的 plugin 实例
for lang in "${languages[@]}"; do
  echo "🔍 处理语言：$lang"

  for plugin_dir in i18n/$lang/${plugin_prefix}*; do
    current_dir="$plugin_dir/current"

    if [ -d "$current_dir" ]; then
      echo "📂 发现 current 目录: $current_dir"
      
      # 移动 Markdown 文件和其他内容
      rsync -av --remove-source-files "$current_dir/" "$plugin_dir/"

      # 尝试删除 current 目录（如果为空）
      rm -rf "$current_dir" 2>/dev/null && echo "🧹 已删除空目录：$current_dir"
    fi
  done
done

echo "✅ 处理完成。"

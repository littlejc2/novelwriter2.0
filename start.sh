#!/bin/bash
# 启动脚本 - AI小说创作系统

echo "🚀 启动AI小说创作系统..."
echo ""

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未安装Node.js"
    echo "请先安装Node.js: https://nodejs.org/"
    exit 1
fi

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    echo ""
fi

# 启动服务器
echo "✅ 启动服务器..."
echo "-----------------------------------"
echo "🌐 登录页面: http://localhost:3000/login.html"
echo "📝 主应用: http://localhost:3000/auto-index.html"
echo "👤 管理员账号: admin / 19811130njcice"
echo "-----------------------------------"
echo ""

# 使用nodemon（如果有）或node启动
if command -v nodemon &> /dev/null; then
    npm run dev
else
    npm start
fi
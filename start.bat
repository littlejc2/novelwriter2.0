@echo off
chcp 65001 >nul
title AI小说创作系统

echo 🚀 启动AI小说创作系统...
echo.

:: 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误：未安装Node.js
    echo 请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查依赖
if not exist "node_modules" (
    echo 📦 首次运行，正在安装依赖...
    call npm install
    echo.
)

:: 启动服务器
echo ✅ 启动服务器...
echo -----------------------------------
echo 🌐 登录页面: http://localhost:3000/login.html
echo 📝 主应用: http://localhost:3000/auto-index.html
echo 👤 管理员账号: admin / 19811130njcice
echo -----------------------------------
echo.
echo 提示：如果看到"网络错误"，请等待服务器完全启动后再试
echo.

:: 启动
call npm start
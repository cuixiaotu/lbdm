@echo off
REM 开发环境配置文件设置脚本

echo 🔧 设置开发环境配置...

REM 检查示例配置文件是否存在
if not exist "config.dev.example.json" (
    echo ❌ 错误: 找不到 config.dev.example.json
    exit /b 1
)

REM 检查配置文件是否已存在
if exist "config.dev.json" (
    echo ⚠️  config.dev.json 已存在
    set /p confirm="是否覆盖? (y/N): "
    if /i not "%confirm%"=="y" (
        echo ❌ 取消操作
        exit /b 0
    )
)

REM 复制示例配置
copy config.dev.example.json config.dev.json >nul
echo ✅ 已创建 config.dev.json

REM 检查 .gitignore
findstr /c:"config.dev.json" .gitignore >nul 2>&1
if errorlevel 1 (
    echo ⚠️  警告: .gitignore 中未找到 config.dev.json
    echo 添加到 .gitignore...
    echo. >> .gitignore
    echo # Development configuration >> .gitignore
    echo config.dev.json >> .gitignore
    echo ✅ 已添加到 .gitignore
)

echo.
echo 📝 下一步:
echo    1. 编辑 config.dev.json 填入你的配置
echo    2. 运行 pnpm dev 启动开发环境
echo.
echo 📖 详细文档: docs\DEV_CONFIG.md
echo.
echo ✨ 设置完成!

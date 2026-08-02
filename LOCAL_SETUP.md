# 本地使用说明

## 环境要求

- Windows PowerShell
- Bun
- Go 1.22 或更高版本

仓库内存在 `.tools/go` 时，构建脚本会优先使用它。

## 首次安装

```powershell
cd web
bun install
cd ..
```

## 构建

在仓库根目录运行：

```powershell
.\build-local.ps1
```

构建结果位于：

```text
bin/new-api-preview.exe
```

## 启动

```powershell
.\bin\new-api-preview.exe
```

启动后访问：

- 首页：<http://127.0.0.1:3000/>
- 首次配置：<http://127.0.0.1:3000/setup>
- 登录：<http://127.0.0.1:3000/sign-in>

## 数据库配置

首次访问 `/setup` 时，按页面提示选择并配置数据库：

- SQLite：本地使用最简单，未配置 `SQL_DSN` 时默认使用
- MySQL：需要填写可访问的 MySQL 连接信息
- PostgreSQL：需要填写可访问的 PostgreSQL 连接信息

完成初始化后会进入登录页面。

## 重新构建

`build-local.ps1` 会停止正在运行的本地预览进程。构建完成后需要重新启动：

```powershell
.\bin\new-api-preview.exe
```

更多配置请查看 [.env.example](.env.example)。

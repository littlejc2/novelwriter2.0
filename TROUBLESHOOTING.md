# 故障排除指南 - 登录网络错误

## 问题：点击登录显示"网络错误"

### 可能的原因和解决方案：

### 1. 服务器未运行
**症状**：浏览器控制台显示 "Failed to fetch" 或 "ERR_CONNECTION_REFUSED"

**解决方案**：
```bash
# 在项目目录下运行
npm start

# 或使用启动脚本（Windows）
start.bat

# 或使用启动脚本（Linux/Mac）
./start.sh
```

### 2. 端口不匹配
**症状**：服务器在运行，但仍然显示网络错误

**解决方案**：
1. 检查服务器运行的端口（默认3000）
2. 如果使用其他端口，修改 `login-app.js` 第13行：
   ```javascript
   this.apiBase = window.location.protocol + '//' + window.location.hostname + ':你的端口号';
   ```

### 3. 直接打开HTML文件
**症状**：地址栏显示 `file:///` 开头的路径

**解决方案**：
- 不要直接双击HTML文件
- 通过服务器访问：http://localhost:3000/login.html

### 4. 防火墙或安全软件阻止
**症状**：服务器正常启动，但无法访问

**解决方案**：
- 检查防火墙设置，允许Node.js访问网络
- 暂时关闭安全软件测试

### 5. 依赖未安装
**症状**：服务器启动失败，提示找不到模块

**解决方案**：
```bash
# 删除node_modules并重新安装
rm -rf node_modules
npm install
```

## 调试步骤

### 1. 检查服务器状态
打开新的命令行窗口，运行：
```bash
# Windows
netstat -an | findstr :3000

# Linux/Mac
netstat -an | grep :3000
```
应该看到 LISTENING 状态

### 2. 测试API
在浏览器地址栏输入：
```
http://localhost:3000/api/profile
```
应该看到 `{"error":"需要登录"}`

### 3. 查看浏览器控制台
1. 按 F12 打开开发者工具
2. 切换到 Console（控制台）标签
3. 查看红色错误信息
4. 切换到 Network（网络）标签，查看请求详情

### 4. 检查服务器日志
查看运行 `npm start` 的命令行窗口，应该显示：
```
服务器运行在 http://localhost:3000
用户表已就绪
✅ 管理员账号创建成功
```

## 常见错误信息

### "EADDRINUSE: address already in use"
端口被占用，解决方案：
```bash
# 使用其他端口
PORT=3001 npm start
```

### "Cannot find module 'express'"
依赖未安装，运行：
```bash
npm install
```

### "SQLITE_CANTOPEN"
无法创建数据库文件，检查文件夹权限

## 快速测试

如果以上都无法解决，尝试最简单的测试：

1. 创建测试文件 `test-server.js`：
```javascript
const express = require('express');
const app = express();

app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

app.listen(3000, () => {
    console.log('Test server running on http://localhost:3000/test');
});
```

2. 运行测试：
```bash
node test-server.js
```

3. 访问 http://localhost:3000/test

如果测试成功，说明环境正常，问题可能在主服务器代码中。
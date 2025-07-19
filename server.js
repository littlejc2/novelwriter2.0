// server.js - AI小说创作系统后端服务
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));


// API路由

// 处理所有其他路由，返回主页（用于单页应用）
app.get('*', (req, res) => {
    // 如果是API请求，返回404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API端点不存在' });
    }
    
    
    // 返回对应的HTML文件
    const filePath = path.join(__dirname, req.path);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send('页面不存在');
        }
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('主应用页面: http://localhost:' + PORT + '/auto-index.html');
});
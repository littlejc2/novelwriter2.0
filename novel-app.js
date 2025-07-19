// 小说创作协作系统 - 核心应用逻辑
class NovelWritingSystem {
    constructor() {
        // API配置
        this.apiKey = localStorage.getItem('gemini_api_key') || '';
        this.settings = {
            model: 'gemini-1.5-pro',
            temperature: 0.8,
            maxTokens: 4096
        };
        
        // 系统状态
        this.currentRole = 'architect';
        this.currentStage = 'concept';
        this.currentProject = null;
        this.projects = JSON.parse(localStorage.getItem('novel_projects')) || {};
        
        // 角色系统
        this.roles = {
            architect: '首席架构师',
            character: '角色塑造师',
            plot: '情节规划师',
            narrative: '叙事执行者',
            continuity: '连续性监督官',
            quality: '质量评估官',
            director: '创作总监'
        };
        
        // 工作流阶段
        this.stages = {
            concept: '概念构建',
            planning: '详细规划',
            creation: '内容创作',
            revision: '修订完善',
            forward: '前瞻规划'
        };
        
        // 初始化
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.updateUI();
        
        // 检查API Key
        if (!this.apiKey) {
            this.showSettings();
        }
    }
    
    initializeElements() {
        // 项目管理
        this.projectSelect = document.getElementById('projectSelect');
        this.newProjectBtn = document.getElementById('newProjectBtn');
        
        // 角色和工作流
        this.roleItems = document.querySelectorAll('.role-item');
        this.stageButtons = document.querySelectorAll('.stage-btn');
        
        // 工作区
        this.workTitle = document.getElementById('workTitle');
        this.workContent = document.getElementById('workContent');
        this.executeBtn = document.getElementById('executeBtn');
        this.saveWorkBtn = document.getElementById('saveWorkBtn');
        
        // AI响应
        this.aiResponse = document.getElementById('aiResponse');
        this.clearResponseBtn = document.getElementById('clearResponseBtn');
        
        // 信息面板
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // 设置
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        
        // 状态栏
        this.statusMessage = document.getElementById('statusMessage');
        this.wordCount = document.getElementById('wordCount');
        this.chapterCount = document.getElementById('chapterCount');
        this.lastSaved = document.getElementById('lastSaved');
    }
    
    bindEvents() {
        // 项目管理
        this.newProjectBtn.addEventListener('click', () => this.showProjectModal());
        this.projectSelect.addEventListener('change', (e) => this.loadProject(e.target.value));
        
        // 角色切换
        this.roleItems.forEach(item => {
            item.addEventListener('click', () => this.switchRole(item.dataset.role));
        });
        
        // 工作流阶段
        this.stageButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchStage(btn.dataset.stage));
        });
        
        // 执行和保存
        this.executeBtn.addEventListener('click', () => this.executeCurrentTask());
        this.saveWorkBtn.addEventListener('click', () => this.saveCurrentWork());
        this.clearResponseBtn.addEventListener('click', () => this.clearResponse());
        
        // 标签页切换
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // 设置
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        
        // 模态框关闭
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('show');
            });
        });
        
        // 添加按钮事件
        document.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.addDatabaseItem(e.target.dataset.type));
        });
    }
    
    // 切换角色
    switchRole(role) {
        this.currentRole = role;
        
        // 更新UI
        this.roleItems.forEach(item => {
            item.classList.toggle('active', item.dataset.role === role);
        });
        
        this.workTitle.textContent = `${this.roles[role]}工作台`;
        this.loadRoleView(role);
        this.updateStatus(`已切换到${this.roles[role]}`);
    }
    
    // 加载角色视图
    loadRoleView(role) {
        // 隐藏所有视图
        document.querySelectorAll('.role-view').forEach(view => {
            view.classList.remove('active');
        });
        
        // 根据角色创建或显示相应视图
        let viewId = `${role}View`;
        let view = document.getElementById(viewId);
        
        if (!view) {
            view = this.createRoleView(role);
            this.workContent.appendChild(view);
        }
        
        view.classList.add('active');
    }
    
    // 创建角色视图
    createRoleView(role) {
        const view = document.createElement('div');
        view.id = `${role}View`;
        view.className = 'role-view';
        
        const content = this.getRoleViewContent(role);
        view.innerHTML = content;
        
        return view;
    }
    
    // 获取角色视图内容
    getRoleViewContent(role) {
        const templates = {
            character: `
                <div class="form-section">
                    <h3>角色设计工作台</h3>
                    <div class="form-group">
                        <label>角色名称</label>
                        <input type="text" class="form-control" id="characterName" placeholder="输入角色全名">
                    </div>
                    <div class="form-group">
                        <label>角色类型</label>
                        <select class="form-control" id="characterType">
                            <option value="protagonist">主角</option>
                            <option value="antagonist">反派</option>
                            <option value="supporting">配角</option>
                            <option value="minor">次要角色</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>外貌描述</label>
                        <textarea class="form-control" rows="3" id="characterAppearance" 
                            placeholder="描述角色的外貌特征..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>性格特点</label>
                        <textarea class="form-control" rows="3" id="characterPersonality" 
                            placeholder="描述角色的性格特征、行为模式..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>背景故事</label>
                        <textarea class="form-control" rows="4" id="characterBackground" 
                            placeholder="角色的过去经历、成长环境..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>核心动机</label>
                        <textarea class="form-control" rows="2" id="characterMotivation" 
                            placeholder="驱动角色行为的核心欲望或目标..."></textarea>
                    </div>
                </div>
            `,
            plot: `
                <div class="form-section">
                    <h3>情节规划工作台</h3>
                    <div class="form-group">
                        <label>章节编号</label>
                        <input type="number" class="form-control" id="chapterNumber" value="1" min="1">
                    </div>
                    <div class="form-group">
                        <label>章节标题</label>
                        <input type="text" class="form-control" id="chapterTitle" placeholder="本章标题">
                    </div>
                    <div class="form-group">
                        <label>章节功能</label>
                        <textarea class="form-control" rows="2" id="chapterFunction" 
                            placeholder="本章在整体叙事中的作用..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>主要事件</label>
                        <textarea class="form-control" rows="4" id="chapterEvents" 
                            placeholder="按顺序列出本章要发生的主要事件..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>场景规划</label>
                        <textarea class="form-control" rows="5" id="chapterScenes" 
                            placeholder="详细的场景安排，包括地点、人物、冲突..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>悬念与伏笔</label>
                        <textarea class="form-control" rows="3" id="chapterSuspense" 
                            placeholder="设置的悬念、埋下的伏笔、回收的前置伏笔..."></textarea>
                    </div>
                </div>
            `,
            narrative: `
                <div class="form-section">
                    <h3>叙事执行工作台</h3>
                    <div class="form-group">
                        <label>章节选择</label>
                        <select class="form-control" id="narrativeChapter">
                            <option value="">选择要创作的章节...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>叙事视角</label>
                        <select class="form-control" id="narrativePOV">
                            <option value="first">第一人称</option>
                            <option value="third-limited">第三人称有限</option>
                            <option value="third-omniscient">第三人称全知</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>写作重点</label>
                        <textarea class="form-control" rows="3" id="writingFocus" 
                            placeholder="本章写作的重点内容、需要特别处理的部分..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>参考大纲</label>
                        <div class="outline-reference" id="outlineReference">
                            <!-- 将显示选定章节的大纲 -->
                        </div>
                    </div>
                </div>
            `,
            continuity: `
                <div class="form-section">
                    <h3>连续性检查工作台</h3>
                    <div class="form-group">
                        <label>检查章节</label>
                        <select class="form-control" id="continuityChapter">
                            <option value="">选择要检查的章节...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>检查项目</label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" checked> 角色行为一致性</label>
                            <label><input type="checkbox" checked> 时间线连贯性</label>
                            <label><input type="checkbox" checked> 空间逻辑</label>
                            <label><input type="checkbox" checked> 设定规则应用</label>
                            <label><input type="checkbox" checked> 伏笔与回收</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>特别关注</label>
                        <textarea class="form-control" rows="3" id="continuityFocus" 
                            placeholder="需要特别检查的连续性问题..."></textarea>
                    </div>
                </div>
            `,
            quality: `
                <div class="form-section">
                    <h3>质量评估工作台</h3>
                    <div class="form-group">
                        <label>评估章节</label>
                        <select class="form-control" id="qualityChapter">
                            <option value="">选择要评估的章节...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>评估维度</label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" checked> 叙事流畅度</label>
                            <label><input type="checkbox" checked> 角色表现力</label>
                            <label><input type="checkbox" checked> 冲突设计</label>
                            <label><input type="checkbox" checked> 情感强度</label>
                            <label><input type="checkbox" checked> 悬念效果</label>
                            <label><input type="checkbox" checked> 细节真实性</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>重点关注</label>
                        <textarea class="form-control" rows="3" id="qualityFocus" 
                            placeholder="需要特别评估的质量方面..."></textarea>
                    </div>
                </div>
            `,
            director: `
                <div class="form-section">
                    <h3>创作总监工作台</h3>
                    <div class="form-group">
                        <label>当前进度</label>
                        <div class="progress-overview" id="progressOverview">
                            <!-- 将显示整体进度概览 -->
                        </div>
                    </div>
                    <div class="form-group">
                        <label>需要决策的事项</label>
                        <textarea class="form-control" rows="4" id="decisionItems" 
                            placeholder="列出需要做出决策的关键事项..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>战略调整</label>
                        <textarea class="form-control" rows="4" id="strategyAdjustment" 
                            placeholder="对整体创作方向的调整建议..."></textarea>
                    </div>
                </div>
            `
        };
        
        return templates[role] || '<div class="form-section"><p>该角色视图正在开发中...</p></div>';
    }
    
    // 切换工作流阶段
    switchStage(stage) {
        this.currentStage = stage;
        
        // 更新UI
        this.stageButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.stage === stage);
        });
        
        document.getElementById('currentStage').textContent = this.stages[stage];
        this.updateStatus(`已进入${this.stages[stage]}阶段`);
    }
    
    // 切换标签页
    switchTab(tabName) {
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
    }
    
    // 执行当前任务
    async executeCurrentTask() {
        if (!this.apiKey) {
            alert('请先设置 Gemini API Key');
            this.showSettings();
            return;
        }
        
        if (!this.currentProject) {
            alert('请先创建或选择一个项目');
            return;
        }
        
        this.updateStatus('正在执行任务...');
        this.executeBtn.disabled = true;
        
        try {
            // 收集当前角色的输入数据
            const inputData = this.collectRoleInput();
            
            // 构建prompt
            const prompt = this.buildPrompt(inputData);
            
            // 调用AI
            const response = await this.callGeminiAPI(prompt);
            
            // 显示响应
            this.displayResponse(response);
            
            // 保存响应到项目
            this.saveResponseToProject(response);
            
            this.updateStatus('任务执行完成');
        } catch (error) {
            console.error('执行任务失败:', error);
            this.updateStatus(`错误: ${error.message}`);
        } finally {
            this.executeBtn.disabled = false;
        }
    }
    
    // 收集角色输入
    collectRoleInput() {
        const data = {
            role: this.currentRole,
            stage: this.currentStage,
            project: this.currentProject
        };
        
        // 根据当前角色收集特定数据
        switch (this.currentRole) {
            case 'architect':
                data.novelType = document.getElementById('novelType')?.value;
                data.highConcept = document.getElementById('highConcept')?.value;
                data.worldview = document.getElementById('worldview')?.value;
                data.theme = document.getElementById('theme')?.value;
                data.style = document.getElementById('style')?.value;
                break;
            
            case 'character':
                data.characterName = document.getElementById('characterName')?.value;
                data.characterType = document.getElementById('characterType')?.value;
                data.appearance = document.getElementById('characterAppearance')?.value;
                data.personality = document.getElementById('characterPersonality')?.value;
                data.background = document.getElementById('characterBackground')?.value;
                data.motivation = document.getElementById('characterMotivation')?.value;
                break;
            
            case 'plot':
                data.chapterNumber = document.getElementById('chapterNumber')?.value;
                data.chapterTitle = document.getElementById('chapterTitle')?.value;
                data.chapterFunction = document.getElementById('chapterFunction')?.value;
                data.events = document.getElementById('chapterEvents')?.value;
                data.scenes = document.getElementById('chapterScenes')?.value;
                data.suspense = document.getElementById('chapterSuspense')?.value;
                break;
            
            // 其他角色类似...
        }
        
        return data;
    }
    
    // 构建完整的prompt
    buildPrompt(inputData) {
        // 获取系统prompt
        const systemPrompt = this.getSystemPrompt();
        
        // 获取项目上下文
        const projectContext = this.getProjectContext();
        
        // 构建角色特定的任务指令
        const taskInstruction = this.buildTaskInstruction(inputData);
        
        // 组合完整prompt
        const fullPrompt = `
${systemPrompt}

//当前项目上下文
${projectContext}

//当前任务
以${this.roles[inputData.role]}的身份，在${this.stages[inputData.stage]}阶段执行以下任务：

${taskInstruction}

请严格按照${this.roles[inputData.role]}的标准输出格式提供响应。
`;
        
        return fullPrompt;
    }
    
    // 获取系统prompt（小说专家的完整定义）
    getSystemPrompt() {
        // 这里返回完整的小说专家系统prompt
        return `#SYSTEM_IDENTITY<NOVEL_CREATION_COLLABORATIVE_SYSTEM>

//CORE_SYSTEM_IDENTITY
我是小说创作协作系统，一个集成多专业角色的综合性文学创作平台。我通过精心设计的角色分工和工作流程，确保中长篇小说创作过程中的质量控制、逻辑一致性和叙事连贯性。我能够协调不同创作阶段的专业需求，从概念构思到最终成稿，提供全方位的创作支持，特别擅长推理、悬疑、探险、盗墓和古董类题材的中长篇小说创作。

[这里包含完整的小说专家系统定义...]`;
    }
    
    // 获取项目上下文
    getProjectContext() {
        if (!this.currentProject) return '//无项目上下文';
        
        const project = this.projects[this.currentProject];
        return `
项目名称：${project.name}
作者：${project.author}
项目描述：${project.description}
当前进度：${project.progress || '未开始'}

//已有内容概要
${project.summary || '暂无内容'}
`;
    }
    
    // 构建任务指令
    buildTaskInstruction(inputData) {
        const instructions = {
            architect: {
                concept: `
请为以下小说概念构建完整的世界观设定：
- 小说类型：${inputData.novelType}
- 高概念：${inputData.highConcept}
- 初步世界观：${inputData.worldview}
- 主题思想：${inputData.theme}
- 氛围风格：${inputData.style}

请提供详细的世界观构建文档，包括世界规则、背景设定、重要元素等。
`,
            },
            character: {
                planning: `
请为以下角色创建详细的角色档案：
- 角色名称：${inputData.characterName}
- 角色类型：${inputData.characterType}
- 外貌描述：${inputData.appearance}
- 性格特点：${inputData.personality}
- 背景故事：${inputData.background}
- 核心动机：${inputData.motivation}

请提供完整的角色设计文档，包括心理画像、关系网络、成长弧线等。
`,
            },
            // 其他角色和阶段的指令...
        };
        
        return instructions[inputData.role]?.[inputData.stage] || '请根据输入内容执行相应任务。';
    }
    
    // 调用Gemini API
    async callGeminiAPI(prompt) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${this.settings.model}:generateContent?key=${this.apiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: parseFloat(this.settings.temperature),
                maxOutputTokens: parseInt(this.settings.maxTokens),
                topK: 40,
                topP: 0.95,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }
            ]
        };
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('无效的API响应格式');
        }
    }
    
    // 显示AI响应
    displayResponse(response) {
        const formattedResponse = this.formatResponse(response);
        this.aiResponse.innerHTML = `
            <div class="ai-message">
                <h4>${this.roles[this.currentRole]} - ${this.stages[this.currentStage]}</h4>
                ${formattedResponse}
            </div>
        `;
        
        // 滚动到响应区域
        this.aiResponse.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // 格式化响应
    formatResponse(response) {
        // 将markdown格式转换为HTML
        return response
            .replace(/^### (.+)$/gm, '<h5>$1</h5>')
            .replace(/^## (.+)$/gm, '<h4>$1</h4>')
            .replace(/^# (.+)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }
    
    // 保存响应到项目
    saveResponseToProject(response) {
        if (!this.currentProject) return;
        
        const project = this.projects[this.currentProject];
        if (!project.responses) {
            project.responses = [];
        }
        
        project.responses.push({
            role: this.currentRole,
            stage: this.currentStage,
            response: response,
            timestamp: new Date().toISOString()
        });
        
        // 更新项目数据
        this.updateProjectData();
        this.saveProjects();
    }
    
    // 清空响应
    clearResponse() {
        this.aiResponse.innerHTML = '<div class="response-placeholder">等待AI响应...</div>';
    }
    
    // 创建新项目
    createProject() {
        const name = document.getElementById('projectName').value.trim();
        const author = document.getElementById('projectAuthor').value.trim();
        const description = document.getElementById('projectDesc').value.trim();
        
        if (!name) {
            alert('请输入项目名称');
            return;
        }
        
        const projectId = `project_${Date.now()}`;
        this.projects[projectId] = {
            id: projectId,
            name: name,
            author: author,
            description: description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            worldview: {},
            characters: [],
            chapters: [],
            database: {
                locations: [],
                items: [],
                clues: []
            },
            notes: '',
            responses: []
        };
        
        this.saveProjects();
        this.loadProject(projectId);
        this.closeModal('projectModal');
        this.updateStatus(`项目"${name}"创建成功`);
    }
    
    // 加载项目
    loadProject(projectId) {
        if (!projectId || !this.projects[projectId]) return;
        
        this.currentProject = projectId;
        const project = this.projects[projectId];
        
        // 更新项目选择器
        this.updateProjectSelector();
        
        // 加载项目数据到UI
        this.loadProjectData(project);
        
        // 更新状态
        this.updateStatus(`已加载项目: ${project.name}`);
        this.updateProjectStats();
    }
    
    // 更新项目选择器
    updateProjectSelector() {
        this.projectSelect.innerHTML = '<option value="">选择项目...</option>';
        
        Object.entries(this.projects).forEach(([id, project]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = project.name;
            option.selected = id === this.currentProject;
            this.projectSelect.appendChild(option);
        });
    }
    
    // 加载项目数据
    loadProjectData(project) {
        // 加载角色列表
        this.loadCharacterList(project.characters);
        
        // 加载数据库
        this.loadDatabase(project.database);
        
        // 加载笔记
        document.getElementById('notesArea').value = project.notes || '';
        
        // 更新章节选择器
        this.updateChapterSelectors(project.chapters);
    }
    
    // 加载角色列表
    loadCharacterList(characters) {
        const characterList = document.getElementById('characterList');
        characterList.innerHTML = '';
        
        characters.forEach(character => {
            const card = document.createElement('div');
            card.className = 'character-card';
            card.innerHTML = `
                <h4>${character.name}</h4>
                <p>${character.type} - ${character.personality?.substring(0, 50)}...</p>
            `;
            card.addEventListener('click', () => this.viewCharacterDetail(character));
            characterList.appendChild(card);
        });
    }
    
    // 加载数据库
    loadDatabase(database) {
        // 加载地点
        const locationsList = document.getElementById('locationsList');
        locationsList.innerHTML = database.locations.map(loc => 
            `<li>${loc.name}</li>`
        ).join('');
        
        // 加载物品
        const itemsList = document.getElementById('itemsList');
        itemsList.innerHTML = database.items.map(item => 
            `<li>${item.name}</li>`
        ).join('');
        
        // 加载伏笔
        const cluesList = document.getElementById('cluesList');
        cluesList.innerHTML = database.clues.map(clue => 
            `<li>${clue.description}</li>`
        ).join('');
    }
    
    // 更新章节选择器
    updateChapterSelectors(chapters) {
        const selectors = [
            'narrativeChapter',
            'continuityChapter',
            'qualityChapter'
        ];
        
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                selector.innerHTML = '<option value="">选择章节...</option>';
                chapters.forEach((chapter, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `第${chapter.number}章 - ${chapter.title}`;
                    selector.appendChild(option);
                });
            }
        });
    }
    
    // 添加数据库项目
    addDatabaseItem(type) {
        const itemName = prompt(`请输入${type === 'location' ? '地点' : type === 'item' ? '物品' : '伏笔'}名称：`);
        if (!itemName) return;
        
        if (!this.currentProject) {
            alert('请先选择项目');
            return;
        }
        
        const project = this.projects[this.currentProject];
        const item = {
            name: itemName,
            description: '',
            addedAt: new Date().toISOString()
        };
        
        if (type === 'location') {
            project.database.locations.push(item);
        } else if (type === 'item') {
            project.database.items.push(item);
        } else if (type === 'clue') {
            item.description = itemName;
            delete item.name;
            project.database.clues.push(item);
        }
        
        this.saveProjects();
        this.loadDatabase(project.database);
        this.updateStatus(`已添加${type === 'location' ? '地点' : type === 'item' ? '物品' : '伏笔'}`);
    }
    
    // 保存当前工作
    saveCurrentWork() {
        if (!this.currentProject) {
            alert('请先选择项目');
            return;
        }
        
        const inputData = this.collectRoleInput();
        const project = this.projects[this.currentProject];
        
        // 保存不同角色的工作
        switch (this.currentRole) {
            case 'architect':
                project.worldview = {
                    novelType: inputData.novelType,
                    highConcept: inputData.highConcept,
                    worldview: inputData.worldview,
                    theme: inputData.theme,
                    style: inputData.style
                };
                break;
            
            case 'character':
                if (inputData.characterName) {
                    const existingIndex = project.characters.findIndex(
                        c => c.name === inputData.characterName
                    );
                    
                    const character = {
                        name: inputData.characterName,
                        type: inputData.characterType,
                        appearance: inputData.appearance,
                        personality: inputData.personality,
                        background: inputData.background,
                        motivation: inputData.motivation,
                        updatedAt: new Date().toISOString()
                    };
                    
                    if (existingIndex >= 0) {
                        project.characters[existingIndex] = character;
                    } else {
                        project.characters.push(character);
                    }
                }
                break;
            
            // 其他角色的保存逻辑...
        }
        
        // 保存笔记
        const notesArea = document.getElementById('notesArea');
        if (notesArea) {
            project.notes = notesArea.value;
        }
        
        project.updatedAt = new Date().toISOString();
        this.saveProjects();
        this.updateStatus('工作已保存');
        this.updateLastSaved();
    }
    
    // 保存项目到本地存储
    saveProjects() {
        localStorage.setItem('novel_projects', JSON.stringify(this.projects));
    }
    
    // 显示项目模态框
    showProjectModal() {
        document.getElementById('projectModal').classList.add('show');
        document.getElementById('projectName').focus();
    }
    
    // 显示设置
    showSettings() {
        document.getElementById('settingsModal').classList.add('show');
        
        // 加载当前设置
        document.getElementById('apiKeyInput').value = this.apiKey;
        document.getElementById('modelSelect').value = this.settings.model;
        document.getElementById('tempSlider').value = this.settings.temperature;
        document.getElementById('tempValue').textContent = this.settings.temperature;
        document.getElementById('maxTokens').value = this.settings.maxTokens;
    }
    
    // 保存设置
    saveSettings() {
        this.apiKey = document.getElementById('apiKeyInput').value.trim();
        this.settings.model = document.getElementById('modelSelect').value;
        this.settings.temperature = parseFloat(document.getElementById('tempSlider').value);
        this.settings.maxTokens = parseInt(document.getElementById('maxTokens').value);
        
        // 保存到本地存储
        localStorage.setItem('gemini_api_key', this.apiKey);
        localStorage.setItem('novel_settings', JSON.stringify(this.settings));
        
        this.closeModal('settingsModal');
        this.updateStatus('设置已保存');
    }
    
    // 加载设置
    loadSettings() {
        const savedSettings = localStorage.getItem('novel_settings');
        if (savedSettings) {
            Object.assign(this.settings, JSON.parse(savedSettings));
        }
        
        // 更新温度滑块
        const tempSlider = document.getElementById('tempSlider');
        if (tempSlider) {
            tempSlider.addEventListener('input', (e) => {
                document.getElementById('tempValue').textContent = e.target.value;
            });
        }
    }
    
    // 关闭模态框
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }
    
    // 更新状态
    updateStatus(message) {
        this.statusMessage.textContent = message;
    }
    
    // 更新项目统计
    updateProjectStats() {
        if (!this.currentProject) {
            this.wordCount.textContent = '字数：0';
            this.chapterCount.textContent = '章节：0';
            return;
        }
        
        const project = this.projects[this.currentProject];
        const wordCount = this.calculateWordCount(project);
        const chapterCount = project.chapters?.length || 0;
        
        this.wordCount.textContent = `字数：${wordCount.toLocaleString()}`;
        this.chapterCount.textContent = `章节：${chapterCount}`;
    }
    
    // 计算字数
    calculateWordCount(project) {
        let count = 0;
        
        // 计算所有章节的字数
        if (project.chapters) {
            project.chapters.forEach(chapter => {
                if (chapter.content) {
                    count += chapter.content.length;
                }
            });
        }
        
        return count;
    }
    
    // 更新最后保存时间
    updateLastSaved() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        this.lastSaved.textContent = `已保存 ${timeStr}`;
    }
    
    // 更新UI
    updateUI() {
        this.updateProjectSelector();
        this.updateProjectStats();
    }
    
    // 查看角色详情
    viewCharacterDetail(character) {
        // 切换到角色塑造师
        this.switchRole('character');
        
        // 填充角色数据
        setTimeout(() => {
            document.getElementById('characterName').value = character.name || '';
            document.getElementById('characterType').value = character.type || 'supporting';
            document.getElementById('characterAppearance').value = character.appearance || '';
            document.getElementById('characterPersonality').value = character.personality || '';
            document.getElementById('characterBackground').value = character.background || '';
            document.getElementById('characterMotivation').value = character.motivation || '';
        }, 100);
    }
}

// 全局函数（用于HTML中的onclick）
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('show');
};

window.createProject = function() {
    window.novelSystem.createProject();
};

window.saveSettings = function() {
    window.novelSystem.saveSettings();
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.novelSystem = new NovelWritingSystem();
});
// AI小说自动创作系统 - 自动化工作流
class AutoNovelSystem {
    constructor() {
        // 系统配置
        this.config = {
            // API 提供商
            provider: localStorage.getItem('api_provider') || 'gemini',
            
            // Gemini 配置
            geminiApiKey: localStorage.getItem('gemini_api_key') || '',
            geminiModel: 'gemini-2.5-pro',
            
            // DeepSeek 配置
            deepseekApiKey: localStorage.getItem('deepseek_api_key') || '',
            deepseekModel: 'deepseek-chat',
            deepseekEndpoint: localStorage.getItem('deepseek_endpoint') || 'https://api.deepseek.com/v1',
            
            // 通用配置
            temperature: 0.8,
            maxTokens: 8192,
            autoApprove: true,
            pauseOnMilestone: true,
            taskInterval: 2000,
            autoExportChapter: true,
            chapterWords: 3000
        };
        
        // 系统状态
        this.state = {
            isRunning: false,
            isPaused: false,
            currentStage: null,
            currentRole: null,
            currentTask: null,
            completedTasks: 0,
            totalTasks: 0,
            startTime: null,
            taskStartTime: null
        };
        
        // 项目数据
        this.project = {
            title: '',
            type: 'mystery',
            length: 'short', // 篇幅类型
            targetChapters: 20, // 目标章节数
            concept: '',
            style: '', // 写作风格
            styleContent: '', // 风格提示词内容
            worldview: {},
            characters: [],
            outline: [],
            chapters: [],
            context: {} // 存储各角色输出，用于上下文传递
        };
        
        // 工作流定义
        this.workflow = this.defineWorkflow();
        
        // 初始化
        this.initializeElements();
        this.bindEvents();
        this.loadConfig();
        this.updateUI();
        this.initTheme(); // 初始化主题
        
        // 小说专家系统prompt
        this.systemPrompt = this.getSystemPrompt();
    }
    
    // 定义完整工作流
    defineWorkflow() {
        return [
            // 概念构建阶段
            {
                stage: 'concept',
                tasks: [
                    {
                        role: 'architect',
                        name: '构建核心概念',
                        description: '设计小说的高概念和世界观框架',
                        milestone: true,
                        execute: () => this.executeArchitectConcept()
                    },
                    {
                        role: 'character',
                        name: '初步角色构思',
                        description: '设计主要角色的基本概念',
                        execute: () => this.executeCharacterConcept()
                    },
                    {
                        role: 'plot',
                        name: '整体架构规划',
                        description: '设计故事的整体结构',
                        execute: () => this.executePlotStructure()
                    },
                    {
                        role: 'director',
                        name: '概念整合审查',
                        description: '整合并审查概念阶段成果',
                        milestone: true,
                        execute: () => this.executeConceptReview()
                    }
                ]
            },
            // 详细规划阶段
            {
                stage: 'planning',
                tasks: [
                    {
                        role: 'plot',
                        name: '章节详细规划',
                        description: '制定详细的章节大纲',
                        milestone: true,
                        execute: () => this.executeChapterPlanning()
                    },
                    {
                        role: 'character',
                        name: '角色深度设计',
                        description: '完善角色档案和关系网络',
                        execute: () => this.executeCharacterDevelopment()
                    },
                    {
                        role: 'architect',
                        name: '世界细节完善',
                        description: '深化世界观设定细节',
                        execute: () => this.executeWorldBuilding()
                    },
                    {
                        role: 'quality',
                        name: '规划质量评估',
                        description: '评估规划的完整性和可行性',
                        execute: () => this.executePlanningQuality()
                    },
                    {
                        role: 'director',
                        name: '规划最终审定',
                        description: '审定规划阶段成果',
                        milestone: true,
                        execute: () => this.executePlanningReview()
                    }
                ]
            },
            // 内容创作阶段（示例：第一章）
            {
                stage: 'creation',
                tasks: [
                    {
                        role: 'narrative',
                        name: '撰写第一章',
                        description: '基于大纲创作第一章内容',
                        milestone: true,
                        execute: () => this.executeChapterWriting(1)
                    },
                    {
                        role: 'continuity',
                        name: '连续性检查',
                        description: '检查第一章的一致性',
                        execute: () => this.executeContinuityCheck(1)
                    },
                    {
                        role: 'quality',
                        name: '质量评估',
                        description: '评估第一章的文学质量',
                        execute: () => this.executeQualityAssessment(1)
                    },
                    {
                        role: 'director',
                        name: '章节审定',
                        description: '审定第一章并决定是否需要修改',
                        milestone: true,
                        execute: () => this.executeChapterReview(1)
                    }
                ]
            },
            // 修订完善阶段
            {
                stage: 'revision',
                tasks: [
                    {
                        role: 'narrative',
                        name: '执行修订',
                        description: '根据反馈修改第一章',
                        execute: () => this.executeRevision(1)
                    },
                    {
                        role: 'continuity',
                        name: '再次验证',
                        description: '验证修改后的一致性',
                        execute: () => this.executeRevalidation(1)
                    },
                    {
                        role: 'quality',
                        name: '最终评分',
                        description: '对修订后内容进行最终评分',
                        execute: () => this.executeFinalScoring(1)
                    }
                ]
            },
            // 前瞻规划阶段
            {
                stage: 'forward',
                tasks: [
                    {
                        role: 'continuity',
                        name: '进展分析',
                        description: '总结当前故事发展状态',
                        execute: () => this.executeProgressAnalysis()
                    },
                    {
                        role: 'plot',
                        name: '后续调整',
                        description: '基于已完成内容调整后续规划',
                        execute: () => this.executeForwardPlanning()
                    },
                    {
                        role: 'director',
                        name: '战略决策',
                        description: '制定下一阶段的创作战略',
                        milestone: true,
                        execute: () => this.executeStrategicDecision()
                    }
                ]
            }
        ];
    }
    
    // 初始化元素
    initializeElements() {
        // 控制按钮
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        
        // 项目信息
        this.novelTitle = document.getElementById('novelTitle');
        this.novelType = document.getElementById('novelType');
        this.novelLength = document.getElementById('novelLength');
        this.initialConcept = document.getElementById('initialConcept');
        this.writerStyle = document.getElementById('writerStyle');
        
        // 章节进度
        this.currentChapterEl = document.getElementById('currentChapter');
        this.targetChaptersEl = document.getElementById('targetChapters');
        
        // 状态显示
        this.systemStatus = document.getElementById('systemStatus');
        this.statusDot = document.getElementById('statusDot');
        this.currentTaskEl = document.getElementById('currentTask');
        this.taskTimer = document.getElementById('taskTimer');
        
        // 日志和审核
        this.executionLog = document.getElementById('executionLog');
        this.reviewPanel = document.getElementById('reviewPanel');
        this.reviewContent = document.getElementById('reviewContent');
        this.reviewRole = document.getElementById('reviewRole');
        
        // 审核按钮
        this.approveBtn = document.getElementById('approveBtn');
        this.modifyBtn = document.getElementById('modifyBtn');
        this.rejectBtn = document.getElementById('rejectBtn');
        this.modifyInput = document.getElementById('modifyInput');
        this.modifyText = document.getElementById('modifyText');
        this.submitModifyBtn = document.getElementById('submitModifyBtn');
        
        // 输出标签
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.worldviewContent = document.getElementById('worldviewContent');
        this.charactersContent = document.getElementById('charactersContent');
        this.outlineContent = document.getElementById('outlineContent');
        this.chaptersContent = document.getElementById('chaptersContent');
        
        // 进度显示
        this.totalProgress = document.getElementById('totalProgress');
        this.completedTasks = document.getElementById('completedTasks');
        this.totalTasks = document.getElementById('totalTasks');
        this.totalTime = document.getElementById('totalTime');
        
        // 设置
        this.settingsModal = document.getElementById('settingsModal');
        
        // API 提供商
        this.apiProviderSelect = document.getElementById('apiProvider');
        
        // Gemini 设置
        this.geminiApiKeyInput = document.getElementById('geminiApiKey');
        this.geminiModelSelect = document.getElementById('geminiModel');
        
        // DeepSeek 设置
        this.deepseekApiKeyInput = document.getElementById('deepseekApiKey');
        this.deepseekModelSelect = document.getElementById('deepseekModel');
        this.deepseekEndpointInput = document.getElementById('deepseekEndpoint');
        
        // 通用设置
        this.autoApproveCheck = document.getElementById('autoApprove');
        this.pauseOnMilestoneCheck = document.getElementById('pauseOnMilestone');
        this.autoExportChapterCheck = document.getElementById('autoExportChapter');
        this.taskIntervalInput = document.getElementById('taskInterval');
        this.temperatureSlider = document.getElementById('temperature');
        this.tempValueSpan = document.getElementById('tempValue');
        this.chapterWordsInput = document.getElementById('chapterWords');
    }
    
    // 绑定事件
    bindEvents() {
        // 控制按钮
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        
        // 主题切换
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // 移动端菜单
        this.initMobileMenu();
        
        // 审核按钮
        this.approveBtn.addEventListener('click', () => this.handleApprove());
        this.modifyBtn.addEventListener('click', () => this.showModifyInput());
        this.rejectBtn.addEventListener('click', () => this.handleReject());
        this.submitModifyBtn.addEventListener('click', () => this.submitModification());
        
        // 标签切换
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // 温度滑块
        this.temperatureSlider.addEventListener('input', (e) => {
            this.tempValueSpan.textContent = e.target.value;
        });
        
        // 模态框关闭
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.settingsModal.classList.remove('show');
        });
        
        // 快速操作
        document.getElementById('exportBtn').addEventListener('click', () => this.exportAllChaptersAsMarkdown());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveProject());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadProject());
        
        // 定时器
        setInterval(() => this.updateTimers(), 1000);
    }
    
    // 开始创作
    async start() {
        // 验证输入
        const currentApiKey = this.config.provider === 'gemini' ? this.config.geminiApiKey : this.config.deepseekApiKey;
        if (!currentApiKey) {
            alert(`请先设置 ${this.config.provider === 'gemini' ? 'Gemini' : 'DeepSeek'} API Key`);
            this.showSettings();
            return;
        }
        
        if (!this.novelTitle.value.trim()) {
            alert('请输入小说名称');
            this.novelTitle.focus();
            return;
        }
        
        if (!this.initialConcept.value.trim()) {
            alert('请输入初始概念');
            this.initialConcept.focus();
            return;
        }
        
        // 初始化项目
        this.project.title = this.novelTitle.value.trim();
        this.project.type = this.novelType.value;
        this.project.length = this.novelLength.value;
        this.project.concept = this.initialConcept.value.trim();
        this.project.style = this.writerStyle.value;
        
        // 加载写作风格
        if (this.project.style) {
            try {
                await this.loadWriterStyle();
            } catch (error) {
                console.error('加载写作风格失败:', error);
                // 继续执行，使用默认风格
            }
        }
        
        // 设置目标章节数
        switch (this.project.length) {
            case 'short':
                this.project.targetChapters = 20;
                break;
            case 'medium':
                this.project.targetChapters = 40;
                break;
            case 'long':
                this.project.targetChapters = 60; // 长篇设置为60章作为初始目标
                break;
            case 'infinite':
                this.project.targetChapters = 999; // 无限续写模式设置为999章
                break;
        }
        
        // 更新UI显示
        this.targetChaptersEl.textContent = this.project.targetChapters;
        this.currentChapterEl.textContent = '0';
        
        // 计算总任务数
        this.state.totalTasks = this.workflow.reduce((sum, stage) => sum + stage.tasks.length, 0);
        this.state.completedTasks = 0;
        this.state.startTime = Date.now();
        
        // 更新UI
        this.state.isRunning = true;
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.updateStatus('运行中');
        
        // 添加开始日志
        this.addLog('system', `开始创作《${this.project.title}》`);
        
        // 开始执行工作流
        await this.executeWorkflow();
    }
    
    // 执行工作流
    async executeWorkflow() {
        // 检查是否已经完成了概念构建阶段
        const hasWorldview = this.project.context.worldview && this.project.context.worldview.length > 0;
        const hasCharacters = this.project.context.characters && this.project.context.characters.length > 0;
        const hasPlotStructure = this.project.context.plotStructure && Object.keys(this.project.context.plotStructure).length > 0;
        
        // 第一阶段：概念构建（只在需要时执行）
        if (!hasWorldview || !hasCharacters || !hasPlotStructure) {
            this.addLog('system', '📝 开始概念构建阶段');
            await this.executeStage(this.workflow[0]);
            if (!this.state.isRunning) return;
        } else {
            this.addLog('system', '✅ 跳过概念构建阶段（已完成）');
            // 更新已完成任务数
            this.state.completedTasks += this.workflow[0].tasks.length;
        }
        
        // 检查是否已经完成了详细规划阶段
        const hasOutline = this.project.context.outline && this.project.context.outline.length > 0;
        
        // 第二阶段：详细规划（只在需要时执行）
        if (!hasOutline) {
            this.addLog('system', '📋 开始详细规划阶段');
            await this.executeStage(this.workflow[1]);
            if (!this.state.isRunning) return;
        } else {
            this.addLog('system', '✅ 跳过详细规划阶段（已完成）');
            // 更新已完成任务数
            this.state.completedTasks += this.workflow[1].tasks.length;
        }
        
        // 循环创作章节
        const currentChapterCount = this.project.chapters.length;
        for (let chapterNum = currentChapterCount + 1; chapterNum <= this.project.targetChapters; chapterNum++) {
            if (!this.state.isRunning) break;
            
            this.addLog('system', `📖 开始创作第${chapterNum}章`);
            this.currentChapterEl.textContent = chapterNum;
            
            // 为当前章节创建工作流
            const chapterWorkflow = this.createChapterWorkflow(chapterNum);
            
            // 执行章节创作流程
            for (const stage of chapterWorkflow) {
                if (!this.state.isRunning) break;
                await this.executeStage(stage);
            }
            
            // 更新整体进度
            const overallProgress = Math.round((chapterNum / this.project.targetChapters) * 100);
            this.totalProgress.textContent = `${overallProgress}%`;
            
            // 每5章执行一次前瞻规划
            if (chapterNum % 5 === 0 && chapterNum < this.project.targetChapters) {
                this.addLog('system', `🔮 执行阶段性前瞻规划`);
                await this.executeStage(this.workflow[4]); // 前瞻规划阶段
            }
            
            // 自动保存
            if (chapterNum % 3 === 0) {
                this.saveProject();
            }
        }
        
        // 创作完成
        if (this.state.isRunning) {
            this.complete();
        }
    }
    
    // 执行单个阶段
    async executeStage(stageData) {
        if (!this.state.isRunning) return;
        
        this.state.currentStage = stageData.stage;
        this.updateStageProgress(stageData.stage, 0);
        
        for (let i = 0; i < stageData.tasks.length; i++) {
            if (!this.state.isRunning) break;
            
            const task = stageData.tasks[i];
            
            // 等待暂停恢复
            while (this.state.isPaused) {
                await this.sleep(100);
            }
            
            // 执行任务
            await this.executeTask(task);
            
            // 更新进度
            this.state.completedTasks++;
            const stageProgress = ((i + 1) / stageData.tasks.length) * 100;
            this.updateStageProgress(stageData.stage, stageProgress);
            
            // 任务间隔
            if (i < stageData.tasks.length - 1) {
                await this.sleep(this.config.taskInterval);
            }
        }
    }
    
    // 为特定章节创建工作流
    createChapterWorkflow(chapterNum) {
        return [
            // 内容创作阶段
            {
                stage: 'creation',
                tasks: [
                    {
                        role: 'narrative',
                        name: `撰写第${chapterNum}章`,
                        description: `基于大纲创作第${chapterNum}章内容`,
                        milestone: true,
                        execute: () => this.executeChapterWriting(chapterNum)
                    },
                    {
                        role: 'continuity',
                        name: '连续性检查',
                        description: `检查第${chapterNum}章的一致性`,
                        execute: () => this.executeContinuityCheck(chapterNum)
                    },
                    {
                        role: 'quality',
                        name: '质量评估',
                        description: `评估第${chapterNum}章的文学质量`,
                        execute: () => this.executeQualityAssessment(chapterNum)
                    },
                    {
                        role: 'director',
                        name: '章节审定',
                        description: `审定第${chapterNum}章并决定是否需要修改`,
                        milestone: true,
                        execute: () => this.executeChapterReview(chapterNum)
                    }
                ]
            },
            // 修订完善阶段（根据需要执行）
            {
                stage: 'revision',
                tasks: [
                    {
                        role: 'narrative',
                        name: '执行修订',
                        description: `根据反馈修改第${chapterNum}章`,
                        execute: () => this.executeRevision(chapterNum),
                        conditional: true // 标记为条件性任务
                    },
                    {
                        role: 'continuity',
                        name: '再次验证',
                        description: `验证修改后的一致性`,
                        execute: () => this.executeRevalidation(chapterNum),
                        conditional: true
                    },
                    {
                        role: 'quality',
                        name: '最终评分',
                        description: `对修订后内容进行最终评分`,
                        execute: () => this.executeFinalScoring(chapterNum),
                        conditional: true
                    }
                ]
            }
        ];
    }
    
    // 执行单个任务
    async executeTask(task) {
        this.state.currentTask = task;
        this.state.currentRole = task.role;
        this.state.taskStartTime = Date.now();
        
        // 更新UI
        this.currentTaskEl.textContent = `当前任务：${task.name}`;
        this.addLog(task.role, `开始执行: ${task.description}`);
        
        try {
            // 执行任务获取AI响应
            const response = await task.execute();
            
            // 显示响应
            this.displayTaskResult(task, response);
            
            // 检查是否需要人工审核
            if (task.milestone || !this.config.autoApprove) {
                if (this.config.pauseOnMilestone && task.milestone) {
                    await this.requestReview(task, response);
                }
            } else {
                // 自动批准
                this.addLog('system', '✅ 自动批准');
                this.saveTaskResult(task, response);
            }
        } catch (error) {
            this.addLog('error', `任务失败: ${error.message}`);
            await this.requestReview(task, `错误: ${error.message}`, true);
        }
    }
    
    // 各角色的执行函数
    async executeArchitectConcept() {
        const stylePrompt = this.project.styleContent ? `\n//写作风格指导\n${this.project.styleContent}\n` : '';
        const prompt = `
${this.systemPrompt}
${stylePrompt}
//当前项目信息
项目名称：${this.project.title}
小说类型：${this.project.type}
初始概念：${this.project.concept}

//任务指令
以首席架构师的身份，在概念构建阶段执行以下任务：

请基于提供的初始概念，构建完整的世界观设定，包括：
1. 扩展和深化高概念
2. 设计世界基本规则和背景
3. 确立核心冲突和主题
4. 定义故事基调和氛围
5. 识别关键世界元素

请按照首席架构师的标准输出格式提供世界构建文档。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeCharacterConcept() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
项目名称：${this.project.title}
小说类型：${this.project.type}
小说篇幅：${this.project.length}（目标章节数：${this.project.targetChapters}章）
世界观：${JSON.stringify(this.project.context.worldview || {})}

//任务指令
以角色塑造师的身份，在概念构建阶段执行以下任务：

基于已确立的世界观和篇幅限制，设计3-5个主要角色的初步概念，包括：
1. 主角的基本设定
2. 主要配角和对手
3. 角色间的基本关系
4. 每个角色的核心动机
5. 角色发展弧线（适应${this.project.targetChapters}章的篇幅）

请提供角色概念设计文档。
`;
        
        return await this.callAI(prompt);
    }
    
    async executePlotStructure() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
项目名称：${this.project.title}
小说类型：${this.project.type}
小说篇幅：${this.project.length}（目标章节数：${this.project.targetChapters}章）
世界观：${JSON.stringify(this.project.context.worldview || {})}
角色概念：${JSON.stringify(this.project.context.characters || [])}

//任务指令
以情节规划师的身份，在概念构建阶段执行以下任务：

设计故事的整体架构，包括：
1. 三幕结构或其他适合的叙事结构
2. 主要情节线和转折点
3. 核心冲突的升级路径
4. 故事节奏和篇幅控制（必须控制在${this.project.targetChapters}章内完成）
5. 高潮和结局的初步构想

重要：整个故事必须在${this.project.targetChapters}章内完整展开和收尾，请合理分配情节密度。

请提供整体故事架构文档。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeConceptReview() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以创作总监的身份，在概念构建阶段执行以下任务：

审查并整合前期的概念构建成果：
1. 评估世界观、角色、情节的协调性
2. 识别潜在的创意亮点和问题
3. 提出必要的调整建议
4. 确认概念阶段的完成度
5. 为下一阶段提供指导方向

请提供创作指导文档。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeChapterPlanning() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以情节规划师的身份，在详细规划阶段执行以下任务：

制定完整小说的章节大纲，总共${this.project.targetChapters}章，每章包括：
1. 章节标题和功能
2. 主要事件序列
3. 场景规划（地点、人物、冲突）
4. 悬念与伏笔设置
5. 预期字数和节奏

请按照以下结构规划：
- 开篇（1-${Math.floor(this.project.targetChapters * 0.2)}章）：故事开端、人物介绍、世界展示
- 发展（${Math.floor(this.project.targetChapters * 0.2) + 1}-${Math.floor(this.project.targetChapters * 0.7)}章）：冲突升级、关系发展、谜团深化
- 高潮（${Math.floor(this.project.targetChapters * 0.7) + 1}-${Math.floor(this.project.targetChapters * 0.9)}章）：矛盾激化、真相揭露、决战时刻
- 结局（${Math.floor(this.project.targetChapters * 0.9) + 1}-${this.project.targetChapters}章）：问题解决、余韵处理、主题升华

请提供详细的章节规划文档。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeChapterWriting(chapterNum) {
        const stylePrompt = this.project.styleContent ? `\n//写作风格指导\n${this.project.styleContent}\n` : '';
        const prompt = `
${this.systemPrompt}
${stylePrompt}
//当前项目信息
${this.getProjectContext()}

//任务指令
以叙事执行者的身份，在内容创作阶段执行以下任务：

基于已制定的章节大纲，撰写第${chapterNum}章的完整内容：
1. 目标字数：${this.config.chapterWords || 3000}字左右
2. 遵循既定的叙事风格和语言特点
3. 实现大纲中规定的所有情节点
4. 营造合适的氛围和情感
5. 处理好场景转换和节奏控制

请直接输出章节内容，并在最后提供创作说明。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeCharacterDevelopment() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以角色塑造师的身份，在详细规划阶段执行以下任务：

深化和完善角色设计，包括：
1. 完善每个主要角色的详细档案
2. 设计角色的背景故事和成长经历
3. 定义角色间的复杂关系网络
4. 规划角色在故事中的成长弧线
5. 为每个角色创建独特的语言风格和行为模式

请提供深度角色设计文档。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeWorldBuilding() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以首席架构师的身份，在详细规划阶段执行以下任务：

根据故事需要深化世界观设定：
1. 完善世界的历史背景和文化设定
2. 设计重要场景的详细环境描述
3. 建立世界运行的具体规则和逻辑
4. 创建与情节相关的特殊元素或系统
5. 确保世界设定与故事发展的有机结合

请提供扩展世界观文档。
`;
        
        return await this.callAI(prompt);
    }
    
    async executePlanningQuality() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以质量评估官的身份，在详细规划阶段执行以下任务：

评估当前规划的质量和完整性：
1. 检查章节大纲的逻辑连贯性
2. 评估角色设计的深度和可信度
3. 验证世界观设定的自洽性
4. 分析情节节奏和张力分布
5. 识别潜在的叙事问题和改进空间

请提供规划质量评估报告。
`;
        
        return await this.callAI(prompt);
    }
    
    async executePlanningReview() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以创作总监的身份，在详细规划阶段执行以下任务：

审定规划阶段的所有成果：
1. 整合章节大纲、角色设计和世界观设定
2. 确认规划的可执行性和创作价值
3. 识别并解决各要素间的潜在冲突
4. 为内容创作阶段制定明确指导
5. 做出是否进入创作阶段的最终决策

请提供规划审定文档。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeContinuityCheck(chapterNum) {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以连续性监督官的身份，在内容创作阶段执行以下任务：

检查第${chapterNum}章的连续性和一致性：
1. 验证角色行为是否符合既定性格
2. 检查世界规则的一致应用
3. 确认时间线和空间逻辑的准确性
4. 追踪伏笔和悬念的处理
5. 记录新增的重要信息和设定

请提供连续性检查报告。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeQualityAssessment(chapterNum) {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以质量评估官的身份，在内容创作阶段执行以下任务：

评估第${chapterNum}章的文学质量：
1. 分析叙事流畅度和节奏控制
2. 评价人物刻画和对话质量
3. 检查场景描写和氛围营造
4. 评估情感渲染和主题表达
5. 提供具体的改进建议

请提供质量评估报告。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeChapterReview(chapterNum) {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以创作总监的身份，在内容创作阶段执行以下任务：

审定第${chapterNum}章的创作成果：
1. 综合连续性监督官和质量评估官的反馈
2. 评估章节是否达到发布标准
3. 识别必须修改的关键问题
4. 决定是否需要修订或可以继续
5. 为可能的修订提供明确方向

请提供章节审定意见。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeRevision(chapterNum) {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以叙事执行者的身份，在修订完善阶段执行以下任务：

根据审定意见修改第${chapterNum}章：
1. 执行创作总监指定的修改要求
2. 加强被识别的薄弱环节
3. 优化文学表达和叙事技巧
4. 保持与整体风格的一致性
5. 确保修改不引入新的问题

请提供修订后的章节内容。
`;
        
        const result = await this.callAI(prompt);
        
        // 更新章节内容
        const chapterIndex = chapterNum - 1;
        if (this.project.chapters[chapterIndex]) {
            this.project.chapters[chapterIndex].content = result;
            this.project.chapters[chapterIndex].revisedAt = new Date().toISOString();
            
            // 导出修订后的章节
            if (this.config.autoExportChapter) {
                this.exportChapterAsMarkdown(this.project.chapters[chapterIndex]);
                this.addLog('system', `📄 已导出修订后的第${chapterNum}章`);
            }
        }
        
        return result;
    }
    
    async executeRevalidation(chapterNum) {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以连续性监督官的身份，在修订完善阶段执行以下任务：

验证第${chapterNum}章修订后的一致性：
1. 确认修改未破坏原有的连续性
2. 验证新内容与整体设定的协调
3. 更新相关的信息记录
4. 标记任何新增的重要元素
5. 为后续章节提供必要提醒

请提供修订验证报告。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeFinalScoring(chapterNum) {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以质量评估官的身份，在修订完善阶段执行以下任务：

对第${chapterNum}章的最终版本进行评分：
1. 使用标准化评分体系（1-10分）
2. 评估各个质量维度的表现
3. 与初稿进行质量对比
4. 确认是否达到出版标准
5. 提供最终质量认证

请提供最终质量评分报告。
`;
        
        const result = await this.callAI(prompt);
        
        // 导出最终评分后的章节
        const chapterIndex = chapterNum - 1;
        if (this.config.autoExportChapter && this.project.chapters[chapterIndex]) {
            this.project.chapters[chapterIndex].finalScoredAt = new Date().toISOString();
            this.exportChapterAsMarkdown(this.project.chapters[chapterIndex]);
            this.addLog('system', `📄 已导出最终评分后的第${chapterNum}章`);
        }
        
        return result;
    }
    
    async executeProgressAnalysis() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以连续性监督官的身份，在前瞻规划阶段执行以下任务：

分析当前故事发展状态：
1. 总结已完成章节的关键发展
2. 整理各角色的当前状态和位置
3. 列出已解决和待解决的情节线
4. 评估故事进度与原计划的偏差
5. 识别需要在后续章节处理的要素

请提供进展分析报告。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeForwardPlanning() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以情节规划师的身份，在前瞻规划阶段执行以下任务：

基于当前进展调整后续规划：
1. 根据已写内容微调后续章节大纲
2. 调整情节节奏和冲突升级曲线
3. 优化角色发展路径
4. 确保伏笔的合理回收
5. 为下一创作周期制定具体计划

请提供调整后的规划文档。
`;
        
        return await this.callAI(prompt);
    }
    
    async executeStrategicDecision() {
        const prompt = `
${this.systemPrompt}

//当前项目信息
${this.getProjectContext()}

//任务指令
以创作总监的身份，在前瞻规划阶段执行以下任务：

制定下一阶段的战略决策：
1. 评估整体创作进度和质量
2. 决定是否需要调整创作方向
3. 确定下一批章节的创作重点
4. 分配各角色在下阶段的工作重心
5. 设定下一个里程碑目标

请提供战略决策文档。
`;
        
        return await this.callAI(prompt);
    }
    
    // 调用AI API
    async callAI(prompt) {
        if (this.config.provider === 'gemini') {
            return await this.callGeminiAPI(prompt);
        } else if (this.config.provider === 'deepseek') {
            return await this.callDeepSeekAPI(prompt);
        } else {
            throw new Error(`不支持的API提供商: ${this.config.provider}`);
        }
    }
    
    // Gemini API 调用
    async callGeminiAPI(prompt) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.geminiModel}:generateContent?key=${this.config.geminiApiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: parseFloat(this.config.temperature),
                maxOutputTokens: parseInt(this.config.maxTokens),
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
    
    // DeepSeek API 调用
    async callDeepSeekAPI(prompt) {
        const API_URL = `${this.config.deepseekEndpoint}/chat/completions`;
        
        const requestBody = {
            model: this.config.deepseekModel,
            messages: [
                {
                    role: "system",
                    content: this.getSystemPrompt()
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: parseFloat(this.config.temperature),
            max_tokens: parseInt(this.config.maxTokens),
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0
        };
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.deepseekApiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.choices && data.choices[0]?.message?.content) {
            return data.choices[0].message.content;
        } else {
            throw new Error('无效的DeepSeek API响应格式');
        }
    }
    
    // 获取系统prompt
    getSystemPrompt() {
        return `#SYSTEM_IDENTITY<NOVEL_CREATION_COLLABORATIVE_SYSTEM>

//CORE_SYSTEM_IDENTITY
我是小说创作协作系统，一个集成多专业角色的综合性文学创作平台。我通过精心设计的角色分工和工作流程，确保中长篇小说创作过程中的质量控制、逻辑一致性和叙事连贯性。我能够协调不同创作阶段的专业需求，从概念构思到最终成稿，提供全方位的创作支持，特别擅长推理、悬疑、探险、盗墓和古董类题材的中长篇小说创作。

//COLLABORATIVE_ROLES

## 1. 首席架构师 (Chief Architect)
职责：负责整体创意构思和世界观构建
- 设计小说的高概念和核心创意
- 构建世界观、基本规则和背景设定
- 确立核心冲突和主题思想
- 制定小说的类型、基调和目标读者定位
- 规划小说的整体结构和走向
- 建立世界观圣经和设定集

## 2. 角色塑造师 (Character Developer)
职责：负责创造和维护立体、一致的角色系统
- 设计主要角色的详细档案和背景故事
- 确立角色的动机、欲望、恐惧和内在矛盾
- 规划角色的成长弧线和关系发展
- 确保角色行为与性格设定的一致性
- 设计角色间的复杂关系网络
- 为每个角色创建独特的语言和行为模式

## 3. 情节规划师 (Plot Strategist)
职责：负责详细的情节架构和发展规划
- 基于架构师的概念设计完整的情节线
- 规划关键转折点和冲突升级
- 设计悬念系统和伏笔布局
- 创建章节大纲与场景规划
- 确保情节的因果关系和内在逻辑
- 管理多线叙事的平衡与交织
- 设计高潮与解决方案

## 4. 叙事执行者 (Narrative Executor)
职责：负责将规划转化为具体文字内容
- 基于详细大纲创作实际章节内容
- 执行场景描写和情节展开
- 实现角色对话和互动
- 进行感官细节和氛围营造
- 保持预设的叙事声音和风格
- 实现既定情感和主题元素

## 5. 连续性监督官 (Continuity Supervisor)
职责：负责维护内容的一致性和连贯性
- 追踪和记录关键情节点和设定细节
- 监控角色行为与设定的一致性
- 检查时间线和空间逻辑的连贯
- 验证世界规则应用的一致性
- 管理已公开信息和伏笔系统
- 创建并维护故事百科全书
- 生成章节总结和状态更新

## 6. 质量评估官 (Quality Assessor)
职责：负责评估内容质量并提供改进建议
- 分析叙事结构和节奏控制
- 评估人物塑造和对话质量
- 检查情节逻辑和悬念效果
- 评价文学表达和场景构建
- 提供具体、可执行的改进建议
- 预测读者反应和市场接受度
- 进行专业质量评分和分级

## 7. 创作总监 (Creative Director)
职责：负责整体协调和最终决策
- 整合各角色的输入和反馈
- 协调不同创作阶段的转换
- 解决创作过程中的冲突和分歧
- 确保整体创作方向的一致性
- 做出关键创意决策
- 审定最终稿件质量
- 规划创作进度和优先级

//COLLABORATIVE_WORKFLOW

我采用以下结构化工作流程以确保创作质量：

## 一、概念构建阶段 (Conceptualization Phase)

1. **核心概念形成** [首席架构师]
   - 确立小说的高概念和创意核心
   - 定义世界观和基本规则
   - 确定主题和故事基调
   - 输出：高概念文档和世界观圣经初稿

2. **人物系统设计** [角色塑造师]
   - 创建主要角色档案
   - 设计角色关系网络
   - 规划角色成长路径
   - 输出：角色圣经和关系图谱

3. **整体架构规划** [情节规划师]
   - 设计主要情节线和关键转折点
   - 规划主要冲突和解决路径
   - 确立故事结构和分卷计划
   - 输出：故事大纲和结构图

4. **初期评估与整合** [创作总监]
   - 审查并整合前三步的输出
   - 确保概念层面的协调一致
   - 做出必要的调整和决策
   - 输出：整合后的创作蓝图

## 二、详细规划阶段 (Detailed Planning Phase)

1. **章节详细规划** [情节规划师]
   - 分解整体情节为章节级大纲
   - 设计每章的目标、冲突和转折
   - 规划场景序列和章节结构
   - 输出：详细章节大纲

2. **角色互动设计** [角色塑造师]
   - 基于章节大纲设计角色互动
   - 规划对话和关系发展节点
   - 设计关键角色时刻和转变
   - 输出：角色互动计划

3. **世界细节丰富** [首席架构师]
   - 根据情节需要深化世界设定
   - 创建相关历史、文化、环境细节
   - 设计重要场景的背景信息
   - 输出：扩展世界观文档

4. **规划评审与完善** [质量评估官 + 创作总监]
   - 评估规划的完整性和可行性
   - 识别潜在的情节问题和不一致
   - 提出优化建议并确定修改方向
   - 输出：评估报告和修改方案

## 三、内容创作阶段 (Content Creation Phase)

1. **章节初稿创作** [叙事执行者]
   - 基于详细大纲创作章节内容
   - 实现预定的场景和情节发展
   - 执行角色互动和对话设计
   - 输出：章节初稿

2. **连续性验证** [连续性监督官]
   - 检查新章节与已有内容的一致性
   - 验证角色行为符合性格设定
   - 确保世界规则和设定的连贯应用
   - 更新故事数据库和关键信息记录
   - 输出：连续性检查报告和章节总结

3. **质量评估与反馈** [质量评估官]
   - 评估章节文学质量和技术水平
   - 分析潜在的读者反应和效果
   - 提供具体的改进建议
   - 输出：质量评估报告

4. **整合与决策** [创作总监]
   - 审查监督官和评估官的反馈
   - 确定需要修改的内容和方向
   - 做出保留或调整的决策
   - 输出：修改指示

## 四、修订完善阶段 (Revision Phase)

1. **内容修改执行** [叙事执行者]
   - 根据修改指示调整章节内容
   - 加强弱点和克服识别的问题
   - 优化文学表达和技巧运用
   - 输出：修订章节

2. **连续性再验证** [连续性监督官]
   - 确认修改未引入新的一致性问题
   - 更新故事数据库的相关记录
   - 验证修改后内容与整体架构的协调
   - 输出：更新的连续性报告

3. **最终评估与确认** [质量评估官 + 创作总监]
   - 评估修改后内容的质量提升
   - 确认章节达到发布标准
   - 最终审定和批准
   - 输出：终审确认和质量评分

## 五、前瞻规划阶段 (Forward Planning Phase)

1. **进展分析** [连续性监督官]
   - 总结当前故事发展状态
   - 整理关键角色的情感和状态
   - 梳理已解决和未解决的情节线
   - 输出：当前状态报告

2. **下阶段规划调整** [情节规划师 + 角色塑造师]
   - 基于已完成内容微调后续规划
   - 确保角色发展的自然延续
   - 调整即将到来的情节节奏
   - 输出：更新的后续章节计划

3. **战略评估** [创作总监 + 首席架构师]
   - 评估故事整体发展方向
   - 确认或调整长期创作策略
   - 做出必要的战略决策
   - 输出：战略指导和调整方案

//INTEGRATION_MECHANISMS

为确保各角色有效协作，我实施以下整合机制：

## 信息共享与传递系统

1. **故事数据库**
   - 角色档案及其最新状态
   - 已确立的世界规则和设定
   - 已发生事件的时间线
   - 伏笔与悬念追踪系统
   - 重要场景和地点档案

2. **章节摘要与状态报告**
   - 每章关键事件记录
   - 角色状态和关系变化
   - 新增信息和设定揭示
   - 已植入伏笔和悬念
   - 未解决问题和冲突

3. **标准化工作交接文档**
   - 角色设计→情节规划：人物动机与目标文档
   - 情节规划→叙事执行：详细章节执行指南
   - 叙事执行→连续性监督：完成章节核查表
   - 连续性监督→质量评估：一致性验证报告
   - 质量评估→创作总监：质量报告与建议
   - 创作总监→叙事执行：修改指令清单

## 质量控制检查点

1. **概念一致性检查**（概念阶段结束时）
   - 世界观、角色、情节三方面的协调性
   - 主题表达与故事结构的匹配度
   - 创意概念的可执行性评估

2. **计划完备性评估**（规划阶段结束时）
   - 情节线的完整性和连贯性
   - 角色动机与行为的合理性
   - 悬念与解谜系统的设计质量
   - 结构平衡与节奏控制的有效性

3. **章节质量门控**（每章创作后）
   - 内容与规划的符合度
   - 角色行为的一致性
   - 逻辑连贯性与细节准确性
   - 文学表现与读者体验

4. **阶段性整体审查**（每5-10章或主要情节块）
   - 中期情节发展的整体评估
   - 角色成长与互动的进展审查
   - 主题表现与氛围营造的效果
   - 读者体验与期待管理的有效性

//ROLE_TRANSITION_PROTOCOLS

为确保角色之间的无缝切换，我采用以下转换协议：

1. **角色转换触发条件**
   - 完成当前角色的指定任务
   - 达到预定的质量检查点
   - 收到创作总监的角色切换指令
   - 遇到需要特定专业处理的问题

2. **角色切换标准流程**
   - 当前角色总结完成工作和关键发现
   - 明确标识未完成事项和需要注意的问题
   - 指定下一个最合适的角色
   - 提供必要的上下文信息和具体指示

3. **角色协作模式**
   - 单角色模式：单个时间点只激活一个角色
   - 双角色会诊：针对特定问题同时激活两个角色
   - 全体评议：复杂决策时召集所有角色提供建议
   - 多角色串联：为完成复杂任务设计角色顺序

4. **应急处理机制**
   - 冲突解决：由创作总监进行最终裁决
   - 创意瓶颈：激活首席架构师进行创意突破
   - 逻辑隐患：立即转由连续性监督官进行诊断
   - 质量危机：召集特别评审会进行深度分析

//STANDARD_OUTPUT_FORMATS

各角色使用以下标准化格式进行输出，确保信息传递的效率和准确性：

## 首席架构师输出格式
世界构建文档：[项目名称]
核心概念
[简明扼要的高概念描述]

世界观框架
[世界基本设定与规则]

背景设定
[历史、文化、社会结构等基本背景]

主题探索
[核心主题与表现方向]

氛围与风格
[叙事风格、语言特点、情感基调]

重要元素
[需要特别关注的关键世界元素]

## 角色塑造师输出格式
角色设计文档：[角色名]
基本信息
全名：
年龄：
外貌：
职业/身份：
核心特征：
心理画像
核心动机：
最大恐惧：
内在冲突：
价值观：
性格特点：
背景故事
[简明的角色背景]

关系网络
[与其他角色的关系]

成长弧线
[预期的角色变化与成长]

表现特点
[语言特点、习惯性行为、标志性细节]

## 情节规划师输出格式
故事架构文档
整体架构
[根据目标章节数设计的三幕结构]

核心情节线
[主要故事线概述]

关键转折点
[列出3-5个主要转折点及其章节位置]

冲突升级路径
[从开始到高潮的冲突升级设计]

章节分配计划
[明确的章节数分配，确保在规定章节内完成]

第[X]章 规划文档
章节功能
[本章在整体叙事中的角色与目的]

主要事件
[按顺序列出本章要发生的主要事件]

场景规划
[场景1]:

地点：
参与人物：
起始状态：
目标/冲突：
结果：
情感基调：
角色发展点
[主要角色在本章的发展或变化]

悬念与伏笔
设置新悬念：
埋下伏笔：
回收前置伏笔：
章节目标
[本章需要达成的叙事目标]

## 叙事执行者输出格式
[直接输出创作的章节内容，按情节规划师提供的大纲进行创作]

创作说明
实施策略
[对关键场景或挑战性内容的处理说明]

技术重点
[使用的特定叙事技巧或方法]

注意事项
[执行过程中发现的问题或需要注意的点]

## 连续性监督官输出格式
第[X]章 连续性检查报告
章节摘要
[关键事件与发展简要总结]

一致性检查结果
角色行为一致性：[评价与问题]
设定/规则应用：[评价与问题]
时间线连贯性：[评价与问题]
空间逻辑：[评价与问题]
已知信息一致性：[评价与问题]
角色状态更新
[主要角色当前情感与状态]

关键信息跟踪
新增信息/设定：
新增伏笔：
已解决悬念：
未解决问题：
注意事项
[后续章节需要特别关注的连续性问题]

## 质量评估官输出格式
第[X]章 质量评估报告
总体评价
[简要总结章节质量]

量化评分 (1-10)
叙事流畅度：[分数] - [简短说明]
角色表现：[分数] - [简短说明]
冲突设计：[分数] - [简短说明]
情感强度：[分数] - [简短说明]
悬念效果：[分数] - [简短说明]
细节真实性：[分数] - [简短说明]
整体质量：[分数]
优势要点
[列出3-5个成功之处]

改进建议
[问题1]:

具体表现：
影响范围：
改进方案：
读者反应预测
[预期目标读者的可能反应]

质量评级：[A/B/C/D]
[此评级对应的简要解释]

## 创作总监输出格式
创作指导：第[X]章
评估总结
[对当前章节的简要质量评估]

修改指令
[明确的修改要求和方向]

重点关注
[需要特别注意的关键问题]

战略调整
[对后续内容规划的调整建议]

进度评估
[当前进度与质量的整体评估]

下一步行动
[明确的下一步工作指示]

//EXECUTION_FRAMEWORK

我的工作执行框架如下：

1. **任务分析与角色调用**
   - 根据用户输入确定当前创作阶段
   - 选择最合适的角色响应当前任务
   - 激活相应角色的专业知识系统
   - 准备必要的上下文信息与工作基础

2. **分阶段创作流程管理**
   - 监控当前所处的创作阶段
   - 确保完成当前阶段的所有必要步骤
   - 在满足质量标准后推进至下一阶段
   - 维护创作进度记录与质量追踪

3. **角色协调与工作流切换**
   - 识别任务完成点和角色切换时机
   - 执行规范的角色转换流程
   - 确保关键信息在角色间有效传递
   - 依据需求灵活调整角色协作模式

4. **质量管理与持续改进**
   - 实施分层次的质量控制检查点
   - 追踪已识别问题的解决状态
   - 收集创作过程中的经验教训
   - 动态优化工作流程和角色分工

//USER_INTERACTION_GUIDELINES

与用户互动时，我将遵循以下原则：

1. **创作指令解析**
   - 明确识别用户的创作需求和阶段
   - 提取关键创作参数和目标
   - 识别特定的质量期望和风格要求
   - 引导获取必要的补充信息

2. **角色透明度**
   - 清晰标识当前激活的角色
   - 解释角色转换的原因和目的
   - 在需要时说明不同角色的专业视角
   - 保持整体一致的交流风格

3. **进度与状态沟通**
   - 提供清晰的当前创作阶段说明
   - 报告完成的工作和下一步计划
   - 主动披露发现的问题和挑战
   - 定期提供整体进度和质量评估

4. **决策支持与引导**
   - 在关键决策点提供专业建议
   - 解释不同选择的潜在影响
   - 支持用户的创作主导权
   - 在用户指示不明时寻求澄清

//ACTIVATION_INSTRUCTIONS

要激活特定角色和工作流程，用户可使用以下指令格式：

1. **角色直接调用**
   - "以[角色名称]的身份，[具体任务]"
   - 例："以首席架构师的身份，为一部现代都市悬疑小说设计基本世界观"
   - 例："请角色塑造师为主角设计详细的性格和成长弧线"

2. **工作流程阶段指令**
   - "开始[阶段名称]，[具体要求]"
   - 例："开始概念构建阶段，主题是'记忆与身份'"
   - 例："进入内容创作阶段，请基于已有大纲写出第一章"

3. **整合工作指令**
   - "对第X章进行完整工作流处理"
   - "为[概念/角色/情节]进行全流程开发"
   - "执行第X章从规划到评估的完整流程"

4. **质量干预指令**
   - "审查第X章的[具体方面]"
   - "评估当前章节的[质量维度]"
   - "识别并解决第X章的一致性问题"

5. **创作调整指令**
   - "调整[具体元素]的方向为[新方向]"
   - "加强第X章的[特定元素]"
   - "重新规划[特定情节线/角色发展]"

//SPECIALIZED_CAPABILITIES

我在特定小说类型上有以下专长：

## 推理悬疑类
- 谜题设计与线索布局系统
- 诡计与误导技术库
- 悬念递进与信息控制方法
- 推理过程与解谜节奏设计
- 出人意料但合理的转折创建

## 都市悬疑类
- 都市环境与氛围营造
- 现实与超自然元素平衡
- 社会议题与个人故事融合
- 城市传说与现代神话创造
- 日常与非常规的反差利用

## 探险冒险类
- 探险旅程与试炼结构设计
- 团队动态与角色分工系统
- 未知环境与奇观描写
- 危机升级与解决模式
- 发现时刻与启示设计

## 盗墓题材类
- 古墓设计与机关系统
- 历史谜题与解密过程
- 超自然元素与理性解释平衡
- 专业知识融入与考古细节
- 危险升级与生存挑战设计

## 古董文物类
- 文物知识系统与历史背景
- 鉴定过程与专业细节
- 文物背后的历史故事构建
- 收藏界生态与人物关系
- 跨时代叙事与历史连接


## 玄幻类
- **修炼体系与境界设定** - 构建完整的修炼等级和突破机制
- **功法武技与战斗场面设计** - 战斗描写和武学体系设计
- **仙侠世界观与势力构建** - 修仙界的格局和宗门关系
- **奇遇机缘与成长轨迹规划** - 主角的机缘安排和成长路径
- **天道法则与超凡力量体系** - 世界运行法则和力量来源

## 奇幻类  
- **魔法系统与规则设定** - 魔法原理、分类和使用限制
- **种族设定与世界观构建** - 各种族特色和世界格局
- **魔法战斗与能力展现技巧** - 魔法战斗的策略和视觉效果
- **异世界环境与生态设计** - 奇异地貌和魔法生物设定
- **史诗任务与英雄成长模式** - 从平凡到传奇的成长轨迹

## 历史题材类
- **历史背景还原与细节考证** - 史实准确性和细节真实性
- **真实人物塑造与性格刻画** - 历史人物的立体化塑造
- **历史事件重现与情节编织** - 史实与虚构的巧妙融合
- **时代氛围营造与社会风貌** - 特定历史时期的社会状态
- **史料融入与文学创作平衡** - 学术性与艺术性的平衡

## 革命时代类
- **革命背景与历史进程描绘** - 革命爆发的社会根源和发展
- **理想信念与现实冲突表现** - 理想与现实的矛盾冲突  
- **英雄人物塑造与群像刻画** - 革命者的多元化形象塑造
- **斗争策略与革命智慧展现** - 政治军事斗争的策略技巧
- **时代精神与个人命运交织** - 历史洪流中的个人选择


//END_DEFINITION`;
    }
    
    // 获取任务提示词
    getTaskPrompt(task) {
        // 根据任务名称返回对应的提示词
        switch (task.execute.name) {
            case 'executeArchitectConcept':
                return this.executeArchitectConcept.toString().match(/const prompt = `([\s\S]*?)`;/)[1];
            case 'executeCharacterConcept':
                return this.executeCharacterConcept.toString().match(/const prompt = `([\s\S]*?)`;/)[1];
            // 为简化，直接重新生成提示词
            default:
                return `${this.systemPrompt}\n\n//当前项目信息\n${this.getProjectContext()}\n\n//任务：${task.name}\n${task.description}`;
        }
    }
    
    // 加载写作风格
    async loadWriterStyle() {
        if (!this.project.style) return;
        
        if (this.project.style === 'custom') {
            // 加载自定义风格
            const customContent = localStorage.getItem('customStyleContent');
            if (customContent) {
                this.project.styleContent = customContent;
                this.addLog('system', '📝 已加载自定义写作风格');
            }
        } else {
            // 加载预设风格
            try {
                const response = await fetch(`writerstyle/${this.project.style}.md`);
                if (response.ok) {
                    this.project.styleContent = await response.text();
                    this.addLog('system', `📝 已加载写作风格：${this.getStyleName(this.project.style)}`);
                }
            } catch (error) {
                console.error('加载风格文件失败:', error);
            }
        }
    }
    
    // 获取风格名称
    getStyleName(styleId) {
        const styles = {
            'bhxl-style': '渤海小吏',
            'dbl-style': '丹·布朗',
            'dnmy-style': '当年明月',
            'dygw-style': '东野圭吾',
            'hm-style': '何马',
            'zjc-style': '紫金陈',
            'custom': '自定义风格'
        };
        return styles[styleId] || styleId;
    }
    
    // 获取项目上下文
    getProjectContext() {
        return `
项目名称：${this.project.title}
小说类型：${this.project.type}
小说篇幅：${this.project.length}（目标章节数：${this.project.targetChapters}章）
初始概念：${this.project.concept}

世界观设定：
${JSON.stringify(this.project.context.worldview || {}, null, 2)}

角色设定：
${JSON.stringify(this.project.context.characters || [], null, 2)}

故事架构：
${JSON.stringify(this.project.context.plotStructure || {}, null, 2)}

已完成章节：${this.project.chapters.length}章
剩余章节：${this.project.targetChapters - this.project.chapters.length}章
`;
    }
    
    // 请求人工审核
    async requestReview(task, content, isError = false) {
        return new Promise((resolve) => {
            this.currentReviewResolve = resolve;
            
            // 显示审核面板
            this.reviewPanel.style.display = 'block';
            this.reviewRole.textContent = this.getRoleName(task.role);
            this.reviewContent.innerHTML = this.formatContent(content);
            
            // 滚动到审核区域
            this.reviewPanel.scrollIntoView({ behavior: 'smooth' });
            
            if (isError) {
                this.addLog('system', '⚠️ 需要人工干预');
            } else {
                this.addLog('system', '🔍 等待人工审核');
            }
            
            // 暂停自动执行
            this.state.isPaused = true;
        });
    }
    
    // 处理批准
    handleApprove() {
        if (!this.currentReviewResolve) return;
        
        this.saveTaskResult(this.state.currentTask, this.reviewContent.textContent);
        this.reviewPanel.style.display = 'none';
        this.state.isPaused = false;
        
        this.addLog('system', '✅ 人工批准');
        this.currentReviewResolve();
    }
    
    // 处理修改
    showModifyInput() {
        this.modifyInput.style.display = 'block';
        this.modifyText.focus();
    }
    
    // 提交修改
    async submitModification() {
        const modification = this.modifyText.value.trim();
        if (!modification) return;
        
        this.addLog('system', '📝 提交修改建议');
        
        // 重新执行任务with修改建议
        const task = this.state.currentTask;
        const newPrompt = `
之前的输出需要修改。

人工修改建议：
${modification}

请根据修改建议重新执行任务。
`;
        
        try {
            const response = await this.callAI(this.getTaskPrompt(task) + newPrompt);
            this.displayTaskResult(task, response);
            
            // 清空修改框
            this.modifyText.value = '';
            this.modifyInput.style.display = 'none';
        } catch (error) {
            this.addLog('error', `修改失败: ${error.message}`);
        }
    }
    
    // 处理拒绝
    async handleReject() {
        if (!this.currentReviewResolve) return;
        
        this.addLog('system', '❌ 人工拒绝，重新执行');
        this.reviewPanel.style.display = 'none';
        
        // 重新执行当前任务
        const task = this.state.currentTask;
        try {
            const response = await task.execute();
            this.displayTaskResult(task, response);
            await this.requestReview(task, response);
        } catch (error) {
            this.addLog('error', `重试失败: ${error.message}`);
        }
    }
    
    // 保存任务结果
    saveTaskResult(task, result) {
        // 根据角色保存到对应的项目数据中
        switch (task.role) {
            case 'architect':
                if (task.name.includes('概念')) {
                    this.project.context.worldview = result;
                    this.updateWorldviewDisplay(result);
                }
                break;
            
            case 'character':
                if (task.name.includes('角色')) {
                    this.project.context.characters = result;
                    this.updateCharactersDisplay(result);
                }
                break;
            
            case 'plot':
                if (task.name.includes('章节')) {
                    this.project.context.outline = result;
                    this.updateOutlineDisplay(result);
                }
                break;
            
            case 'narrative':
                if (task.name.includes('撰写')) {
                    const chapter = {
                        number: this.project.chapters.length + 1,
                        content: result,
                        createdAt: new Date().toISOString()
                    };
                    this.project.chapters.push(chapter);
                    this.updateChaptersDisplay();
                    
                    // 如果启用了自动导出，导出当前章节为Markdown文件
                    if (this.config.autoExportChapter) {
                        this.exportChapterAsMarkdown(chapter);
                    }
                }
                break;
        }
        
        // 保存到上下文
        this.project.context[`${task.role}_${task.name}`] = result;
    }
    
    // 导出章节为Markdown文件
    exportChapterAsMarkdown(chapter) {
        const markdown = this.formatChapterAsMarkdown(chapter);
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 生成文件名：小说标题_第X章_时间戳.md
        // 清理文件名，移除可能导致问题的字符
        const safeTitle = this.project.title.replace(/[<>:"/\\|?*]/g, '_');
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `${safeTitle}_第${chapter.number}章_${timestamp}.md`;
        
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        
        this.addLog('system', `📄 已导出：${fileName}`);
    }
    
    // 格式化章节为Markdown
    formatChapterAsMarkdown(chapter) {
        const header = `# ${this.project.title}

## 第${chapter.number}章

**创作时间**：${new Date(chapter.createdAt).toLocaleString('zh-CN')}  
**小说类型**：${this.getNovelTypeName(this.project.type)}  
**字数**：约${chapter.content.length}字

---

`;
        
        // 处理章节内容，确保Markdown格式正确
        let content = chapter.content;
        
        // 如果内容已经包含Markdown格式，保持原样
        // 如果是纯文本，添加段落分隔
        if (!content.includes('#') && !content.includes('**')) {
            // 将连续的换行符替换为段落分隔
            content = content.split(/\n\n+/).map(para => para.trim()).filter(para => para).join('\n\n');
        }
        
        const footer = `

---

*本章节由AI小说自动创作系统生成*
`;
        
        return header + content + footer;
    }
    
    // 获取小说类型名称
    getNovelTypeName(type) {
        const types = {
            'mystery': '推理悬疑',
            'urban-suspense': '都市悬疑',
            'adventure': '探险冒险',
            'tomb-raiding': '盗墓题材',
            'antique': '古董文物',
            'xuanhuan': '玄幻',
            'fantasy': '奇幻',
            'revolution-era': '革命时代',
            'historical': '历史题材'
        };
        return types[type] || type;
    }
    
    // 导出所有章节为单个Markdown文件
    exportAllChaptersAsMarkdown() {
        if (this.project.chapters.length === 0) {
            alert('还没有任何章节可以导出');
            return;
        }
        
        // 生成目录
        let toc = this.generateTableOfContents();
        
        let markdown = `# ${this.project.title}

**作者**：AI小说自动创作系统  
**小说类型**：${this.getNovelTypeName(this.project.type)}  
**写作风格**：${this.project.style ? this.getStyleName(this.project.style) : '默认'}  
**总章节数**：${this.project.chapters.length}章  
**总字数**：约${this.calculateTotalWords()}字  
**创作时间**：${this.getCreationTimeRange()}  
**导出时间**：${new Date().toLocaleString('zh-CN')}

---

## 作品简介

${this.project.concept}

---

## 目录

${toc}

---

`;
        
        // 添加世界观设定（精简版）
        if (this.project.context.worldview) {
            markdown += `## 世界观设定

${this.formatWorldview(this.project.context.worldview)}

---

`;
        }
        
        // 添加主要角色介绍（精简版）
        if (this.project.context.characters) {
            markdown += `## 主要角色

${this.formatCharacters(this.project.context.characters)}

---

`;
        }
        
        // 添加正文标记
        markdown += `# 正文

`;
        
        // 添加所有章节
        this.project.chapters.forEach((chapter, index) => {
            // 添加章节标题
            const chapterTitle = this.extractChapterTitle(chapter.content, chapter.number);
            markdown += `## 第${chapter.number}章 ${chapterTitle}

`;
            
            // 处理章节内容
            const formattedContent = this.formatChapterContent(chapter.content);
            markdown += formattedContent;
            
            // 章节之间添加分隔
            if (index < this.project.chapters.length - 1) {
                markdown += `

---

`;
            }
        });
        
        // 添加版权信息
        markdown += `

---

## 版权声明

本作品由AI小说自动创作系统生成，仅供学习和研究使用。

**创作系统**：AI小说自动创作系统 v1.0  
**AI模型**：${this.config.provider === 'gemini' ? 'Google Gemini' : 'DeepSeek'}  
**生成时间**：${new Date().toISOString()}

---

*感谢您阅读本作品！*
`;
        
        // 导出文件
        this.downloadMarkdown(markdown, `${this.project.title}_完整版`);
        
        this.addLog('system', `📚 已导出完整小说《${this.project.title}》`);
    }
    
    // 生成目录
    generateTableOfContents() {
        let toc = '';
        this.project.chapters.forEach(chapter => {
            const chapterTitle = this.extractChapterTitle(chapter.content, chapter.number);
            toc += `- [第${chapter.number}章 ${chapterTitle}](#第${chapter.number}章-${chapterTitle.replace(/\s/g, '-')})\n`;
        });
        return toc;
    }
    
    // 计算总字数
    calculateTotalWords() {
        let totalWords = 0;
        this.project.chapters.forEach(chapter => {
            totalWords += chapter.content.length;
        });
        return Math.round(totalWords / 1000) * 1000; // 四舍五入到千位
    }
    
    // 获取创作时间范围
    getCreationTimeRange() {
        if (this.project.chapters.length === 0) return '无';
        
        const firstChapter = this.project.chapters[0];
        const lastChapter = this.project.chapters[this.project.chapters.length - 1];
        
        const startDate = new Date(firstChapter.createdAt || Date.now()).toLocaleDateString('zh-CN');
        const endDate = new Date(lastChapter.createdAt || Date.now()).toLocaleDateString('zh-CN');
        
        return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
    }
    
    // 提取章节标题
    extractChapterTitle(content, chapterNum) {
        // 尝试从内容中提取标题
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.length < 50) {
                // 如果找到合适的标题行，返回
                if (trimmedLine.includes('第') || trimmedLine.includes('章')) {
                    const title = trimmedLine.replace(/^第[\d\u4e00-\u9fa5]+章[：\s]*/, '');
                    if (title && title !== trimmedLine) {
                        return title;
                    }
                }
            }
        }
        
        // 如果没找到，根据内容生成简单标题
        return this.generateChapterTitleFromContent(content, chapterNum);
    }
    
    // 根据内容生成章节标题
    generateChapterTitleFromContent(content, chapterNum) {
        // 简单实现：提取第一个有意义的句子片段
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
            const firstLine = lines[0].substring(0, 20);
            return firstLine.length === 20 ? firstLine + '...' : firstLine;
        }
        return '';
    }
    
    // 格式化世界观（精简版）
    formatWorldview(worldview) {
        // 如果世界观太长，只取前面部分
        const maxLength = 1000;
        if (worldview.length > maxLength) {
            return worldview.substring(0, maxLength) + '\n\n*（更多设定详见故事正文）*';
        }
        return worldview;
    }
    
    // 格式化角色介绍（精简版）
    formatCharacters(characters) {
        // 如果角色介绍太长，只取前面部分
        const maxLength = 1500;
        if (characters.length > maxLength) {
            return characters.substring(0, maxLength) + '\n\n*（更多角色详见故事正文）*';
        }
        return characters;
    }
    
    // 格式化章节内容
    formatChapterContent(content) {
        // 清理内容，移除多余的空行
        let formatted = content
            .split('\n')
            .map(line => line.trim())
            .filter((line, index, arr) => {
                // 保留非空行，或者前后有非空行的空行
                return line || (arr[index - 1] && arr[index + 1]);
            })
            .join('\n\n');
        
        // 确保段落之间有适当的间隔
        formatted = formatted.replace(/\n{3,}/g, '\n\n');
        
        return formatted;
    }
    
    // 下载Markdown文件
    downloadMarkdown(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 清理文件名
        const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = `${safeFilename}_${timestamp}.md`;
        
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // 显示任务结果
    displayTaskResult(task, result) {
        const formattedResult = this.formatContent(result);
        this.addLog(task.role, `完成: ${task.name}`, formattedResult);
    }
    
    // 更新各种显示
    updateWorldviewDisplay(content) {
        this.worldviewContent.innerHTML = `<div class="content-text">${this.formatContent(content)}</div>`;
    }
    
    updateCharactersDisplay(content) {
        this.charactersContent.innerHTML = `<div class="content-text">${this.formatContent(content)}</div>`;
    }
    
    updateOutlineDisplay(content) {
        this.outlineContent.innerHTML = `<div class="content-text">${this.formatContent(content)}</div>`;
    }
    
    updateChaptersDisplay() {
        const html = this.project.chapters.map(chapter => `
            <div class="chapter-item">
                <h4>第${chapter.number}章</h4>
                <div class="chapter-content">${this.formatContent(chapter.content)}</div>
            </div>
        `).join('');
        
        this.chaptersContent.innerHTML = html || '<p class="placeholder">尚未创作章节</p>';
    }
    
    // 格式化内容
    formatContent(content) {
        if (!content) return '';
        
        return content
            .replace(/^### (.+)$/gm, '<h5>$1</h5>')
            .replace(/^## (.+)$/gm, '<h4>$1</h4>')
            .replace(/^# (.+)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }
    
    // 添加日志
    addLog(type, message, detail = '') {
        const time = new Date().toLocaleTimeString('zh-CN');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type === 'system' ? '' : `role-${type}`}`;
        
        entry.innerHTML = `
            <div class="log-time">${time}</div>
            <div class="log-content">
                ${message}
                ${detail ? `<div class="log-detail">${detail}</div>` : ''}
            </div>
        `;
        
        this.executionLog.appendChild(entry);
        this.executionLog.scrollTop = this.executionLog.scrollHeight;
    }
    
    // 更新状态
    updateStatus(status) {
        this.systemStatus.textContent = status;
        this.statusDot.className = 'status-dot';
        
        if (status === '运行中') {
            this.statusDot.classList.add('active');
        } else if (status === '已暂停') {
            this.statusDot.classList.add('paused');
        }
    }
    
    // 更新阶段进度
    updateStageProgress(stage, progress) {
        const stageItem = document.querySelector(`.stage-item[data-stage="${stage}"]`);
        if (stageItem) {
            const progressFill = stageItem.querySelector('.progress-fill');
            progressFill.style.width = `${progress}%`;
            
            if (progress > 0) {
                stageItem.classList.add('active');
            }
            if (progress >= 100) {
                stageItem.classList.remove('active');
                stageItem.classList.add('completed');
            }
        }
    }
    
    // 更新总体进度
    updateOverallProgress() {
        if (this.project.length === 'infinite') {
            // 无限模式下显示已完成章节数
            this.totalProgress.textContent = `${this.project.chapters.length}章`;
            this.targetChaptersEl.textContent = '∞';
        } else {
            // 计算基于章节的进度
            const chapterProgress = this.project.chapters.length / this.project.targetChapters;
            const progress = Math.round(chapterProgress * 100);
            this.totalProgress.textContent = `${progress}%`;
            this.targetChaptersEl.textContent = this.project.targetChapters;
        }
        
        // 更新章节显示
        this.currentChapterEl.textContent = this.project.chapters.length;
    }
    
    // 更新计时器
    updateTimers() {
        if (!this.state.isRunning) return;
        
        // 更新总时间
        if (this.state.startTime) {
            const elapsed = Date.now() - this.state.startTime;
            this.totalTime.textContent = this.formatTime(elapsed);
        }
        
        // 更新任务时间
        if (this.state.taskStartTime && !this.state.isPaused) {
            const elapsed = Date.now() - this.state.taskStartTime;
            this.taskTimer.textContent = this.formatTime(elapsed, true);
        }
    }
    
    // 格式化时间
    formatTime(ms, short = false) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (short) {
            return `${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        }
        
        return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    
    // 获取角色名称
    getRoleName(role) {
        const names = {
            architect: '首席架构师',
            character: '角色塑造师',
            plot: '情节规划师',
            narrative: '叙事执行者',
            continuity: '连续性监督官',
            quality: '质量评估官',
            director: '创作总监'
        };
        return names[role] || role;
    }
    
    // 切换标签
    switchTab(tabName) {
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
    }
    
    // 暂停/恢复
    togglePause() {
        this.state.isPaused = !this.state.isPaused;
        this.pauseBtn.textContent = this.state.isPaused ? '▶️ 继续' : '⏸️ 暂停';
        this.updateStatus(this.state.isPaused ? '已暂停' : '运行中');
    }
    
    // 完成创作
    complete() {
        this.state.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.updateStatus('已完成');
        
        const completedChapters = this.project.chapters.length;
        
        if (this.project.length === 'infinite') {
            this.addLog('system', `🎉 无限模式暂停！《${this.project.title}》已完成 ${completedChapters} 章`);
        } else {
            const targetChapters = this.project.targetChapters;
            this.addLog('system', `🎉 创作完成！《${this.project.title}》共完成 ${completedChapters}/${targetChapters} 章`);
        }
        
        // 自动保存
        this.saveProject();
    }
    
    // 保存项目
    saveProject() {
        // 保存完整的项目数据，包括状态和进度
        const saveData = {
            project: this.project,
            state: {
                currentStage: this.state.currentStage,
                completedTasks: this.state.completedTasks,
                totalTasks: this.state.totalTasks,
                lastSaveTime: new Date().toISOString()
            },
            config: this.config,
            workflow: {
                currentWorkflowStage: this.getCurrentWorkflowStage(),
                pendingTasks: this.getPendingTasks()
            },
            context: {
                lastChapterSummary: this.getLastChapterSummary(),
                plotProgress: this.getPlotProgressSummary(),
                characterStates: this.getCharacterStates()
            }
        };
        
        const projectData = JSON.stringify(saveData, null, 2);
        const timestamp = Date.now();
        
        // 保存到localStorage
        localStorage.setItem(`novel_project_${timestamp}`, projectData);
        localStorage.setItem('novel_project_latest', projectData);
        
        // 同时导出为文件
        this.exportProjectData(saveData);
        
        this.addLog('system', '💾 项目已保存（包含完整上下文）');
    }
    
    // 导出项目数据为文件
    exportProjectData(saveData) {
        const projectData = JSON.stringify(saveData, null, 2);
        const blob = new Blob([projectData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const safeTitle = this.project.title.replace(/[<>:"/\\|?*]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `${safeTitle}_进度_${timestamp}.json`;
        
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // 获取当前工作流阶段
    getCurrentWorkflowStage() {
        const currentChapterNum = this.project.chapters.length + 1;
        return {
            stage: this.state.currentStage,
            chapterNum: currentChapterNum,
            isRevising: this.state.currentStage === 'revision'
        };
    }
    
    // 获取待处理任务
    getPendingTasks() {
        // 返回当前阶段未完成的任务信息
        return {
            currentTask: this.state.currentTask ? this.state.currentTask.name : null,
            remainingInStage: this.state.currentStage
        };
    }
    
    // 获取最后一章的摘要
    getLastChapterSummary() {
        if (this.project.chapters.length === 0) return '';
        
        const lastChapter = this.project.chapters[this.project.chapters.length - 1];
        return {
            chapterNum: lastChapter.number,
            keyEvents: this.extractKeyEvents(lastChapter.content),
            cliffhanger: this.extractCliffhanger(lastChapter.content)
        };
    }
    
    // 提取关键事件
    extractKeyEvents(content) {
        // 简单提取，实际使用时可以通过AI分析
        const lines = content.split('\n').filter(line => line.trim());
        return lines.slice(0, 3).join(' ');
    }
    
    // 提取悬念
    extractCliffhanger(content) {
        const lines = content.split('\n').filter(line => line.trim());
        return lines.slice(-3).join(' ');
    }
    
    // 获取情节进展摘要
    getPlotProgressSummary() {
        return {
            completedChapters: this.project.chapters.length,
            totalChapters: this.project.targetChapters,
            currentPlotStage: this.calculatePlotStage(),
            majorEventsCompleted: this.project.context.majorEvents || []
        };
    }
    
    // 计算当前情节阶段
    calculatePlotStage() {
        const progress = this.project.chapters.length / this.project.targetChapters;
        if (progress < 0.2) return '开篇铺垫';
        if (progress < 0.7) return '情节发展';
        if (progress < 0.9) return '高潮冲突';
        return '结局收尾';
    }
    
    // 获取角色状态
    getCharacterStates() {
        // 从上下文中提取角色当前状态
        return this.project.context.characterStates || {};
    }
    
    // 导出项目
    exportProject() {
        const projectData = JSON.stringify(this.project, null, 2);
        const blob = new Blob([projectData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.project.title || '未命名'}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // 加载项目
    loadProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const saveData = JSON.parse(e.target.result);
                    
                    // 判断是否是新格式的保存数据
                    if (saveData.project && saveData.state) {
                        // 新格式：包含完整上下文
                        await this.loadProjectWithContext(saveData);
                    } else {
                        // 旧格式：仅包含项目数据
                        await this.loadLegacyProject(saveData);
                    }
                    
                    this.addLog('system', '📁 项目加载成功');
                } catch (error) {
                    alert('加载项目失败：' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    // 加载包含上下文的项目
    async loadProjectWithContext(saveData) {
        // 恢复项目数据
        this.project = saveData.project;
        
        // 恢复状态
        if (saveData.state) {
            this.state.currentStage = saveData.state.currentStage;
            this.state.completedTasks = saveData.state.completedTasks;
            this.state.totalTasks = saveData.state.totalTasks;
        }
        
        // 恢复配置
        if (saveData.config) {
            Object.assign(this.config, saveData.config);
        }
        
        // 更新UI
        this.updateUIFromProject();
        
        // 重建AI上下文
        await this.reconstructContext(saveData.context);
        
        // 显示恢复选项
        this.showResumeOptions(saveData.workflow);
    }
    
    // 加载旧格式项目
    async loadLegacyProject(data) {
        this.project = data;
        this.updateUIFromProject();
        
        // 尝试从现有数据重建上下文
        const context = {
            lastChapterSummary: this.getLastChapterSummary(),
            plotProgress: this.getPlotProgressSummary(),
            characterStates: {}
        };
        
        await this.reconstructContext(context);
        
        // 显示恢复选项
        this.showResumeOptions({
            currentWorkflowStage: {
                chapterNum: this.project.chapters.length + 1
            }
        });
    }
    
    // 更新UI从项目数据
    updateUIFromProject() {
        this.novelTitle.value = this.project.title;
        this.novelType.value = this.project.type;
        this.novelLength.value = this.project.length || 'short';
        this.initialConcept.value = this.project.concept;
        
        if (this.project.style && this.writerStyle) {
            this.writerStyle.value = this.project.style;
        }
        
        // 更新显示
        this.updateWorldviewDisplay(this.project.context.worldview || '');
        this.updateCharactersDisplay(this.project.context.characters || '');
        this.updateOutlineDisplay(this.project.context.outline || '');
        this.updateChaptersDisplay();
        
        // 更新章节进度
        this.currentChapterEl.textContent = this.project.chapters.length;
        this.targetChaptersEl.textContent = this.project.targetChapters || 20;
        this.updateOverallProgress();
    }
    
    // 重建AI上下文
    async reconstructContext(savedContext) {
        this.addLog('system', '🔄 正在重建AI上下文...');
        
        // 构建上下文重建提示
        const contextPrompt = `
${this.systemPrompt}

//项目恢复
正在恢复项目《${this.project.title}》的创作进度。

//已完成内容摘要
已创作章节数：${this.project.chapters.length}
目标章节数：${this.project.targetChapters}
当前情节阶段：${savedContext.plotProgress?.currentPlotStage || this.calculatePlotStage()}

//最新章节情况
${savedContext.lastChapterSummary ? `
最后一章（第${savedContext.lastChapterSummary.chapterNum}章）关键信息：
- 主要事件：${savedContext.lastChapterSummary.keyEvents}
- 章末悬念：${savedContext.lastChapterSummary.cliffhanger}
` : ''}

//世界观设定回顾
${this.project.context.worldview ? this.project.context.worldview.substring(0, 500) + '...' : ''}

//主要角色状态
${this.project.context.characters ? this.project.context.characters.substring(0, 500) + '...' : ''}

//故事大纲回顾
${this.project.context.outline ? this.project.context.outline.substring(0, 500) + '...' : ''}

请分析以上信息，理解当前的创作进度和上下文，准备继续创作。
`;

        try {
            const response = await this.callAI(contextPrompt);
            this.project.context.reconstructedContext = response;
            this.addLog('system', '✅ AI上下文重建完成');
        } catch (error) {
            this.addLog('error', '上下文重建失败：' + error.message);
        }
    }
    
    // 显示恢复选项
    showResumeOptions(workflow) {
        const resumeDialog = document.createElement('div');
        resumeDialog.className = 'resume-dialog';
        resumeDialog.innerHTML = `
            <div class="resume-content">
                <h3>项目恢复成功</h3>
                <p>《${this.project.title}》已加载，当前进度：</p>
                <ul>
                    <li>已完成章节：${this.project.chapters.length}/${this.project.targetChapters}</li>
                    <li>下一章节：第${workflow.currentWorkflowStage?.chapterNum || this.project.chapters.length + 1}章</li>
                </ul>
                <div class="resume-actions">
                    <button onclick="window.autoNovelSystem.resumeWriting()" class="btn-primary">
                        ▶️ 继续创作
                    </button>
                    <button onclick="window.autoNovelSystem.reviewLastChapter()" class="btn-secondary">
                        📖 查看最后一章
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-secondary">
                        ❌ 关闭
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(resumeDialog);
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .resume-dialog {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--surface-color);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 1000;
                max-width: 500px;
                width: 90%;
            }
            .resume-content h3 {
                margin-top: 0;
                color: var(--text-primary);
            }
            .resume-content ul {
                margin: 15px 0;
                padding-left: 20px;
            }
            .resume-content li {
                margin: 5px 0;
                color: var(--text-secondary);
            }
            .resume-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
                justify-content: center;
            }
            .resume-actions button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }
            .btn-primary {
                background: var(--primary-color);
                color: white;
            }
            .btn-primary:hover {
                opacity: 0.9;
            }
            .btn-secondary {
                background: var(--surface-color);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }
            .btn-secondary:hover {
                background: var(--hover-color);
            }
        `;
        document.head.appendChild(style);
    }
    
    // 继续创作
    async resumeWriting() {
        // 关闭对话框
        const dialog = document.querySelector('.resume-dialog');
        if (dialog) dialog.remove();
        
        // 确保已加载写作风格
        if (this.project.style) {
            await this.loadWriterStyle();
        }
        
        // 设置状态
        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.startTime = Date.now();
        this.state.completedTasks = 0;
        
        // 更新UI
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.updateStatus('运行中');
        
        this.addLog('system', `📝 继续创作《${this.project.title}》，从第${this.project.chapters.length + 1}章开始`);
        
        // 从当前章节继续工作流
        await this.continueWorkflow();
    }
    
    // 继续工作流
    async continueWorkflow() {
        const currentChapterCount = this.project.chapters.length;
        
        // 检查是否已经完成了概念构建和规划阶段
        const hasWorldview = this.project.context.worldview && this.project.context.worldview.length > 0;
        const hasCharacters = this.project.context.characters && this.project.context.characters.length > 0;
        const hasOutline = this.project.context.outline && this.project.context.outline.length > 0;
        
        // 如果缺少必要的基础设定，需要从头开始
        if (!hasWorldview || !hasCharacters || !hasOutline) {
            this.addLog('system', '⚠️ 检测到项目缺少基础设定，将从头开始创建');
            await this.executeWorkflow();
            return;
        }
        
        // 如果基础设定完整，直接从章节创作开始
        this.addLog('system', '✅ 检测到完整的基础设定，直接开始章节创作');
        
        // 设置已完成的任务数（跳过前两个阶段）
        const conceptTasks = this.workflow[0].tasks.length; // 概念构建阶段
        const planningTasks = this.workflow[1].tasks.length; // 详细规划阶段
        this.state.completedTasks = conceptTasks + planningTasks;
        
        // 如果已经有章节，继续创作剩余章节
        for (let chapterNum = currentChapterCount + 1; chapterNum <= this.project.targetChapters; chapterNum++) {
            if (!this.state.isRunning) break;
            
            this.addLog('system', `📖 开始创作第${chapterNum}章`);
            this.currentChapterEl.textContent = chapterNum;
            
            // 为当前章节创建工作流
            const chapterWorkflow = this.createChapterWorkflow(chapterNum);
            
            // 执行章节创作流程
            for (const stage of chapterWorkflow) {
                if (!this.state.isRunning) break;
                await this.executeStage(stage);
            }
            
            // 更新进度
            this.updateOverallProgress();
            
            // 每5章执行一次前瞻规划
            if (chapterNum % 5 === 0 && chapterNum < this.project.targetChapters) {
                this.addLog('system', `🔮 执行阶段性前瞻规划`);
                await this.executeStage(this.workflow[4]);
            }
            
            // 自动保存
            if (chapterNum % 3 === 0) {
                this.saveProject();
            }
        }
        
        // 创作完成
        if (this.state.isRunning) {
            this.complete();
        }
    }
    
    // 查看最后一章
    reviewLastChapter() {
        const dialog = document.querySelector('.resume-dialog');
        if (dialog) dialog.remove();
        
        if (this.project.chapters.length > 0) {
            // 切换到章节标签
            this.switchTab('chapters');
            
            // 滚动到最后一章
            setTimeout(() => {
                const lastChapter = document.querySelector('.chapter-item:last-child');
                if (lastChapter) {
                    lastChapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    lastChapter.style.animation = 'highlight 2s ease';
                }
            }, 100);
        }
        
        // 添加高亮动画样式
        if (!document.querySelector('#highlightAnimation')) {
            const style = document.createElement('style');
            style.id = 'highlightAnimation';
            style.textContent = `
                @keyframes highlight {
                    0% { box-shadow: 0 0 0 rgba(255, 215, 0, 0); }
                    50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
                    100% { box-shadow: 0 0 0 rgba(255, 215, 0, 0); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // 显示设置
    showSettings() {
        this.settingsModal.classList.add('show');
        
        // 加载当前设置
        this.apiProviderSelect.value = this.config.provider;
        
        // Gemini 设置
        this.geminiApiKeyInput.value = this.config.geminiApiKey;
        this.geminiModelSelect.value = this.config.geminiModel;
        
        // DeepSeek 设置
        this.deepseekApiKeyInput.value = this.config.deepseekApiKey;
        this.deepseekModelSelect.value = this.config.deepseekModel;
        this.deepseekEndpointInput.value = this.config.deepseekEndpoint;
        
        // 通用设置
        this.autoApproveCheck.checked = this.config.autoApprove;
        this.pauseOnMilestoneCheck.checked = this.config.pauseOnMilestone;
        this.autoExportChapterCheck.checked = this.config.autoExportChapter;
        this.taskIntervalInput.value = this.config.taskInterval / 1000;
        this.temperatureSlider.value = this.config.temperature;
        this.tempValueSpan.textContent = this.config.temperature;
        this.chapterWordsInput.value = this.config.chapterWords || 3000;
        
        // 切换到正确的API配置界面
        window.switchAPIProvider();
    }
    
    // 保存设置
    saveSettings() {
        // 保存API提供商
        this.config.provider = this.apiProviderSelect.value;
        
        // 保存Gemini设置
        this.config.geminiApiKey = this.geminiApiKeyInput.value.trim();
        this.config.geminiModel = this.geminiModelSelect.value;
        
        // 保存DeepSeek设置
        this.config.deepseekApiKey = this.deepseekApiKeyInput.value.trim();
        this.config.deepseekModel = this.deepseekModelSelect.value;
        this.config.deepseekEndpoint = this.deepseekEndpointInput.value.trim();
        
        // 保存通用设置
        this.config.autoApprove = this.autoApproveCheck.checked;
        this.config.pauseOnMilestone = this.pauseOnMilestoneCheck.checked;
        this.config.autoExportChapter = this.autoExportChapterCheck.checked;
        this.config.taskInterval = parseInt(this.taskIntervalInput.value) * 1000;
        this.config.temperature = parseFloat(this.temperatureSlider.value);
        this.config.chapterWords = parseInt(this.chapterWordsInput.value);
        
        // 保存到本地存储
        localStorage.setItem('api_provider', this.config.provider);
        localStorage.setItem('gemini_api_key', this.config.geminiApiKey);
        localStorage.setItem('deepseek_api_key', this.config.deepseekApiKey);
        localStorage.setItem('deepseek_endpoint', this.config.deepseekEndpoint);
        localStorage.setItem('auto_novel_config', JSON.stringify(this.config));
        
        this.settingsModal.classList.remove('show');
        this.addLog('system', `⚙️ 设置已保存 - 当前使用: ${this.config.provider === 'gemini' ? 'Gemini' : 'DeepSeek'}`);
    }
    
    // 加载配置
    loadConfig() {
        const savedConfig = localStorage.getItem('auto_novel_config');
        if (savedConfig) {
            Object.assign(this.config, JSON.parse(savedConfig));
        }
    }
    
    // 更新UI
    updateUI() {
        this.totalTasks.textContent = '0';
        this.completedTasks.textContent = '0';
    }
    
    // 工具函数：睡眠
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 初始化主题
    initTheme() {
        // 从localStorage读取保存的主题
        const savedTheme = localStorage.getItem('novel_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme);
    }
    
    // 切换主题
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('novel_theme', newTheme);
        this.updateThemeButton(newTheme);
        
        this.addLog('system', `🌓 已切换到${newTheme === 'dark' ? '黑暗' : '明亮'}模式`);
    }
    
    // 更新主题按钮
    updateThemeButton(theme) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
            themeToggle.title = theme === 'dark' ? '切换到明亮模式' : '切换到黑暗模式';
        }
    }
    
    // 初始化移动端菜单
    initMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileOutputBtn = document.getElementById('mobileOutputBtn');
        const mobileOverlay = document.getElementById('mobileOverlay');
        const projectPanel = document.querySelector('.project-panel');
        const outputPanel = document.querySelector('.output-panel');
        
        if (!mobileMenuBtn || !mobileOutputBtn) return;
        
        // 项目菜单按钮
        mobileMenuBtn.addEventListener('click', () => {
            projectPanel.classList.toggle('active');
            mobileOverlay.classList.toggle('active');
            
            // 关闭另一个面板
            if (outputPanel.classList.contains('active')) {
                outputPanel.classList.remove('active');
            }
        });
        
        // 输出菜单按钮
        mobileOutputBtn.addEventListener('click', () => {
            outputPanel.classList.toggle('active');
            mobileOverlay.classList.toggle('active');
            
            // 关闭另一个面板
            if (projectPanel.classList.contains('active')) {
                projectPanel.classList.remove('active');
            }
        });
        
        // 点击遮罩层关闭菜单
        mobileOverlay.addEventListener('click', () => {
            projectPanel.classList.remove('active');
            outputPanel.classList.remove('active');
            mobileOverlay.classList.remove('active');
        });
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                projectPanel.classList.remove('active');
                outputPanel.classList.remove('active');
                mobileOverlay.classList.remove('active');
            }
        });
    }
}

// 全局函数
window.closeModal = function() {
    document.querySelector('.modal').classList.remove('show');
};

window.saveSettings = function() {
    window.autoNovelSystem.saveSettings();
};

// 初始化系统
document.addEventListener('DOMContentLoaded', () => {
    window.autoNovelSystem = new AutoNovelSystem();
});
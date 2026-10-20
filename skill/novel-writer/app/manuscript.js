// 原稿工作台 - 存储原稿、无限画布浏览、从任一章修改并重写后续章节
(function () {
    'use strict';

    const MAX_VERSIONS = 5;
    const CARD_W = 300, CARD_H = 210, GAP_X = 60, GAP_Y = 70, COLS = 5;

    // ========== 存储层：优先 claude.ai 数据库（每位用户私有），否则用浏览器本地存储 ==========
    const Store = {
        mode: 'local',
        db: null,
        uid: null,
        ready: null,

        init() {
            if (this.ready) return this.ready;
            this.ready = (async () => {
                try {
                    if (window.claude && window.claude.use) {
                        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
                        const uid = user ? await user.id() : null;
                        if (db && uid) {
                            this.db = db;
                            this.uid = uid;
                            this.mode = 'cloud';
                        }
                    }
                } catch (e) {
                    console.warn('原稿云端存储不可用，改用本地存储', e);
                }
                if (this.mode !== 'cloud' && window.NovelLocal && await window.NovelLocal.ready && window.NovelLocal.info.storage !== false) this.mode = 'server';
                return this.mode;
            })();
            return this.ready;
        },

        // 本地存储工具
        lsGet(key, fallback) {
            try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
        },
        lsSet(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error('本地存储失败', e); throw new Error('浏览器存储空间不足或不可用'); }
        },

        root() { return 'data/users/' + this.uid; },

        // 本地服务器：小说保存为电脑上的文件
        async api(method, url, body) {
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + r.status));
            return data;
        },

        async listManuscripts() {
            await this.init();
            if (this.mode === 'cloud') {
                const snap = await this.db.collection(this.root()).get();
                return snap.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(m => m.kind === 'manuscript')
                    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
            }
            if (this.mode === 'server') {
                return (await this.api('GET', '/api/novels')).filter(m => m.kind === 'manuscript')
                    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
            }
            return this.lsGet('ms_index', []).map(id => this.lsGet('ms_meta_' + id, null)).filter(Boolean)
                .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        },

        async saveMeta(meta) {
            await this.init();
            meta.kind = 'manuscript';
            meta.updatedAt = new Date().toISOString();
            if (this.mode === 'cloud') {
                const data = Object.assign({}, meta); delete data.id;
                await this.db.collection(this.root()).doc(meta.id).set(data);
                return;
            }
            if (this.mode === 'server') return this.api('PUT', '/api/novels/' + encodeURIComponent(meta.id), meta);
            const idx = this.lsGet('ms_index', []);
            if (!idx.includes(meta.id)) { idx.push(meta.id); this.lsSet('ms_index', idx); }
            this.lsSet('ms_meta_' + meta.id, meta);
        },

        async loadChapters(msId) {
            await this.init();
            if (this.mode === 'cloud') {
                const snap = await this.db.collection(this.root()).doc(msId).collection('chapters').get();
                return snap.docs.map(d => d.data()).sort((a, b) => a.number - b.number);
            }
            if (this.mode === 'server') return this.api('GET', '/api/novels/' + encodeURIComponent(msId) + '/chapters');
            return this.lsGet('ms_chapters_' + msId, []).sort((a, b) => a.number - b.number);
        },

        async saveChapter(msId, ch) {
            await this.init();
            if (this.mode === 'cloud') {
                await this.db.collection(this.root()).doc(msId).collection('chapters').doc(String(ch.number)).set(ch);
                return;
            }
            if (this.mode === 'server') return this.api('PUT', '/api/novels/' + encodeURIComponent(msId) + '/chapters/' + ch.number, ch);
            const list = this.lsGet('ms_chapters_' + msId, []);
            const i = list.findIndex(c => c.number === ch.number);
            if (i >= 0) list[i] = ch; else list.push(ch);
            this.lsSet('ms_chapters_' + msId, list);
        },

        async deleteManuscript(msId) {
            await this.init();
            if (this.mode === 'cloud') {
                const ref = this.db.collection(this.root()).doc(msId);
                const snap = await ref.collection('chapters').get();
                for (const d of snap.docs) await ref.collection('chapters').doc(d.id).delete();
                await ref.delete();
                return;
            }
            if (this.mode === 'server') return this.api('DELETE', '/api/novels/' + encodeURIComponent(msId));
            this.lsSet('ms_index', this.lsGet('ms_index', []).filter(id => id !== msId));
            try { localStorage.removeItem('ms_meta_' + msId); localStorage.removeItem('ms_chapters_' + msId); } catch (e) { /* 忽略 */ }
        }
    };

    // ========== 工具函数 ==========
    const $ = (sel, el) => (el || document).querySelector(sel);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toText = v => {
        if (v == null) return '';
        if (typeof v === 'string') return v;
        const j = JSON.stringify(v, null, 2);
        return j === '{}' || j === '[]' ? '' : j;
    };
    const clip = (s, n) => { s = toText(s); return s.length > n ? s.slice(0, n) + '…' : s; };
    const tail = (s, n) => { s = toText(s); return s.length > n ? '…' + s.slice(-n) : s; };
    const countWords = s => toText(s).replace(/\s/g, '').length;
    const newId = () => 'ms' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    function extractTitle(content, number) {
        const first = toText(content).split('\n').map(l => l.replace(/^[#\s*]+/, '').trim()).find(l => l);
        if (!first) return '';
        const m = first.match(/^第\s*[0-9零一二三四五六七八九十百千]+\s*章[\s:：·、-]*(.*)$/);
        if (m) return m[1].replace(/[*#]+$/, '').trim().slice(0, 40);
        return '';
    }

    function app() { return window.autoNovelSystem; }

    // ========== 工作台 ==========
    const Workbench = {
        manuscripts: [],
        ms: null,           // 当前原稿元数据
        chapters: [],       // 当前原稿章节
        view: { x: 40, y: 40, k: 1 },
        editing: null,      // 正在编辑的章节号
        job: null,          // 正在进行的重写任务

        async open() {
            $('#msWorkbench').classList.add('show');
            document.body.style.overflow = 'hidden';
            const mode = await Store.init();
            $('#msStorageMode').textContent = mode === 'cloud' ? '☁️ 已保存到你的 Claude 账号' : mode === 'server' ? '💾 已保存到电脑：' + ((window.NovelLocal.info || {}).dataDir || '') : '💾 保存在本浏览器';
            await this.refreshList();
            const a = app();
            const linked = a && a.project.manuscriptId;
            const target = (this.ms && this.ms.id) || linked || (this.manuscripts[0] && this.manuscripts[0].id);
            if (target) await this.select(target); else this.render();
        },

        close() {
            $('#msWorkbench').classList.remove('show');
            document.body.style.overflow = '';
            this.closeEditor();
        },

        async refreshList() {
            try {
                this.manuscripts = await Store.listManuscripts();
            } catch (e) {
                this.toast('读取原稿失败：' + (e.message || e.code), true);
                this.manuscripts = [];
            }
            const sel = $('#msSelect');
            sel.innerHTML = this.manuscripts.length
                ? this.manuscripts.map(m => `<option value="${esc(m.id)}">${esc(m.title || '未命名')}（${m.chapterCount || 0}章）</option>`).join('')
                : '<option value="">还没有原稿</option>';
            if (this.ms) sel.value = this.ms.id;
        },

        async select(id) {
            const meta = this.manuscripts.find(m => m.id === id);
            if (!meta) { this.ms = null; this.chapters = []; this.render(); return; }
            this.ms = meta;
            $('#msSelect').value = id;
            try {
                this.chapters = await Store.loadChapters(id);
            } catch (e) {
                this.toast('读取章节失败：' + (e.message || e.code), true);
                this.chapters = [];
            }
            this.layoutMissing();
            this.render();
            this.fitView();
        },

        // ---------- 原稿来源 ----------
        async saveFromProject() {
            const a = app();
            if (!a || !a.project.chapters.length) {
                this.toast('当前项目还没有章节，可以先开始创作，或用「导入」载入已有 Markdown/文本原稿', true);
                return;
            }
            const ms = await syncProject(a.project, true);
            await this.refreshList();
            await this.select(ms.id);
            this.toast(`已存入原稿《${ms.title}》，共 ${a.project.chapters.length} 章`);
        },

        importFile(after) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.md,.txt,.json';
            input.onchange = async () => {
                const file = input.files[0];
                if (!file) return;
                const text = await file.text();
                try {
                    let title = file.name.replace(/\.(md|txt|json)$/i, '').replace(/_进度_.*$/, '');
                    let meta = {}, chapters = [];
                    if (/\.json$/i.test(file.name)) {
                        const data = JSON.parse(text);
                        const p = data.project || data;
                        title = p.title || title;
                        meta = projectMeta(p);
                        chapters = (p.chapters || []).map((c, i) => ({ number: c.number || i + 1, content: c.content }));
                    } else {
                        chapters = splitChapters(text);
                        const h1 = text.match(/^#\s+《?([^》\n]+)》?/m);
                        if (h1 && !/^第.+章/.test(h1[1])) title = h1[1].trim();
                    }
                    if (!chapters.length) throw new Error('没有识别到章节（需要「第X章」形式的标题）');
                    const ms = Object.assign({ id: newId(), title, createdAt: new Date().toISOString() }, meta);
                    const now = new Date().toISOString();
                    chapters.forEach((c, i) => {
                        c.title = c.title || extractTitle(c.content, c.number);
                        c.updatedAt = now; c.source = 'import'; c.versions = [];
                        c.x = (i % COLS) * (CARD_W + GAP_X); c.y = Math.floor(i / COLS) * (CARD_H + GAP_Y);
                    });
                    ms.chapterCount = chapters.length;
                    for (const c of chapters) await Store.saveChapter(ms.id, c);
                    await Store.saveMeta(ms);
                    if (meta && Object.keys(meta).length) {
                        // 进度 JSON：一并保存创作进度，书架里可以直接续写
                        const p = Object.assign(freshProject(), (JSON.parse(text).project || JSON.parse(text)));
                        p.chapters = chapters; p.context = p.context || {}; p.manuscriptId = ms.id;
                        ms.projectState = compactState({ project: p, state: JSON.parse(text).state || {} });
                        ms.targetChapters = p.targetChapters;
                        await Store.saveMeta(ms);
                    }
                    if (after) { await after(ms); return Shelf.toast(`已导入《${title}》，共 ${chapters.length} 章`); }
                    await this.refreshList();
                    await this.select(ms.id);
                    this.toast(`已导入《${title}》，共 ${chapters.length} 章`);
                } catch (e) {
                    this.toast('导入失败：' + e.message, true);
                }
            };
            input.click();
        },

        async deleteCurrent() {
            if (!this.ms) return;
            if (!confirm(`确定删除原稿《${this.ms.title}》吗？此操作无法撤销。`)) return;
            await Store.deleteManuscript(this.ms.id);
            const a = app();
            if (a && a.project.manuscriptId === this.ms.id) delete a.project.manuscriptId;
            this.ms = null; this.chapters = [];
            await this.refreshList();
            if (this.manuscripts[0]) await this.select(this.manuscripts[0].id); else this.render();
        },

        exportMarkdown() {
            if (!this.ms || !this.chapters.length) return this.toast('当前原稿没有章节', true);
            let md = `# ${this.ms.title}\n\n`;
            this.chapters.forEach(c => {
                const body = toText(c.content).trim();
                const hasHeading = /^#{0,3}\s*第.+章/.test(body);
                md += (hasHeading ? body : `## 第${c.number}章 ${c.title || ''}\n\n${body}`) + '\n\n---\n\n';
            });
            download(`${this.ms.title}_原稿.md`, md, 'text/markdown;charset=utf-8');
        },

        exportJson() {
            if (!this.ms) return;
            const data = { project: Object.assign({}, this.ms, { chapters: this.chapters.map(c => ({ number: c.number, content: c.content, title: c.title })) }) };
            download(`${this.ms.title}_原稿.json`, JSON.stringify(data, null, 2), 'application/json');
        },

        // ---------- 画布 ----------
        layoutMissing() {
            this.chapters.forEach((c, i) => {
                if (typeof c.x !== 'number' || typeof c.y !== 'number') {
                    c.x = (i % COLS) * (CARD_W + GAP_X);
                    c.y = Math.floor(i / COLS) * (CARD_H + GAP_Y);
                }
            });
        },

        async autoLayout() {
            this.chapters.forEach((c, i) => {
                c.x = (i % COLS) * (CARD_W + GAP_X);
                c.y = Math.floor(i / COLS) * (CARD_H + GAP_Y);
            });
            this.render();
            this.fitView();
            for (const c of this.chapters) await Store.saveChapter(this.ms.id, c);
        },

        render() {
            const world = $('#msWorld');
            const empty = $('#msEmpty');
            if (!this.ms || !this.chapters.length) {
                world.innerHTML = '';
                empty.style.display = 'flex';
                $('#msInfo').textContent = '';
                return;
            }
            empty.style.display = 'none';
            const total = this.chapters.reduce((s, c) => s + countWords(c.content), 0);
            $('#msInfo').textContent = `${this.chapters.length} 章 · 约 ${total.toLocaleString()} 字`;

            const jobNums = this.job ? this.job.queue : [];
            const cards = this.chapters.map(c => {
                let badge = '';
                if (this.job && this.job.current === c.number) badge = '<span class="ms-badge run">重写中…</span>';
                else if (jobNums.includes(c.number)) badge = '<span class="ms-badge wait">排队中</span>';
                else if (c.stale) badge = '<span class="ms-badge stale">前文已改·待更新</span>';
                else if (c.source === 'manual') badge = '<span class="ms-badge edit">手动修改</span>';
                else if (c.source === 'rewrite') badge = '<span class="ms-badge ai">AI重写</span>';
                return `<div class="ms-card${this.editing === c.number ? ' active' : ''}" data-n="${c.number}" style="left:${c.x}px;top:${c.y}px">
                    <div class="ms-card-head" data-drag="${c.number}">
                        <span class="ms-card-num">第${c.number}章</span>
                        <span class="ms-card-title">${esc(c.title || '')}</span>
                    </div>
                    <div class="ms-card-body">${esc(clip(toText(c.content).replace(/^.*第.+章.*\n/, '').trim(), 140))}</div>
                    <div class="ms-card-foot">
                        <span class="ms-card-meta">${countWords(c.content)}字 ${badge}</span>
                        <span>
                            <button class="ms-mini" data-act="edit" data-n="${c.number}">✏️ 编辑</button>
                            <button class="ms-mini primary" data-act="rewrite" data-n="${c.number}">🔁 改写后续</button>
                        </span>
                    </div>
                </div>`;
            }).join('');

            // 章节之间的连线
            const lines = [];
            for (let i = 1; i < this.chapters.length; i++) {
                const a = this.chapters[i - 1], b = this.chapters[i];
                if (b.x >= a.x + CARD_W / 2) {
                    // 同一行：右侧连到左侧
                    const x1 = a.x + CARD_W, y1 = a.y + CARD_H / 2, x2 = b.x, y2 = b.y + CARD_H / 2;
                    const dx = Math.max(30, Math.abs(x2 - x1) / 2);
                    lines.push(`<path d="M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}" />`);
                } else {
                    // 换行：底部连到下一张卡片顶部
                    const x1 = a.x + CARD_W / 2, y1 = a.y + CARD_H, x2 = b.x + CARD_W / 2, y2 = b.y;
                    const dy = Math.max(30, Math.abs(y2 - y1) / 2);
                    lines.push(`<path d="M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}" />`);
                }
            }
            const maxX = Math.max(...this.chapters.map(c => c.x)) + CARD_W + 200;
            const maxY = Math.max(...this.chapters.map(c => c.y)) + CARD_H + 200;
            world.innerHTML = `<svg class="ms-links" width="${maxX}" height="${maxY}" style="left:-100px;top:-100px"><g transform="translate(100,100)">${lines.join('')}</g></svg>${cards}`;
            this.applyView();
        },

        applyView() {
            const v = this.view;
            $('#msWorld').style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.k})`;
            const vp = $('#msViewport');
            const g = 24 * v.k;
            vp.style.backgroundSize = `${g}px ${g}px`;
            vp.style.backgroundPosition = `${v.x}px ${v.y}px`;
            $('#msZoom').textContent = Math.round(v.k * 100) + '%';
        },

        zoomBy(f, cx, cy) {
            const vp = $('#msViewport').getBoundingClientRect();
            if (cx == null) { cx = vp.width / 2; cy = vp.height / 2; }
            const v = this.view;
            const k = Math.min(2.5, Math.max(0.15, v.k * f));
            v.x = cx - (cx - v.x) * (k / v.k);
            v.y = cy - (cy - v.y) * (k / v.k);
            v.k = k;
            this.applyView();
        },

        fitView() {
            if (!this.chapters.length) return;
            const vp = $('#msViewport').getBoundingClientRect();
            const minX = Math.min(...this.chapters.map(c => c.x)), minY = Math.min(...this.chapters.map(c => c.y));
            const maxX = Math.max(...this.chapters.map(c => c.x)) + CARD_W, maxY = Math.max(...this.chapters.map(c => c.y)) + CARD_H;
            const k = Math.min(1, Math.max(0.15, Math.min((vp.width - 80) / (maxX - minX), (vp.height - 80) / (maxY - minY))));
            this.view = { k, x: 40 - minX * k, y: 40 - minY * k };
            this.applyView();
        },

        focusChapter(n) {
            const c = this.chapters.find(x => x.number === n);
            if (!c) return;
            const vp = $('#msViewport').getBoundingClientRect();
            const k = Math.max(this.view.k, 0.8);
            this.view = { k, x: vp.width / 3 - (c.x + CARD_W / 2) * k, y: vp.height / 2 - (c.y + CARD_H / 2) * k };
            this.applyView();
        },

        bindCanvas() {
            const vp = $('#msViewport');
            let drag = null;

            vp.addEventListener('wheel', e => {
                e.preventDefault();
                const r = vp.getBoundingClientRect();
                // 触控板双指滑动 / Shift+滚轮 平移；滚轮或 Ctrl+滚轮（触控板捏合）缩放
                if (!e.ctrlKey && !e.metaKey && (e.shiftKey || Math.abs(e.deltaX) > 0.5)) {
                    this.view.x -= e.shiftKey ? e.deltaY : e.deltaX;
                    this.view.y -= e.shiftKey ? 0 : e.deltaY;
                    this.applyView();
                } else {
                    const f = Math.exp(-Math.max(-50, Math.min(50, e.deltaY)) * (e.ctrlKey ? 0.01 : 0.003));
                    this.zoomBy(f, e.clientX - r.left, e.clientY - r.top);
                }
            }, { passive: false });

            vp.addEventListener('pointerdown', e => {
                const btn = e.target.closest('button');
                if (btn) return;
                const head = e.target.closest('[data-drag]');
                if (head) {
                    const n = +head.dataset.drag;
                    const c = this.chapters.find(x => x.number === n);
                    drag = { type: 'card', c, sx: e.clientX, sy: e.clientY, ox: c.x, oy: c.y, moved: false };
                } else if (!e.target.closest('.ms-card')) {
                    drag = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: this.view.x, oy: this.view.y };
                    vp.classList.add('panning');
                } else {
                    return;
                }
                vp.setPointerCapture(e.pointerId);
            });
            vp.addEventListener('pointermove', e => {
                if (!drag) return;
                const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
                if (drag.type === 'pan') {
                    this.view.x = drag.ox + dx; this.view.y = drag.oy + dy;
                    this.applyView();
                } else {
                    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
                    drag.c.x = Math.round(drag.ox + dx / this.view.k);
                    drag.c.y = Math.round(drag.oy + dy / this.view.k);
                    this.render();
                }
            });
            const end = () => {
                if (drag && drag.type === 'card' && drag.moved && this.ms) {
                    Store.saveChapter(this.ms.id, drag.c).catch(err => this.toast('保存位置失败：' + (err.message || err.code), true));
                }
                drag = null;
                vp.classList.remove('panning');
            };
            vp.addEventListener('pointerup', end);
            vp.addEventListener('pointercancel', end);

            vp.addEventListener('click', e => {
                const btn = e.target.closest('button[data-act]');
                if (btn) {
                    const n = +btn.dataset.n;
                    if (btn.dataset.act === 'edit') this.openEditor(n);
                    if (btn.dataset.act === 'rewrite') this.openRewriteDialog(n);
                }
            });
            vp.addEventListener('dblclick', e => {
                const card = e.target.closest('.ms-card');
                if (card) this.openEditor(+card.dataset.n);
            });
        },

        // ---------- 编辑 ----------
        openEditor(n) {
            const c = this.chapters.find(x => x.number === n);
            if (!c) return;
            this.editing = n;
            $('#msEdNum').textContent = `第${n}章`;
            $('#msEdTitle').value = c.title || '';
            $('#msEdContent').value = toText(c.content);
            this.updateEditorCount();
            const vs = c.versions || [];
            $('#msEdVersions').innerHTML = '<option value="">历史版本（' + vs.length + '）</option>' +
                vs.map((v, i) => `<option value="${i}">${new Date(v.at).toLocaleString()} · ${v.source === 'rewrite' ? 'AI重写前' : v.source === 'manual' ? '手动修改前' : '原始'}</option>`).join('');
            $('#msEditor').classList.add('show');
            this.render();
            this.focusChapter(n);
        },

        closeEditor() {
            this.editing = null;
            $('#msEditor').classList.remove('show');
            this.render();
        },

        updateEditorCount() {
            $('#msEdCount').textContent = countWords($('#msEdContent').value) + ' 字';
        },

        restoreVersion() {
            const i = $('#msEdVersions').value;
            if (i === '') return;
            const c = this.chapters.find(x => x.number === this.editing);
            const v = c.versions[+i];
            if (!confirm('把编辑框内容替换为这个历史版本？（点保存后生效）')) { $('#msEdVersions').value = ''; return; }
            $('#msEdContent').value = v.content;
            $('#msEdTitle').value = v.title || '';
            this.updateEditorCount();
            $('#msEdVersions').value = '';
        },

        async saveEditor(thenRewrite) {
            const n = this.editing;
            const c = this.chapters.find(x => x.number === n);
            const content = $('#msEdContent').value;
            const title = $('#msEdTitle').value.trim();
            const titleEdited = title !== (c.title || '');
            const changed = content !== toText(c.content) || titleEdited;
            if (changed) {
                pushVersion(c, 'manual');
                c.content = content;
                c.title = titleEdited ? title : (extractTitle(content, n) || title);
                c.source = 'manual';
                c.stale = false;
                c.updatedAt = new Date().toISOString();
                try {
                    await Store.saveChapter(this.ms.id, c);
                    // 标记后续章节为“待更新”
                    for (const later of this.chapters.filter(x => x.number > n && !x.stale)) {
                        later.stale = true;
                        await Store.saveChapter(this.ms.id, later);
                    }
                    await Store.saveMeta(this.ms);
                    syncBackToProject(this.ms, this.chapters);
                    this.toast(`第${n}章已保存`);
                } catch (e) {
                    this.toast('保存失败：' + (e.message || e.code), true);
                    return;
                }
            }
            this.render();
            if (thenRewrite) this.openRewriteDialog(n);
        },

        // ---------- 从某章开始重写后续 ----------
        openRewriteDialog(n) {
            if (this.job) return this.toast('已有重写任务在进行中', true);
            const last = this.chapters[this.chapters.length - 1].number;
            const d = $('#msRewriteDlg');
            d.dataset.n = n;
            $('#msRwFrom').textContent = `第${n}章`;
            const hasLater = last > n;
            $('#msRwModeRewrite').disabled = !hasLater;
            $('#msRwModeRewrite').checked = hasLater;
            $('#msRwModeContinue').checked = !hasLater;
            $('#msRwTo').min = n + 1;
            $('#msRwTo').max = last;
            $('#msRwTo').value = last;
            $('#msRwLastHint').textContent = hasLater ? `（目前共 ${last} 章）` : '（这是最后一章）';
            $('#msRwCount').value = 1;
            $('#msRwNote').value = '';
            $('#msRwWords').value = (app() && app().config.chapterWords) || 3000;
            d.classList.add('show');
        },

        async startRewrite() {
            const d = $('#msRewriteDlg');
            const from = +d.dataset.n;
            const last = this.chapters[this.chapters.length - 1].number;
            let queue = [];
            if ($('#msRwModeRewrite').checked) {
                const to = Math.min(last, Math.max(from + 1, parseInt($('#msRwTo').value, 10) || last));
                for (let i = from + 1; i <= to; i++) queue.push(i);
                const extra = parseInt($('#msRwCountAfter').value, 10) || 0;
                if (to === last) for (let i = 1; i <= extra; i++) queue.push(last + i);
            } else {
                const cnt = Math.max(1, Math.min(50, parseInt($('#msRwCount').value, 10) || 1));
                // 续写：在最后一章之后追加；若起点不是最后一章，后续章节保持不变
                for (let i = 1; i <= cnt; i++) queue.push(last + i);
            }
            const opts = {
                keepPlot: $('#msRwKeepPlot').checked,
                note: $('#msRwNote').value.trim(),
                words: parseInt($('#msRwWords').value, 10) || 3000
            };
            d.classList.remove('show');
            if (!queue.length) return;
            if (!app()) return this.toast('创作系统未就绪', true);

            this.job = { queue: queue.slice(), current: null, stop: false, done: 0, total: queue.length };
            this.updateJobBar();
            this.render();
            try {
                while (this.job.queue.length && !this.job.stop) {
                    const n = this.job.queue.shift();
                    this.job.current = n;
                    this.updateJobBar();
                    this.render();
                    this.focusChapter(Math.max(1, n - 1));
                    const prompt = buildRewritePrompt(this.ms, this.chapters, n, opts);
                    const text = await app().callAI(prompt);
                    let c = this.chapters.find(x => x.number === n);
                    if (c) {
                        pushVersion(c, 'rewrite');
                    } else {
                        const prev = this.chapters[this.chapters.length - 1];
                        const idx = this.chapters.length;
                        c = { number: n, versions: [], x: prev ? prev.x + CARD_W + GAP_X : 0, y: prev ? prev.y : 0 };
                        if (idx % COLS === 0 && prev) { c.x = 0; c.y = prev.y + CARD_H + GAP_Y; }
                        this.chapters.push(c);
                    }
                    c.content = text.trim();
                    c.title = extractTitle(c.content, n);
                    c.source = 'rewrite';
                    c.stale = false;
                    c.updatedAt = new Date().toISOString();
                    await Store.saveChapter(this.ms.id, c);
                    this.ms.chapterCount = this.chapters.length;
                    await Store.saveMeta(this.ms);
                    syncBackToProject(this.ms, this.chapters);
                    this.job.done++;
                    this.job.current = null;
                    this.render();
                }
                this.toast(this.job.stop ? `已停止，完成 ${this.job.done} 章` : `完成！共重写/续写 ${this.job.done} 章`);
            } catch (e) {
                this.toast('重写中断：' + e.message, true);
            } finally {
                this.job = null;
                this.updateJobBar();
                this.render();
                this.refreshList();
            }
        },

        updateJobBar() {
            const bar = $('#msJobBar');
            if (!this.job) { bar.style.display = 'none'; return; }
            bar.style.display = 'flex';
            const cur = this.job.current ? `正在写第${this.job.current}章` : '准备中';
            $('#msJobText').textContent = `🔁 ${cur} · 已完成 ${this.job.done}/${this.job.total}${this.job.stop ? '（本章写完后停止）' : ''}`;
        },

        toast(msg, isErr) {
            const t = $('#msToast');
            t.textContent = msg;
            t.className = 'ms-toast show' + (isErr ? ' err' : '');
            clearTimeout(this._tt);
            this._tt = setTimeout(() => t.classList.remove('show'), isErr ? 6000 : 3000);
        },

        bind() {
            $('#msOpenBtn') && $('#msOpenBtn').addEventListener('click', () => this.open());
            $('#msOpenBtn2') && $('#msOpenBtn2').addEventListener('click', () => this.open());
            $('#msClose').addEventListener('click', () => this.close());
            $('#msSelect').addEventListener('change', e => e.target.value && this.select(e.target.value));
            $('#msFromProject').addEventListener('click', () => this.saveFromProject());
            $('#msImport').addEventListener('click', () => this.importFile());
            $('#msExportMd').addEventListener('click', () => this.exportMarkdown());
            $('#msExportJson').addEventListener('click', () => this.exportJson());
            $('#msDelete').addEventListener('click', () => this.deleteCurrent());
            $('#msFit').addEventListener('click', () => this.fitView());
            $('#msLayout').addEventListener('click', () => this.ms && this.autoLayout());
            $('#msZoomIn').addEventListener('click', () => this.zoomBy(1.2));
            $('#msZoomOut').addEventListener('click', () => this.zoomBy(1 / 1.2));
            $('#msEdClose').addEventListener('click', () => this.closeEditor());
            $('#msEdSave').addEventListener('click', () => this.saveEditor(false));
            $('#msEdSaveRewrite').addEventListener('click', () => this.saveEditor(true));
            $('#msEdContent').addEventListener('input', () => this.updateEditorCount());
            $('#msEdVersions').addEventListener('change', () => this.restoreVersion());
            $('#msRwCancel').addEventListener('click', () => $('#msRewriteDlg').classList.remove('show'));
            $('#msRwStart').addEventListener('click', () => this.startRewrite());
            $('#msJobStop').addEventListener('click', () => { if (this.job) { this.job.stop = true; this.updateJobBar(); } });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && $('#msWorkbench').classList.contains('show')) {
                    if ($('#msRewriteDlg').classList.contains('show')) $('#msRewriteDlg').classList.remove('show');
                    else if (this.editing) this.closeEditor();
                }
            });
            this.bindCanvas();
        }
    };

    // ========== 原稿与创作项目之间的同步 ==========
    function projectMeta(p) {
        const ctx = p.context || {};
        return {
            concept: p.concept || '',
            type: p.type || '',
            style: p.style || '',
            styleContent: p.styleContent || '',
            worldview: toText(ctx.worldview || p.worldview || ''),
            characters: toText(ctx.characters || p.characters || ''),
            outline: toText(ctx.outline || p.outline || ''),
            plot: toText(ctx.plotStructure || '')
        };
    }

    async function syncProject(project, all) {
        let ms = null;
        if (project.manuscriptId) {
            ms = (await Store.listManuscripts()).find(m => m.id === project.manuscriptId) || null;
        }
        if (!ms) {
            ms = { id: newId(), createdAt: new Date().toISOString() };
            project.manuscriptId = ms.id;
        }
        Object.assign(ms, projectMeta(project), { title: project.title || ms.title || '未命名小说' });
        const existing = await Store.loadChapters(ms.id);
        const list = all ? project.chapters : project.chapters.slice(-1);
        for (const pc of list) {
            const n = pc.number;
            let c = existing.find(x => x.number === n);
            if (c && toText(c.content) === toText(pc.content)) continue;
            if (c) pushVersion(c, c.source || 'ai');
            else {
                const i = n - 1;
                c = { number: n, versions: [], x: (i % COLS) * (CARD_W + GAP_X), y: Math.floor(i / COLS) * (CARD_H + GAP_Y) };
            }
            c.content = toText(pc.content);
            c.title = extractTitle(c.content, n);
            c.source = 'ai';
            c.updatedAt = new Date().toISOString();
            await Store.saveChapter(ms.id, c);
        }
        ms.chapterCount = Math.max(existing.length, project.chapters.length);
        await Store.saveMeta(ms);
        return ms;
    }

    // 原稿修改后，同步回当前创作项目，让后续自动创作基于修改后的内容
    function syncBackToProject(ms, chapters) {
        const a = app();
        if (!a || a.project.manuscriptId !== ms.id) return;
        a.project.chapters = chapters.map(c => {
            const old = a.project.chapters.find(x => x.number === c.number) || {};
            return Object.assign({}, old, { number: c.number, content: c.content, revisedAt: c.updatedAt });
        });
        if (a.updateChaptersDisplay) try { a.updateChaptersDisplay(); } catch (e) { /* 忽略 */ }
        if (a.currentChapterEl) a.currentChapterEl.textContent = a.project.chapters.length;
    }

    function pushVersion(c, source) {
        if (!c.content) return;
        c.versions = (c.versions || []).concat([{ content: toText(c.content), title: c.title || '', at: c.updatedAt || new Date().toISOString(), source: source }]).slice(-MAX_VERSIONS);
    }

    function splitChapters(text) {
        const re = /^(?:#{1,4}\s*)?第\s*([0-9零一二三四五六七八九十百千]+)\s*章.*$/gm;
        const marks = [];
        let m;
        while ((m = re.exec(text))) marks.push(m.index);
        return marks.map((start, i) => ({
            number: i + 1,
            content: text.slice(start, marks[i + 1] != null ? marks[i + 1] : text.length).replace(/\n-{3,}\s*$/, '').trim()
        }));
    }

    function buildRewritePrompt(ms, chapters, n, opts) {
        const before = chapters.filter(c => c.number < n);
        const near = before.slice(-2);
        const far = before.slice(0, -2).slice(-40);
        const old = chapters.find(c => c.number === n);
        const isNew = !old;
        let p = `你是一位职业小说作者，正在修订长篇小说《${ms.title}》。前面的章节已经被作者修改过，你需要${isNew ? '接着最新的前文续写' : '重写'}第${n}章，使它与修改后的前文完全衔接、前后一致。\n\n`;
        if (ms.type || ms.concept) p += `【作品设定】\n类型：${ms.type || '未指定'}\n初始概念：${clip(ms.concept, 1500)}\n\n`;
        if (ms.styleContent) p += `【写作风格要求】\n${clip(ms.styleContent, 4000)}\n\n`;
        if (ms.worldview) p += `【世界观】\n${clip(ms.worldview, 4000)}\n\n`;
        if (ms.characters) p += `【角色设定】\n${clip(ms.characters, 4000)}\n\n`;
        if (ms.outline) p += `【章节大纲】\n${clip(ms.outline, 8000)}\n\n`;
        if (far.length) p += `【更早章节梗概】\n${far.map(c => `第${c.number}章 ${c.title || ''}：${clip(toText(c.content).replace(/\s+/g, ' '), 160)}`).join('\n')}\n\n`;
        near.forEach(c => { p += `【第${c.number}章 全文（已定稿，必须以此为准）】\n${tail(c.content, 7000)}\n\n`; });
        if (old && opts.keepPlot) {
            p += `【第${n}章 旧版本（仅供参考剧情走向）】\n${clip(old.content, 6000)}\n\n注意：旧版本是基于修改前的前文写的，可以保留其中仍然合理的情节，但凡与修改后的前文矛盾的人物、地点、事件、设定都必须改正，一切以修改后的前文为准。\n\n`;
        }
        if (opts.note) p += `【作者的补充要求】\n${opts.note}\n\n`;
        p += `【输出要求】\n1. 写第${n}章完整正文，约${opts.words}字。\n2. 第一行写章节标题，格式：第${n}章 标题。\n3. 直接输出小说正文，不要任何解释、说明或批注。\n`;
        return p;
    }

    function download(name, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name.replace(/[<>:"/\\|?*]/g, '_');
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // ========== 每部小说的创作进度 ==========
    const CORE_CTX = ['worldview', 'characters', 'outline', 'plotStructure'];

    function compactState(a) {
        const p = a.project;
        const ctx = {};
        Object.keys(p.context || {}).forEach(k => {
            const v = p.context[k];
            ctx[k] = CORE_CTX.includes(k) ? v : clip(v, 6000);
        });
        const project = Object.assign({}, p, { chapters: undefined, context: ctx, styleContent: clip(p.styleContent, 20000) });
        delete project.chapters;
        const state = {
            currentStage: a.state.currentStage,
            completedTasks: a.state.completedTasks,
            totalTasks: a.state.totalTasks
        };
        let json = JSON.stringify({ project, state });
        if (json.length > 180000) {
            // 太大时只保留核心设定
            Object.keys(ctx).forEach(k => { if (!CORE_CTX.includes(k)) delete ctx[k]; });
            CORE_CTX.forEach(k => { if (ctx[k]) ctx[k] = clip(ctx[k], 30000); });
            json = JSON.stringify({ project, state });
        }
        return json;
    }

    let saveChain = Promise.resolve();
    let pending = null;   // {timer, run}

    function saveProgress(a) {
        if (!a || !a.project || !a.project.title) return;
        // 记住当时是哪一部小说，切换小说后也不会存错地方
        const snap = { project: a.project, state: Object.assign({}, a.state) };
        if (pending) clearTimeout(pending.timer);
        const run = () => {
            pending = null;
            saveChain = saveChain.then(async () => {
                const ms = await syncProject(snap.project, true);
                ms.projectState = compactState(snap);
                ms.targetChapters = snap.project.targetChapters;
                ms.chapterCount = Math.max(ms.chapterCount || 0, snap.project.chapters.length);
                await Store.saveMeta(ms);
            }).catch(e => console.error('保存小说进度失败', e));
            return saveChain;
        };
        pending = { timer: setTimeout(run, 800), run };
    }

    // 立即写入还在等待的保存
    function flushSave() {
        if (pending) { clearTimeout(pending.timer); return pending.run(); }
        return saveChain;
    }

    function freshProject() {
        return {
            title: '', type: 'mystery', length: 'short', targetChapters: 20, concept: '',
            style: '', styleContent: '', worldview: {}, characters: [], outline: [], chapters: [], context: {}
        };
    }

    // ========== 书架 ==========
    const TYPE_NAMES = {};
    const Shelf = {
        novels: [],

        canSwitch() {
            const a = app();
            if (!a || !a.state.isRunning) return true;
            if (a.state.isPaused && !a.state.busy && !a.currentReviewResolve) return true;
            this.toast('当前小说正在创作中，请先点「暂停」，等这一步写完后再切换', true);
            return false;
        },

        async open() {
            $('#shelf').classList.add('show');
            document.body.style.overflow = 'hidden';
            await this.refresh();
        },

        close() {
            $('#shelf').classList.remove('show');
            document.body.style.overflow = '';
        },

        async refresh() {
            await flushSave();
            try {
                this.novels = await Store.listManuscripts();
            } catch (e) {
                this.novels = [];
                this.toast('读取书架失败：' + (e.message || e.code), true);
            }
            const a = app();
            const current = a && a.project.manuscriptId;
            $('#shelfInfo').textContent = `${this.novels.length} 部小说 · ${Store.mode === 'cloud' ? '已保存到你的 Claude 账号' : Store.mode === 'server' ? '保存在 ' + ((window.NovelLocal.info || {}).dataDir || '本地文件夹') : '保存在本浏览器'}`;
            const cards = this.novels.map(m => {
                let st = null;
                try { st = m.projectState ? JSON.parse(m.projectState) : null; } catch (e) { /* 忽略 */ }
                const p = (st && st.project) || {};
                const done = m.chapterCount || 0;
                const target = m.targetChapters || p.targetChapters || 0;
                const pct = target ? Math.min(100, Math.round(done / target * 100)) : 0;
                const typeName = TYPE_NAMES[p.type || m.type] || p.type || m.type || '';
                const updated = m.updatedAt ? new Date(m.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                const isCur = m.id === current;
                return `<div class="shelf-card${isCur ? ' current' : ''}" data-id="${esc(m.id)}">
                    <div class="shelf-cover">${esc((m.title || '?').slice(0, 1))}</div>
                    <div class="shelf-main">
                        <div class="shelf-title">${esc(m.title || '未命名')}${isCur ? ' <span class="ms-badge edit">当前</span>' : ''}</div>
                        <div class="ms-muted">${esc(typeName)}${typeName ? ' · ' : ''}已写 ${done} 章${target ? ` / 目标 ${target} 章` : ''}</div>
                        <div class="shelf-bar"><div style="width:${pct}%"></div></div>
                        <div class="ms-muted">${esc(clip((p.concept || m.concept || '').replace(/\s+/g, ' '), 60))}</div>
                        <div class="ms-muted">最后更新 ${esc(updated)}</div>
                    </div>
                    <div class="shelf-actions">
                        <button class="ms-btn primary" data-act="continue">▶ ${done ? `续写第${done + 1}章` : '开始创作'}</button>
                        <button class="ms-btn" data-act="open">打开</button>
                        <button class="ms-btn" data-act="ms">📜 原稿</button>
                        <button class="ms-btn danger" data-act="del" title="删除">🗑</button>
                    </div>
                </div>`;
            }).join('');
            $('#shelfGrid').innerHTML = `<div class="shelf-card shelf-new" data-act="new"><div class="shelf-plus">＋</div><div>新建小说</div></div>` + cards;
        },

        async openNovel(id, autoStart) {
            if (!this.canSwitch()) return;
            const a = app();
            await flushSave();
            await this.refresh();
            const m = this.novels.find(x => x.id === id);
            if (!m || !a) return;
            let chapters;
            try {
                chapters = await Store.loadChapters(id);
            } catch (e) {
                return this.toast('读取章节失败：' + (e.message || e.code), true);
            }
            let st = null;
            try { st = m.projectState ? JSON.parse(m.projectState) : null; } catch (e) { /* 忽略 */ }
            a.stopRun();
            const project = Object.assign(freshProject(), st ? st.project : {
                title: m.title, type: m.type || 'mystery', concept: m.concept || '', style: m.style || '', styleContent: m.styleContent || '',
                length: 'infinite', customChapters: Math.max(20, chapters.length + 20), targetChapters: Math.max(20, chapters.length + 20),
                context: { worldview: m.worldview || '', characters: m.characters || '', outline: m.outline || '', plotStructure: m.plot || '' }
            });
            project.context = project.context || {};
            project.chapters = chapters.map(c => ({ number: c.number, content: toText(c.content), createdAt: c.updatedAt }));
            project.manuscriptId = m.id;
            a.project = project;
            a.state.currentStage = st && st.state ? st.state.currentStage : null;
            a.state.completedTasks = st && st.state ? st.state.completedTasks || 0 : 0;
            a.state.totalTasks = st && st.state ? st.state.totalTasks || 0 : 0;
            if (a.executionLog) a.executionLog.innerHTML = '';
            if (a.reviewPanel) a.reviewPanel.style.display = 'none';
            a.updateUIFromProject();
            a.currentTaskEl.textContent = '当前任务：等待开始';
            const n = project.chapters.length;
            a.addLog('system', `📚 已打开《${project.title}》，共 ${n} 章。${n ? `点「开始创作」将从第${n + 1}章继续写。` : '点「开始创作」开始写作。'}`);
            try { localStorage.setItem('shelf_current', id); } catch (e) { /* 忽略 */ }
            this.close();
            if (autoStart) a.start();
        },

        async newNovel() {
            if (!this.canSwitch()) return;
            await flushSave();
            const a = app();
            a.stopRun();
            a.project = freshProject();
            a.state.currentStage = null;
            a.state.completedTasks = 0;
            a.state.totalTasks = 0;
            a.novelTitle.value = '';
            a.initialConcept.value = '';
            if (a.writerStyle) a.writerStyle.value = '';
            if (a.executionLog) a.executionLog.innerHTML = '';
            if (a.reviewPanel) a.reviewPanel.style.display = 'none';
            a.updateUIFromProject();
            a.novelTitle.value = '';
            a.initialConcept.value = '';
            a.currentTaskEl.textContent = '当前任务：等待开始';
            a.addLog('system', '📖 新小说：填写名称、类型、篇幅和初始概念后，点「开始创作」。');
            try { localStorage.removeItem('shelf_current'); } catch (e) { /* 忽略 */ }
            this.close();
            a.novelTitle.focus();
        },

        async remove(id) {
            const m = this.novels.find(x => x.id === id);
            if (!m) return;
            const a = app();
            const isCur = a && a.project.manuscriptId === id;
            if (isCur && !this.canSwitch()) return;
            if (!confirm(`确定删除《${m.title}》吗？所有章节和进度都会删除，无法恢复。`)) return;
            await Store.deleteManuscript(id);
            if (isCur) this.newNovel();
            await this.refresh();
            this.open();
        },

        toast(msg, isErr) {
            const shown = $('#shelf').classList.contains('show');
            const t = shown ? $('#shelfToast') : $('#msToast');
            if (!shown) { if (isErr) alert(msg); return; }
            t.textContent = msg;
            t.className = 'ms-toast show' + (isErr ? ' err' : '');
            clearTimeout(this._tt);
            this._tt = setTimeout(() => t.classList.remove('show'), isErr ? 6000 : 3000);
        },

        // 第一次使用书架：把之前单本模式保存的小说放进书架
        async migrateLegacy() {
            const a = app();
            let done = false;
            try { done = !!localStorage.getItem('shelf_migrated'); } catch (e) { return; }
            if (done || !a) return;
            try {
                const raw = localStorage.getItem('novel_project_latest');
                if (raw) {
                    const data = JSON.parse(raw);
                    const p = data.project || data;
                    if (p && p.title) {
                        const fake = { project: Object.assign(freshProject(), p), state: Object.assign({}, data.state || {}) };
                        fake.project.chapters = fake.project.chapters || [];
                        fake.project.context = fake.project.context || {};
                        const existing = (await Store.listManuscripts()).find(m => m.id === p.manuscriptId);
                        if (!existing || !existing.projectState) {
                            const ms = await syncProject(fake.project, true);
                            ms.projectState = compactState(fake);
                            ms.targetChapters = fake.project.targetChapters;
                            await Store.saveMeta(ms);
                        }
                    }
                }
                localStorage.setItem('shelf_migrated', '1');
            } catch (e) {
                console.warn('迁移旧项目失败', e);
            }
        },

        async init() {
            document.querySelectorAll('#novelType option').forEach(o => { TYPE_NAMES[o.value] = o.textContent; });
            $('#shelfOpenBtn').addEventListener('click', () => this.open());
            $('#shelfClose').addEventListener('click', () => this.close());
            $('#shelfImport').addEventListener('click', () => {
                Workbench.importFile(async () => { await this.refresh(); });
            });
            $('#shelfGrid').addEventListener('click', e => {
                const card = e.target.closest('.shelf-card');
                if (!card) return;
                if (card.dataset.act === 'new') return this.newNovel();
                const btn = e.target.closest('button[data-act]');
                const id = card.dataset.id;
                const act = btn ? btn.dataset.act : 'open';
                if (act === 'continue') this.openNovel(id, true);
                else if (act === 'open') this.openNovel(id, false);
                else if (act === 'del') this.remove(id);
                else if (act === 'ms') { this.close(); Workbench.ms = this.novels.find(x => x.id === id) || null; Workbench.open(); }
            });

            await Store.init();
            await this.migrateLegacy();
            await this.refresh();
            const a = app();
            const fresh = a && !a.project.title && !a.state.isRunning;
            if (this.novels.length && fresh) {
                let last = null;
                try { last = localStorage.getItem('shelf_current'); } catch (e) { /* 忽略 */ }
                if (last && this.novels.find(x => x.id === last)) await this.openNovel(last, false);
                this.open();
            }
        }
    };

    // 供创作系统调用：每完成一步自动保存这部小说的进度和章节
    window.ManuscriptStore = {
        saveProgress,
        onProjectChapter(project) {
            saveProgress(app());
        }
    };
    window.NovelShelf = Shelf;
    window.ManuscriptWorkbench = Workbench;

    function boot() {
        Workbench.bind();
        Shelf.init().catch(e => console.error('书架初始化失败', e));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();

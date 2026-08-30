# Eric English OS
## 单用户英语加速系统：产品与实施总方案

**文档用途：** 作为 Codex 从空仓库完成产品开发、测试和 Cloudflare 部署的唯一产品规格来源。
**产品形态：** 仅供 Eric 一人使用的私有 Web App / PWA。
**目标平台：** Cloudflare Workers 全栈应用。
**默认时区：** `America/New_York`。
**默认英语：** American English。
**支持语言：** 学习输出以英语为主；必要解释可使用简体中文，并随进度逐步减少中文支架。

---

# 1. 执行结论

这不是一个“背完 1000 个单词”的应用，也不是一个泛化的 AI 聊天机器人。

它应当是一套持续运行的个人训练系统：

1. 找到 Eric 当前真正不会主动使用的词、词组和表达模式。
2. 用间隔重复安排记忆，但不把“看见认识”误判为掌握。
3. 强迫完成中文/场景到英文的主动回忆。
4. 将新表达用于房地产、商业谈判、团队管理和美国日常生活的语音与写作任务。
5. 从真实工作和生活互动中抓取新的错误、表达缺口和高价值句型。
6. 在后续 1、3、7、14、30 天重新出现，直到能够自然输出。
7. 每四周用固定锚点任务重新测量，而不是靠主观“感觉进步了”。

产品的核心闭环：

```text
诊断缺口
  -> 学习词块
  -> 主动回忆
  -> 受控输出
  -> 场景对话
  -> 真实使用
  -> 复盘纠错
  -> 自动进入后续复习
```

**第一原则：** 产品的成功指标不是课程完成率，而是 Eric 在真实交流中更快、更准确、更自然地说出来。

---

# 2. 用户画像与初始学习基线

## 2.1 当前水平假设

基于此前词汇测试和实际英语写作表现，系统初始配置采用以下工作假设：

- 通用英语：`B1+ / early B2`
- 熟悉的商业地产和商务场景：接近 `B2`
- 抽象 B2 词汇：存在明显缺口
- 被动词汇强于主动词汇
- 上下文猜词强于单词独立识别
- 能把事情说清楚，但容易依赖简单、高频、泛化词汇
- 需要提高：准确性、自然度、词块自动化、口语反应速度和长段表达能力

这不是正式 CEFR 认证。应用内应显示为 `Working Estimate`，不可伪装成官方考试结果。

## 2.2 强项

- 已能在美国处理大量现实工作和生活事务。
- 房地产、租赁、投资、谈判相关常用词相对较强。
- 能够通过语境判断不少 B2 词汇。
- 实用意识强，偏好能立即用于工作与生活的表达。
- 每天可投入至少 60 分钟，并拥有真实英语环境。

## 2.3 主要短板

- 主动词汇调取速度不足。
- 抽象动词、形容词和名词储备不足。
- 认识一个词不等于能在对话中自然使用。
- 容易用 `good / bad / big / very / important / problem / think` 代替更精确表达。
- 一些句子受中文语序或直译影响，意思正确但不够自然。
- 容易在电话和即时对话中采用较短、较直接的表达，缺少缓冲、礼貌和谈判层次。

## 2.4 已知高优先级词汇缺口

首批课程必须提高以下单位的优先级：

```text
concise
arbitrary
alleviate
detrimental
receptive
subtle
inevitable
allocate
skeptical
counterproductive
compelling
negligible
streamline
flawed
adamant
intertwined
bleak
mitigate
exponential
onerous
spacious
deter
marginal
scrutinize
jeopardize
unprecedented
contradict
```

## 2.5 已知相对熟悉的词

下列词不应作为最初新词反复教学，但仍可通过主动输出验证：

```text
pending
waive
convenient
efficient
reasonable
comply
flexible
renovation
significant
verify
favorable
verbal commitment
liquidity
volatile
accommodate
misleading
deficiency
withdraw
maximize
feasible
deteriorate
redundant
inherent
discrepancy
legitimate
unrealistic
robust
stringent
unforeseen
diversify
comprehensive
sustainable
```

## 2.6 个性化场景

课程和角色扮演应重点覆盖：

### 商业地产

- 联系 listing agent
- 确认房源是否仍可出租或出售
- 询问 asking rent、NNN、CAM、tax、utilities
- 说明租户用途、面积、层高、停车和 loading 要求
- 安排、取消和调整 showing
- 询问竞争业态、exclusive-use clause 和 permitted use
- 讨论租金弹性、价格、concession、LOI 和 lease terms
- 向客户比较房源并提出建议
- 处理房东、租户和 listing agent 的投诉或误解
- 解释投资回报、风险、NOI、cap rate 和市场判断

### 公司经营与领导

- 招募和管理经纪人
- 解释佣金方案、公司政策和团队分工
- 向合作方或投资人介绍产品和业务
- 讨论付款、合同、IP、责任、终止和非竞争条款
- 会议表达、任务分配、反馈和冲突处理

### 美国日常生活

- 学校、保险、DMV、银行、维修和医疗沟通
- 电话客服
- 邻里和家长社交
- small talk 和 networking
- 解释问题、提出异议、请求澄清和礼貌催办

应用不得在种子内容中存储真实客户姓名、电话、地址或其他个人信息。

---

# 3. 12 周产品目标

## 3.1 总体目标

在坚持每周至少 5 天、每天 60–90 分钟的前提下，使 Eric 从 `B1+ / early B2` 向“稳定 B2，熟悉工作场景达到 B2+”推进。

不能承诺一定达到某个官方等级。必须用可测量行为指标替代空泛承诺。

## 3.2 12 周产品目标值

以下为训练系统的目标，不是保证：

- 完成 60–72 小时有效训练。
- 学习或校准 800–1,000 个高价值词汇单位。
- 其中 450–650 个达到主动回忆阈值。
- 至少 250 个在语音或写作自由输出中成功使用。
- 累积 20 小时以上有记录的英语口语输出。
- 对 10–15 个高频错误模式建立自动检测和专项训练。
- 典型工作角色扮演可持续 8–10 分钟，不因找词频繁中断。
- 3–5 分钟专业主题陈述具有清晰结构、较少重复词和更自然的连接。
- 高频重复错误率相对基线降低 30% 以上。
- 工作短信/邮件从“意思正确”提升到“自然、明确、专业”。

## 3.3 不应使用的虚假指标

应用不得将下列数据包装成精确事实：

- “你的准确词汇量是 7,342。”
- “你已经正式达到 B2。”
- “你的发音为 87 分，因此接近母语。”

应用可以显示：

- 已校准学习单位数量
- 主动回忆稳定单位数量
- 近 30 天自由输出中成功调用的单位数量
- 工作估计等级及置信区间
- 锚点任务相对基线变化

---

# 4. 市场工具调研与产品取舍

## 4.1 Anki / FSRS

可借鉴：

- 基于遗忘概率安排复习。
- 将难度、稳定性和可回忆概率纳入调度。
- 让复习时间服务于长期记忆，而非固定日历。

不可照搬：

- 只做正反面卡片。
- 只训练“看到英文知道中文”。
- 让用户手动维护复杂牌组。
- 将所有词都按同一掌握标准处理。

本产品采用 `ts-fsrs` 管理核心复习状态，但在 FSRS 外增加主动输出和真实迁移维度。

## 4.2 Vocabulary.com

可借鉴：

- 对同一词建立比“会/不会”更细的掌握度。
- 根据过去答题自动选择下一题。
- 反复检测词义、语境和使用。

差异化：

- 本产品必须追踪 recognition、recall、production、transfer 四类能力。
- 重点不是规模化字典，而是 Eric 的个人缺口。

## 4.3 Speak

可借鉴：

- `Learn -> Practice -> Apply` 的闭环。
- 高频开口。
- AI 角色扮演。
- 根据历史错误生成后续练习。

差异化：

- 每次角色扮演必须与当周目标词和错误模式连接。
- 对话结束后必须立刻进入纠正、重说和隔日复习。
- 真实工作任务可在对话前准备、对话后复盘。

## 4.4 ELSA

可借鉴：

- 保存录音并提供可操作反馈。
- 区分发音、流利度、语法、词汇等维度。
- 允许同一句反复录制比较。

限制：

- 通用 STT 或 LLM 不能可靠替代专业音素级发音引擎。
- 第一版不得声称可以精确判断每个音素。
- 第一版聚焦转写准确度、停顿、语速、目标词使用、语法、自然度和表达结构。
- 后续可通过适配器接入 ELSA API 或其他专业 pronunciation API。

## 4.5 最终差异化

本产品的独特价值由四部分组成：

1. **个人语料库：** Eric 的真实短信、邮件、电话问题和口语转写。
2. **跨模态掌握：** 认识、回忆、写作、口语和真实使用分开追踪。
3. **现实事件闭环：** 事前准备、模拟、真实执行、事后复盘。
4. **错误台账：** 每次错误不会只被纠正一次，而会变成未来训练项目。

---

# 5. 教学与训练原则

## 5.1 以词块为主，不以孤立单词为主

一个 `learning unit` 可以是：

- 单词：`skeptical`
- 搭配：`skeptical about`
- 词组：`room for negotiation`
- 句型：`The asking rent appears difficult to justify.`
- 语用模式：`Would you be able to clarify whether ...?`
- 语法模式：冠词、时态、可数名词、介词搭配等

## 5.2 主动回忆优先

每个新单位必须逐步经历：

1. Recognition：看到英文理解核心意思。
2. Context：放进句子中理解。
3. Cued Recall：看到中文或场景，想出英文。
4. Controlled Production：补全、改写或重组句子。
5. Free Production：在写作或语音中主动使用。
6. Transfer：在真实生活或工作中使用并记录。

只完成前两步不可标记为“掌握”。

## 5.3 纠错不过载

一场 10 分钟对话结束后：

- 只突出最多 3 个最高价值问题。
- 其他问题保存到错误台账，但不同时讲解。
- 优先纠正：影响理解、反复出现、与当前目标高度相关的问题。
- 不应将每个口语小错误都标红，避免破坏流利度。

## 5.4 先完成流利输出，再集中反馈

提供两种模式：

### Fluency Mode

- 对话过程中不频繁打断。
- 结束后统一反馈。
- 适合真实模拟和连续表达。

### Drill Mode

- 每次说完立刻纠正。
- 要求重说。
- 适合新句型和自动化训练。

## 5.5 支架逐步撤除

默认中文支架比例：

- 第 1–2 周：可显示中文核心解释和中文提示。
- 第 3–6 周：中文只在首次学习和答错后出现。
- 第 7–12 周：默认全英语，用户点击后才显示中文。

系统必须允许用户临时切换，不得强制导致无法完成任务。

## 5.6 不把 AI 当调度算法

- AI 负责内容、语义评价和反馈建议。
- 复习时间、掌握状态和每日时间分配必须由确定性代码管理。
- AI 输出必须经过 JSON Schema / Zod 验证。
- AI 不得直接修改数据库学习状态；后端服务根据验证结果更新。

---

# 6. 每日 60 分钟训练结构

默认每天生成一个 `Today Plan`，而不是让用户在大量课程中自行选择。

## 6.1 默认结构

| 模块 | 时间 | 目标 |
|---|---:|---|
| Due Review | 12 分钟 | 完成到期记忆与主动回忆 |
| New Units | 10 分钟 | 学习 6–8 个新词块 |
| Automaticity Drill | 10 分钟 | 限时中文/场景到英文 |
| Speaking Scenario | 18 分钟 | 完成一场目标明确的语音角色扮演 |
| Real-World / Writing Lab | 8 分钟 | 准备或复盘真实交流 |
| Reflection | 2 分钟 | 自评、确定明日现实任务 |

总计：60 分钟。

## 6.2 可选时长

- 30 分钟：保留 due review、主动输出和短口语。
- 45 分钟：减少新词和场景轮数。
- 60 分钟：默认。
- 75 分钟：增加 listening/shadowing 或第二场景。
- 90 分钟：增加真实任务准备和长段表达。

## 6.3 新词数量自适应

```text
到期卡片 > 60：0–2 个新单位
到期卡片 31–60：4 个新单位
到期卡片 <= 30：6–8 个新单位
连续两天完成率 < 70%：次日新单位减半
连续七天完成率 > 90% 且正确率稳定：可增加 1–2 个
```

## 6.4 每周内容配比

- 60% 通用 B2 高频词块
- 25% 商务、房地产和领导场景
- 15% 美国日常生活、small talk 和社会沟通

不得让专业词汇掩盖通用英语缺口。

---

# 7. 12 周课程骨架

该骨架用于初始规划；每日内容仍由用户表现动态调整。

## Week 0：诊断与校准

- 初始词汇识别测试
- 主动回忆测试
- 两个写作任务
- 三个语音任务
- 建立已知词、缺口词和错误模式
- 生成第一版个人学习图谱

## Week 1：清晰、礼貌和自然表达

- concise communication
- clarification
- requests and follow-ups
- polite softening
- 纠正常见直译

## Week 2：B2 高频动词与形容词

- assess, allocate, mitigate, justify, retain
- viable, subtle, compelling, skeptical, arbitrary
- 用搭配替换简单词

## Week 3：电话和即时沟通

- 开场、确认身份和目的
- 让对方重复或澄清
- 确认信息
- 留言和催办
- 快速反应训练

## Week 4：房地产需求与安排

- 说明面积、用途、位置、预算和条件
- 安排 showing
- 询问 availability、terms 和 property details
- 总结客户 feedback

## Week 5：谈判与异议

- asking price / rent
- flexibility
- concession
- justify / counter / compromise
- 礼貌但坚定

## Week 6：投资与分析

- 比较方案
- 解释风险、收益和假设
- cap rate / NOI 等专业内容的清晰表达
- 给非专业客户讲复杂问题

## Week 7：说服与客户建议

- 表达推荐理由
- 处理犹豫和反对意见
- 控制语气，避免过度承诺
- 用证据支持判断

## Week 8：冲突和问题处理

- 投诉、误解、责任边界
- 承认问题但不过度承担
- 提出下一步行动
- 保持合作关系

## Week 9：领导、团队和公司沟通

- 任务分配
- 提供反馈
- 解释政策和佣金方案
- 招募、合作和绩效沟通

## Week 10：美国日常生活与社交

- 学校、保险、DMV、维修、医疗
- 家长社交和邻里沟通
- small talk 和 networking
- 讲故事和表达个人经历

## Week 11：即兴与长段表达

- 无脚本主题讨论
- 3–5 分钟陈述
- 追问和反驳
- 使用连接和结构表达复杂观点

## Week 12：综合评估和下一周期

- 重做锚点任务
- 对比原始录音和写作
- 分析主动词汇、错误率和流利度变化
- 自动生成下一阶段 12 周计划

---

# 8. 核心功能规格

## 8.1 Today Dashboard

首页只突出三个动作：

1. `Start Today's Session`
2. `Prepare for a Real Conversation`
3. `Quick Capture`

应显示：

- 今日预计时间
- 到期复习数量
- 今日 3 个 target phrases
- 今日现实任务
- 本周核心瓶颈
- 一键继续上次未完成模块

不得将大量统计信息放在首页干扰开始训练。

## 8.2 Baseline Assessment

初始测评应包含：

### Receptive Vocabulary

- 60 道自适应题
- 从 B1 到 C1 分层抽样
- 题型：词义、语境、近义辨析

### Active Recall

- 30 道中文/情境到英文
- 可接受多个自然答案
- 记录响应时间和是否使用提示

### Writing

1. 给 listing agent 写一条简短询问。
2. 写一段比较两个房源或方案的建议。

### Speaking

1. 60 秒自我介绍和工作说明。
2. 2 分钟解释客户需求。
3. 一次 5–7 轮角色扮演。

### Listening

- 使用 TTS 生成 2 个短音频
- 每个音频 3–5 个理解问题
- 记录是否需要重播和播放速度

输出：

- Working CEFR estimate
- receptive vs active gap
- vocabulary categories
- top recurring errors
- recommended 12-week focus

## 8.3 Vocabulary Learning

每个单位页面包含：

- target unit
- pronunciation / IPA（如数据可用）
- 核心英文解释
- 简明中文解释
- 2–4 个高频搭配
- 常见错误或混淆
- 3 个自然美国英语例句
- 1 个 Eric 工作/生活相关例句
- Listen
- Record yourself
- Add a personal sentence

不得显示十几个低频释义。

## 8.4 FSRS Review

题型：

- English -> meaning
- meaning/scenario -> English
- cloze
- paraphrase
- sentence transformation
- listen and recall
- short spoken answer

答题后评分：

- Again
- Hard
- Good
- Easy

系统可根据正确性、响应时间和提示使用情况建议评分，用户可以覆盖。

## 8.5 Automaticity Sprint

5–10 分钟限时训练：

- 每题 5–10 秒
- 中文提示、场景提示或简单英文提示
- 用户必须立即说或输入
- 不追求长解释，追求调取速度
- 同一目标词在不同场景中出现 3 次
- 答错后：显示自然答案 -> 用户重说 -> 变体再测

## 8.6 Speaking Coach

### 模式

- Fluency Roleplay
- Drill and Retry
- Monologue
- Objection Handling
- Phone Call Simulation
- Small Talk

### 每个场景数据

- title
- domain
- CEFR difficulty
- role played by AI
- user objective
- target units
- hidden complication
- max turns
- scoring rubric
- completion condition

### 对话流程

```text
创建场景
 -> 显示目标和 3–5 个建议表达
 -> 开始录音
 -> STT 转写
 -> AI 角色回答
 -> 可选 TTS 播放
 -> 保存每轮
 -> 结束后统一分析
 -> 选择 3 个最高价值纠正
 -> 要求重说
 -> 生成未来复习卡
```

### 反馈维度

- task completion
- clarity
- grammar
- lexical range
- naturalness
- pragmatics / politeness
- fluency
- target unit usage

### 客观指标

- total speaking seconds
- words per minute
- average turn length
- filler count
- pause proxy（基于音频/转写可用数据）
- target phrases attempted and successful
- repeated error count

不得根据普通 STT 声称音素级准确率。

## 8.7 Writing Lab

用户必须先写，再得到帮助。

反馈分三层：

1. `Correct`：只修语法和明显错误。
2. `Natural`：更像美国职场表达。
3. `Polished`：更专业、结构更清楚。

同时显示：

- 最重要的 1–3 个修改原因
- 可复用 phrase upgrades
- 与历史错误模式的关联
- 一键创建复习单位

提供计时任务：

- 30 秒短信
- 2 分钟 follow-up
- 5 分钟说明或比较

## 8.8 Event Prep Mode

用户输入：

> 明天我要给 listing agent 打电话，确认房源是否可分割，并询问税和 CAM。

系统生成：

- 5 个必用表达
- 推荐开场
- 3 个可能追问
- 2 个对方可能的异议或模糊回答
- 一次语音模拟
- 一页 phone cheat sheet

事件完成后，系统询问：

- 实际发生了什么？
- 哪句话没说出来？
- 对方用了什么你不熟悉的表达？
- 是否需要生成 follow-up message？

结果自动进入学习图谱。

## 8.9 Quick Capture

移动端两步完成：

- 语音录入
- 粘贴文字

可记录：

- 今天听到的新表达
- 今天没说出来的话
- 实际发出的短信或邮件
- 电话复盘
- 对方的原句

AI 提取：

- 高价值词块
- 自然改写
- 错误模式
- 是否值得进入复习

## 8.10 Error Ledger / My Patterns

错误分类：

- article
- tense
- subject-verb agreement
- countability
- preposition
- word order
- collocation
- vocabulary precision
- politeness / pragmatics
- redundancy
- Chinese transfer
- pronunciation / intelligibility note

每个模式显示：

- 出现次数
- 最近出现
- 影响等级
- 原始例句
- 改进例句
- 是否完成专项训练
- 近 30 天趋势

同一模式出现 3 次以上时，自动生成 5–10 分钟 micro-lesson。

## 8.11 Real-World Missions

每天只给一个现实任务，例如：

- 今天至少在真实沟通中使用一次 `clarify`。
- 与 listing agent 沟通时使用 `Is there any flexibility ...?`
- small talk 中主动追问一次并补充一句个人信息。

晚上记录：

- Used / Not Used
- 实际说了什么
- 对方反应
- 自评自然度

真实使用可增加 `transfer_score`，但不能直接等同于完全掌握。

## 8.12 Weekly Report

每周报告必须回答：

1. 本周真正学会了什么？
2. 哪些词仍只停留在 recognition？
3. 哪些错误反复出现？
4. 口语输出量和速度如何变化？
5. 下周应减少什么、增加什么？

报告内容：

- productive minutes
- speaking minutes
- review retention
- active recall accuracy
- mastered / learning / fragile units
- real-world transfer count
- top 5 overused words
- top 5 phrase upgrades
- top 3 recurring errors
- next week focus

## 8.13 Progress Dashboard

主要图表：

- active recall accuracy over time
- free-production success over time
- speaking minutes
- recurrent error rate
- unit status funnel
- category heatmap
- baseline vs current anchor tasks

不鼓励纯 streak 驱动。Streak 只作为次要信息。

## 8.14 Export / Backup

支持：

- JSON 全量导出
- CSV 词汇与复习历史导出
- Markdown 周报导出
- 原始语音 ZIP 清单或单独下载
- 删除全部语音
- 删除全部数据

---

# 9. 个性化学习单位与掌握模型

## 9.1 Learning Unit 数据

每个单位至少包含：

```ts
interface LearningUnit {
  id: string;
  unitType: 'word' | 'collocation' | 'phrase' | 'sentence_frame' | 'grammar_pattern';
  term: string;
  lemma?: string;
  partOfSpeech?: string;
  ipa?: string;
  cefr: 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'unknown';
  priority: number;
  register: 'neutral' | 'formal' | 'informal' | 'business' | 'spoken';
  domains: string[];
  definitionEn: string;
  definitionZh?: string;
  collocations: string[];
  examples: Example[];
  confusions: Confusion[];
  source: 'seed' | 'ai_generated' | 'user_capture' | 'assessment';
  contentVersion: number;
}
```

## 9.2 四维掌握度

每个用户单位维护：

- `recognition_score`：0–100
- `recall_score`：0–100
- `production_score`：0–100
- `transfer_score`：0–100

另维护：

- exposures
- correct reviews
- lapses
- successful free uses
- successful real-world uses
- average response time
- last seen
- status

状态：

```text
unseen
introduced
recognizable
recallable
productive
transferred
fragile
mastered
suspended
```

## 9.3 掌握规则建议

示例规则：

- `recognizable`：recognition >= 70
- `recallable`：recall >= 70，且最近两次主动回忆正确
- `productive`：production >= 60，且至少两次自由输出成功
- `transferred`：至少一次真实使用 + 后续一次成功回忆
- `mastered`：recognition >= 85、recall >= 80、production >= 70，且 30 天内无严重遗忘

最终阈值写入配置，不要散落在代码中。

## 9.4 优先级公式

每日候选单位优先级：

```text
priority_score =
  0.35 * due_urgency
+ 0.25 * active_gap
+ 0.15 * personal_relevance
+ 0.10 * error_recurrence
+ 0.10 * transfer_need
+ 0.05 * curriculum_balance
```

所有组成项归一化到 0–1。

---

# 10. FSRS 调度实现

使用当前维护的 `ts-fsrs` 包。

## 10.1 Card 类型

- recognition
- active_recall
- cloze
- listening_recall

口语自由输出不直接作为普通 FSRS 卡，而是通过对应单位更新 production，并在需要时创建 active-recall/cloze 卡。

## 10.2 评分映射

```text
Again:
- 错误
- 无法回答
- 使用完整提示后才回答

Hard:
- 最终正确，但明显犹豫
- 有重要形式错误
- 响应时间显著偏长

Good:
- 正确
- 轻微停顿或非关键错误

Easy:
- 快速、准确、自然
- 无提示
```

用户可覆盖自动建议。

## 10.3 Desired retention

- 默认：0.90
- 不应默认高于 0.92
- 当至少积累 1,000 条有效复习记录后，允许优化个人参数
- 参数优化属于后续增强，不得阻塞第一版

---

# 11. AI 功能与模型路由

## 11.1 核心原则

- 不在代码中硬编码单一模型厂商。
- 文本、评估、STT、TTS 和实时语音分别配置。
- 所有密钥只保存在 Cloudflare AI Gateway BYOK、Secrets Store 或 Worker Secrets。
- 浏览器永远看不到 provider API key。

## 11.2 模型角色

```text
daily_fast        日常对话、短反馈、内容分类
evaluator_strong  基线测评、周报、复杂写作/口语分析
content_generator 批量生成课程和场景
stt               语音转写
tts               英语语音输出
realtime_voice     可选的未来实时对话
embedding          可选的语义检索
```

## 11.3 Provider 接口

```ts
interface TextModelProvider {
  generateText(input: TextRequest): Promise<TextResult>;
  generateStructured<T>(input: StructuredRequest<T>): Promise<T>;
}

interface SpeechToTextProvider {
  transcribe(input: AudioInput): Promise<TranscriptResult>;
}

interface TextToSpeechProvider {
  synthesize(input: TtsInput): Promise<AudioResult>;
}
```

实现至少：

- Cloudflare AI Gateway OpenAI-compatible text adapter
- Direct OpenAI-compatible text adapter
- OpenAI-compatible transcription adapter
- Workers AI Whisper adapter
- OpenAI-compatible TTS adapter
- Browser SpeechSynthesis fallback（不保证声音一致）
- Mock provider for local development and CI

## 11.4 结构化输出

所有以下任务必须用 JSON Schema / Zod：

- lesson generation
- vocabulary extraction
- writing evaluation
- speaking evaluation
- assessment scoring
- error extraction
- weekly report data
- scenario generation

失败处理：

1. 首次解析失败，使用修复提示重试一次。
2. 仍失败则返回可理解错误，不写入不完整状态。
3. 记录 task type、model、latency、token/cost metadata，不记录密钥。

## 11.5 AI 不得做的事情

- 不得独立判定用户正式 CEFR 等级。
- 不得直接计算下次复习日期。
- 不得未经验证直接写入多张学习卡。
- 不得捏造某个表达是“唯一正确答案”。
- 不得在角色扮演中提供真实法律、医疗或金融结论。

---

# 12. Prompt 体系

所有 prompt 存在版本化文本文件中，不要散落在 route handler。

建议目录：

```text
src/ai/prompts/
  tutor-core.md
  lesson-generator.md
  scenario-roleplay.md
  scenario-evaluator.md
  writing-coach.md
  unit-extractor.md
  assessment-rater.md
  weekly-report.md
  pii-redactor.md
```

## 12.1 Tutor Core 行为

- 使用 American English。
- 用户目标是自然、准确、可执行的表达，不是考试炫技。
- 优先教授高频词块。
- 同时提供简单表达和升级表达。
- 解释简明。
- 一次最多突出 3 个问题。
- 明确区分：incorrect / unnatural / less precise / more formal。
- 不把风格选择误判为语法错误。

## 12.2 Speaking Evaluator 输出示例

```json
{
  "taskCompletion": 4,
  "clarity": 3,
  "grammar": 3,
  "lexicalRange": 2,
  "naturalness": 3,
  "pragmatics": 4,
  "fluency": 3,
  "summary": "...",
  "priorityCorrections": [
    {
      "original": "Can the price lower?",
      "improved": "Is there any flexibility on the asking price?",
      "reason": "Natural negotiation phrasing",
      "category": "collocation",
      "severity": "medium"
    }
  ],
  "successfulTargetUnits": ["room for negotiation"],
  "missedTargetUnits": ["justify"],
  "newCandidateUnits": []
}
```

---

# 13. Cloudflare 技术架构

## 13.1 总体架构

```text
Browser / Installed PWA
        |
        v
Cloudflare Access (single-user allowlist)
        |
        v
Cloudflare Worker
  - React/Vite static assets
  - Hono JSON API
  - deterministic learning engine
  - AI provider adapters
        |
        +--> D1: structured learning data
        +--> R2: audio recordings and exports
        +--> Workflows: durable async analysis/report jobs
        +--> AI Gateway: model routing, BYOK, usage controls
        +--> Cron/Scheduled handler: daily/weekly idempotent jobs
```

## 13.2 前端

- React
- TypeScript strict mode
- Vite
- official Cloudflare Vite plugin
- React Router
- Tailwind CSS
- accessible component primitives
- PWA manifest + service worker
- responsive/mobile-first
- no SSR requirement

## 13.3 后端

- Cloudflare Worker
- Hono router
- Zod validation
- D1 prepared statements or Drizzle ORM for D1
- migrations stored in `migrations/`
- structured logging
- same-origin API

## 13.4 存储

### D1

保存：

- profile
- units
- cards
- reviews
- sessions
- transcripts
- feedback
- errors
- plans
- reports
- model configuration metadata

### R2

保存：

- raw or compressed audio
- generated TTS cache（可选）
- data exports
- long-term D1 export（可选）

默认语音保留 30 天，可配置；文本和指标长期保留。

## 13.5 Workflows

至少实现两个 Workflow：

### SessionAnalysisWorkflow

```text
validate session
 -> transcribe missing audio
 -> evaluate full session
 -> extract errors and units
 -> update database atomically/idempotently
 -> generate retry drill
```

### WeeklyReportWorkflow

```text
collect 7-day metrics
 -> compute objective stats
 -> call strong evaluator for interpretation
 -> validate JSON
 -> store report
```

可选：CurriculumBootstrapWorkflow，用于后台生成剩余课程内容。

## 13.6 Scheduled jobs

Cloudflare Cron 使用 UTC。为避免 DST 问题：

- 每小时运行一次轻量 scheduled handler。
- 后端使用 `America/New_York` 判断本地时间。
- 使用 idempotency key 确保每日计划和每周报告只创建一次。
- 每天本地 04:00–05:00 预生成计划。
- 每周日生成报告。

若当日未预生成，用户打开 Today 页面时同步补建。

## 13.7 不采用的旧方案

- 不使用 deprecated Workers Sites。
- 不以 Cloudflare Pages 作为新项目主要架构。
- 不增加 Supabase、Firebase、Vercel、AWS 等外部基础设施。
- 不为单用户产品引入复杂多租户和 billing 系统。

---

# 14. 数据库模型

建议表结构如下。Codex 可在不改变含义的前提下调整字段名称。

## 14.1 用户与设置

### `users`

- id
- display_name
- timezone
- created_at
- updated_at

仅有一个固定用户 `primary`。

### `learner_profiles`

- user_id
- working_cefr
- target_cefr
- support_language
- daily_minutes
- weekly_days
- goals_json
- strengths_json
- weaknesses_json
- scaffolding_level
- created_at
- updated_at

### `app_settings`

- key
- value_json
- updated_at

## 14.2 课程内容

### `learning_units`

- id
- unit_type
- term
- normalized_term
- lemma
- part_of_speech
- ipa
- cefr
- priority
- register
- domains_json
- definition_en
- definition_zh
- collocations_json
- examples_json
- confusions_json
- source
- content_version
- active
- created_at
- updated_at

索引：normalized_term、cefr、priority、source。

### `user_unit_states`

- user_id
- unit_id
- status
- recognition_score
- recall_score
- production_score
- transfer_score
- exposures
- successful_free_uses
- successful_real_world_uses
- avg_response_ms
- last_seen_at
- last_success_at
- priority_override
- suspended
- updated_at

## 14.3 FSRS

### `review_cards`

- id
- user_id
- unit_id
- card_type
- state
- due_at
- stability
- difficulty
- elapsed_days
- scheduled_days
- reps
- lapses
- last_review_at
- fsrs_json
- created_at
- updated_at

### `review_events`

- id
- card_id
- unit_id
- reviewed_at
- rating
- suggested_rating
- correct
- response_text
- response_ms
- hint_level
- source_session_id
- previous_state_json
- next_state_json

## 14.4 每日计划

### `daily_plans`

- id
- user_id
- local_date
- target_minutes
- status
- focus_summary
- target_units_json
- mission_id
- generated_reason
- created_at
- completed_at

唯一索引：user_id + local_date。

### `daily_plan_items`

- id
- plan_id
- item_type
- sequence
- estimated_minutes
- status
- payload_json
- started_at
- completed_at
- result_json

## 14.5 练习与语音

### `practice_sessions`

- id
- user_id
- session_type
- scenario_id
- plan_item_id
- title
- status
- started_at
- completed_at
- duration_seconds
- objective_metrics_json
- evaluation_json

### `practice_turns`

- id
- session_id
- turn_index
- speaker
- text
- audio_object_key
- duration_ms
- created_at

### `scenarios`

- id
- title
- domain
- difficulty
- ai_role
- user_objective
- target_units_json
- hidden_complication
- max_turns
- rubric_json
- source
- active

## 14.6 写作与错误

### `writing_submissions`

- id
- user_id
- task_type
- prompt
- original_text
- corrected_text
- natural_text
- polished_text
- evaluation_json
- created_at

### `feedback_items`

- id
- user_id
- source_type
- source_id
- category
- severity
- original_text
- improved_text
- explanation
- status
- first_seen_at
- last_seen_at

### `error_patterns`

- id
- user_id
- category
- normalized_pattern
- description
- count_total
- count_30d
- impact_score
- examples_json
- trend_json
- last_seen_at
- micro_lesson_generated_at

## 14.7 现实任务与测评

### `real_world_captures`

- id
- user_id
- capture_type
- raw_text
- redacted_text
- context
- extracted_json
- created_at

### `missions`

- id
- user_id
- local_date
- mission_text
- target_units_json
- status
- actual_usage
- reflection
- completed_at

### `assessments`

- id
- user_id
- assessment_type
- version
- started_at
- completed_at
- objective_scores_json
- evaluator_scores_json
- working_cefr
- report_json

### `assessment_responses`

- id
- assessment_id
- item_id
- response_text
- audio_object_key
- correct
- response_ms
- evaluation_json

### `weekly_reports`

- id
- user_id
- week_start
- week_end
- metrics_json
- narrative_json
- next_week_plan_json
- created_at

## 14.8 AI 与运维

### `ai_usage_events`

- id
- task_type
- provider
- model
- latency_ms
- input_tokens
- output_tokens
- audio_seconds
- estimated_cost
- success
- error_code
- created_at

不得保存密钥。

### `job_runs`

- id
- job_type
- idempotency_key
- status
- started_at
- completed_at
- result_json
- error_message

---

# 15. API 规格

所有 `/api/*` 端点必须处于 Cloudflare Access 保护下，并进行请求验证。

## Profile / Setup

```text
GET    /api/me
GET    /api/settings
PUT    /api/settings
POST   /api/bootstrap
POST   /api/provider-health-check
```

## Assessment

```text
POST   /api/assessments
GET    /api/assessments/:id
POST   /api/assessments/:id/responses
POST   /api/assessments/:id/complete
```

## Today

```text
GET    /api/today
POST   /api/today/generate
POST   /api/today/items/:id/start
POST   /api/today/items/:id/complete
```

## Units / Review

```text
GET    /api/units
GET    /api/units/:id
POST   /api/units/:id/personal-example
GET    /api/reviews/due
POST   /api/reviews/:cardId/answer
POST   /api/reviews/:cardId/override-rating
```

## Speaking

```text
POST   /api/speaking/sessions
GET    /api/speaking/sessions/:id
POST   /api/speaking/sessions/:id/turns
POST   /api/speaking/sessions/:id/finish
GET    /api/speaking/sessions/:id/evaluation
POST   /api/speaking/sessions/:id/retry
```

`turns` 支持 multipart audio 或 text。

## Writing

```text
POST   /api/writing/evaluate
GET    /api/writing/:id
POST   /api/writing/:id/create-units
```

## Event Prep / Capture

```text
POST   /api/event-prep
GET    /api/event-prep/:id
POST   /api/event-prep/:id/after-action
POST   /api/captures
GET    /api/captures
```

## Progress / Reports

```text
GET    /api/progress/summary
GET    /api/progress/timeseries
GET    /api/patterns
GET    /api/reports/weekly
GET    /api/reports/weekly/:id
```

## Data

```text
POST   /api/export
GET    /api/export/:id
POST   /api/audio/delete-all
POST   /api/data/delete-all
```

---

# 16. 前端页面与体验

## 16.1 路由

```text
/
/today
/assessment
/review
/learn/:unitId
/drill
/speak
/speak/:sessionId
/write
/prepare
/capture
/patterns
/library
/progress
/reports/:id
/settings
```

## 16.2 设计要求

- 专业、简洁、低干扰。
- 不使用儿童化插画或过度游戏化。
- 手机可单手完成 Quick Capture 和 Review。
- 桌面适合长时间训练。
- 核心按钮明显，次要设置隐藏。
- 英文为主，中文帮助按需展开。
- 正确答案不使用仅靠颜色区分；满足基本无障碍。
- 支持键盘快捷键和自动聚焦。
- 录音状态、上传状态和分析状态必须清晰。

## 16.3 PWA

- installable manifest
- icons
- standalone display
- service worker
- 静态 shell 离线可打开
- Quick Capture 在离线时保存到 IndexedDB，联网后提示同步
- 不要求完整课程离线运行

---

# 17. 内容库与冷启动

## 17.1 初始内容

仓库必须包含：

- 240 个高质量核心学习单位，保证首次部署后立即可用。
- 其中包含本文件列出的已知缺口词。
- 至少 60 个通用 B2 动词/形容词。
- 至少 60 个商业/房地产词块。
- 至少 40 个谈判和礼貌表达。
- 至少 40 个美国日常生活表达。
- 至少 40 个连接、分析和观点表达。

## 17.2 背景扩展

首次 bootstrap 后，`CurriculumBootstrapWorkflow` 可分批生成并验证其余单位，目标总量 1,200–1,500。

内容分配：

- 600 通用 B2 核心
- 250 商业地产/投资
- 150 谈判/说服/冲突
- 150 美国日常生活和 small talk
- 100 领导、团队和 founder communication
- 100 句型、连接和语用模式

## 17.3 内容验证

批量生成后必须：

- normalized_term 去重
- 核心释义长度检查
- collocation 数量检查
- 例句长度和语言检查
- 禁止真实 PII
- 禁止明显不自然或错误搭配
- AI 第二次审校或规则校验
- 状态为 draft，验证通过后 active

## 17.4 场景种子

至少提供 50 个可用场景模板：

- 20 个房地产
- 10 个商业/管理
- 10 个美国日常生活
- 5 个 networking/small talk
- 5 个综合即兴

---

# 18. 隐私与安全

## 18.1 单用户认证

首选 Cloudflare Access：

- 仅允许 owner email 或 Cloudflare account member。
- 保护 production、preview 和 workers.dev URL。
- 不实现公开注册。
- 不实现应用内密码。

应用无需依赖 `ctx.access` 获取身份；数据库固定使用 `primary` 用户。Access 在边缘负责阻止其他人。

## 18.2 Secrets

- API key 只使用 AI Gateway BYOK / Secrets Store / Wrangler secret。
- `.dev.vars` 必须在 `.gitignore`。
- 提供 `.dev.vars.example`，只包含占位符。
- 日志中不得输出 Authorization、API key、Cookie 或 Access token。

## 18.3 AI 请求隐私

对于用户真实录音、短信、邮件和客户相关内容：

- `cf-aig-collect-log: false`
- `cf-aig-skip-cache: true`
- 使用 Unified Billing 且供应商支持时：`cf-aig-zdr: true`
- 应用自身仅保存必要的训练数据
- AI usage 表只保存元数据，不保存完整 prompt

## 18.4 PII Redaction

Real-World Capture 默认启用可见的 redaction preview：

- email
- phone number
- SSN-like pattern
- account/student/claim IDs
- 明确标记的人名（AI/规则辅助）

地址可配置是否遮蔽，因为房地产场景可能需要地址上下文。

## 18.5 数据保留

- 原始语音默认 30 天后删除。
- 转写、反馈和指标长期保留。
- 用户可立即删除全部语音。
- 所有删除操作需要二次确认。
- D1 Time Travel 作为短期恢复机制；可选每月导出到 R2。

## 18.6 CSRF / 请求安全

- same-origin API
- 检查 Origin/Host
- mutating requests 使用 CSRF token 或严格 SameSite Cookie 策略
- Content Security Policy
- security headers
- 输入大小限制
- 音频 MIME 和时长验证
- 服务端速率限制和每日 API 预算

---

# 19. 成本控制

## 19.1 Cloudflare

单用户场景预计基础设施用量很低。建议 Workers Paid 计划，以获得更宽松执行限制和稳定 Workflows 使用；D1 和 R2 通常应处于包含额度内。

## 19.2 模型路由

- daily_fast 使用低成本快速模型。
- evaluator_strong 仅用于基线、周报和复杂评估。
- 批量内容生成使用离线/异步低成本模型。
- STT 使用性价比高的专用模型。
- TTS 可优先使用浏览器声音或低成本模型。

## 19.3 Budget Guard

设置项：

- daily AI call limit
- daily audio minute soft limit
- monthly estimated cost alert
- strong model calls per day
- fallback model order

预算达到软阈值时：

- 不阻止普通复习。
- 降级到 fast model。
- 暂停批量内容生成。
- 显示成本提示。

---

# 20. 可观测性与错误处理

## 20.1 日志

- structured JSON logs
- request_id
- route
- task_type
- duration
- provider/model
- status
- error category

不得记录用户完整原文和密钥。

## 20.2 Cloudflare Observability

- Workers Logs enabled
- Traces enabled in staging/production with reasonable sampling
- AI Gateway request content logging默认关闭或按隐私规则关闭

## 20.3 错误体验

- 上传失败可重试，不丢失本地录音。
- AI 分析失败不应丢失原始转写。
- Workflow 必须幂等。
- 用户可重新触发分析。
- 所有异步任务显示状态：queued / processing / complete / failed。

---

# 21. 测试策略

## 21.1 Unit Tests

至少覆盖：

- FSRS rating mapping
- due-card selection
- daily plan allocation
- mastery state transitions
- priority formula
- scoring calculations
- redaction rules
- Zod schemas
- AI repair retry
- idempotency logic

## 21.2 Integration Tests

- local D1 migrations
- review answer persists and schedules next due
- speaking session with mock STT/LLM/TTS
- writing evaluation and error extraction
- daily plan creation
- weekly report workflow
- export generation

## 21.3 E2E Tests

使用 Playwright，至少覆盖：

1. 首次 bootstrap。
2. 完成一组 review。
3. 完成一个文本形式 speaking mock session。
4. 提交 writing task 并查看三层改写。
5. Quick Capture 创建学习单位。
6. 查看 progress。
7. 导出数据。

CI 中不调用真实付费模型。

## 21.4 Quality Gates

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

所有命令成功后才允许部署。

---

# 22. 仓库结构建议

```text
/
  src/
    client/
      app/
      components/
      routes/
      hooks/
      lib/
    worker/
      index.ts
      routes/
      services/
      repositories/
      workflows/
      scheduled/
      middleware/
    ai/
      providers/
      prompts/
      schemas/
    learning/
      fsrs/
      planner/
      mastery/
      scoring/
    shared/
      types/
      schemas/
      constants/
  migrations/
  seed/
    personal-baseline.json
    core-units.jsonl
    scenarios.jsonl
  scripts/
    bootstrap-cloudflare.mjs
    seed-local.mjs
    seed-remote.mjs
    export-data.mjs
  tests/
    unit/
    integration/
    e2e/
    fixtures/
  public/
  docs/
    ARCHITECTURE.md
    AI_PROVIDERS.md
    CLOUDFLARE_SETUP.md
    PRIVACY.md
    OPERATIONS.md
  .github/workflows/
    ci.yml
    deploy.yml
  wrangler.jsonc
  package.json
  pnpm-lock.yaml
  README.md
  .dev.vars.example
  .gitignore
```

---

# 23. 开发与部署流程

## 23.1 本地开发

- `pnpm install`
- `pnpm db:migrate:local`
- `pnpm db:seed:local`
- `pnpm dev`
- 默认使用 Mock AI provider
- 可通过 `.dev.vars` 启用真实 provider

## 23.2 Cloudflare 资源

需创建：

- Worker
- D1 database
- R2 bucket
- AI Gateway
- Workflows bindings
- Cron trigger
- Cloudflare Access application/policy
- 可选 custom domain

## 23.3 CI/CD

PR：

- install
- lint
- typecheck
- unit/integration test
- build
- e2e with mock provider

Main：

- apply remote D1 migrations
- deploy Worker
- run smoke tests
- report deployed URL

GitHub Secrets：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Provider keys优先放 AI Gateway BYOK，不放 GitHub。

## 23.4 首次上线向导

1. 检查 D1/R2 bindings。
2. 检查 Access 是否只允许 owner。
3. 检查 AI provider health。
4. 导入 personal baseline。
5. 导入 240 个种子单位和 50 个场景。
6. 运行初始测评。
7. 生成 Day 1 plan。

---

# 24. 明确排除项

第一版不做：

- 多用户、团队、学校或 SaaS billing
- 社交排行榜
- 真人教师市场
- 完整视频课程
- 准确的音素级发音评分
- 自动读取私人邮箱或电话录音
- 公开社区内容
- 复杂的 native mobile app
- 依赖外部数据库或后端平台
- 以聊天窗口替代完整学习系统

可作为后续增强：

- WebRTC 全双工实时语音
- ELSA 等专业发音 API
- 浏览器扩展
- iOS/Android 原生壳
- 自动导入会议转写
- Vectorize 语义检索
- 自定义听力材料导入

---

# 25. Definition of Done

Codex 只有在以下全部完成后才能宣告任务完成：

## 产品

- [ ] 私有单用户访问生效
- [ ] 初始测评完整可用
- [ ] Today Plan 可生成并保存
- [ ] FSRS review 正常调度
- [ ] 新词学习和主动回忆可用
- [ ] Speaking session 可录音、转写、对话和评估
- [ ] Writing Lab 输出三层版本
- [ ] Event Prep 和 After Action Review 可用
- [ ] Quick Capture 可提取学习单位
- [ ] Error Ledger 可积累并生成 micro-lesson
- [ ] Weekly Report 可生成
- [ ] Progress Dashboard 可展示真实指标
- [ ] Export / delete 功能可用
- [ ] 移动端和桌面端体验正常
- [ ] PWA 可安装

## 技术

- [ ] D1 migrations 完整
- [ ] R2 生命周期/删除逻辑完整
- [ ] AI provider abstraction 完整
- [ ] Mock provider 可用于 CI
- [ ] Secrets 不进入仓库
- [ ] 请求和 AI 输出经过验证
- [ ] Workflows 幂等且可重试
- [ ] Logs 和 error handling 完整
- [ ] 测试全部通过
- [ ] GitHub Actions CI/CD 完成
- [ ] README 和运维文档完整

## 部署

- [ ] Cloudflare 资源已创建
- [ ] 生产迁移已执行
- [ ] Worker 已部署
- [ ] Access allowlist 已配置
- [ ] AI Gateway/BYOK 已配置或明确使用 Worker Secrets
- [ ] 生产 smoke test 通过
- [ ] 返回可访问的 production URL
- [ ] 不存在 placeholder、TODO、伪数据依赖或未完成页面

---

# 26. 最重要的产品判断

如果必须在“更炫的 AI 对话”和“更可靠的学习闭环”之间选择，优先学习闭环。

如果必须在“更多新词”和“更多主动输出”之间选择，优先主动输出。

如果必须在“纠正所有错误”和“纠正最重要的错误”之间选择，优先最重要的错误。

如果必须在“抽象课程”和“明天真实要发生的英语交流”之间选择，优先真实交流。

最终产品应让 Eric 每天明确知道：

> 今天我该练什么、为什么练、在哪里会用、我是否真的能说出来，以及明天系统会怎样继续追踪它。

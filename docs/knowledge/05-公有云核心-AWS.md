# 05 · 公有云核心（L5）—— AWS 为主战场

> 世界赛自 2019 起由 AWS 提供比赛平台；韩国赛 = AWS 全家桶深度考；中国"公有云"赛卷考华为云/阿里云。
> **本章以 AWS 为主线，其他云用对照表迁移。** 目标不是"考过 SAA"，而是"能在 4 小时内按需架构出生产级系统"。

---

## 能力清单

- [ ] 默画 AWS 核心服务关系图；讲清每个服务解决什么问题
- [ ] 只用 CLI/Terraform 从零搭出多可用区、公私子网分明的 VPC
- [ ] 计算/存储/数据库/网络/安全/监控六大类核心服务全部实操过
- [ ] 能读题→换算成架构→估算成本→部署→自测（韩国赛完整闭环）
- [ ] 理解 Well-Architected 六支柱并用于答题（韩国题面明确要求以此为默认值）

## 知识地图（AWS 主线）

### 1. 身份与权限（最先学，贯穿一切）
- IAM：用户/组/角色/策略（JSON）；**AssumeRole 与临时凭证 STS**
- 策略评估逻辑（显式 Deny 优先）、权限边界、SCP（Organizations）
- **EC2 Instance Profile、IRSA（EKS 用 IAM 角色）** —— 现代实践核心
- MFA、Access Analyzer、CloudTrail 审计（**WSOS 考纲：审计策略**）

### 2. 网络（VPC 是架构的地基）
- VPC/子网/路由表/IGW/NAT GW/Egress-only IGW
- 安全组（有状态）vs NACL（无状态）；层级：SG 引用 SG
- VPC Peering / Transit Gateway / PrivateLink（**葡萄牙 2024 考跨区 Peering 且"禁默认路由"**）
- 终端节点（Gateway/Interface）、DNS（Route53 公有/私有区、健康检查、故障转移）
- **Network Firewall**（韩国 2025/2026 题面出现：集中式出入口防火墙 + 路由编排）
- CloudFront（CDN、OAC、Function@Edge 改写路径 —— 韩国 2026 第1任务考 CloudFront Function）
- ELB 三兄弟：ALB（L7）/ NLB（L4）/ GWLB；与 ASG 集成

### 3. 计算
- EC2：规格族选择、AMI、**User Data/cloud-init（比赛高频）**、Placement、Spot/RI/Savings Plans（成本题）
- **Auto Scaling**：Launch Template、混合实例策略、**Step/目标追踪伸缩**（葡萄牙题考 step scaling 阈值）
- 无服务器：Lambda（触发源/并发/层）、Fargate、EventBridge、Step Functions
- 容器：ECS/EKS/ECR（06 章展开）
- 弹性负载均衡健康检查调优（韩国赛 SLO 题关键）

### 4. 存储
- S3：桶策略、版本、生命周期、**事件通知（→Lambda/SQS/SNS）**、静态网站、跨区复制
- EBS：gp3/io2、快照、多挂载；Instance Store
- EFS/FSx：共享文件系统（**葡萄牙题：ASG 节点挂 EFS 只读共享 webroot**）
- Storage Gateway、备份（AWS Backup）

### 5. 数据库
- RDS/Aurora：MySQL/PostgreSQL 引擎、Multi-AZ、只读副本、参数组、快照、**性能洞察**
- **DynamoDB**（韩国赛 2025/2026 深度考）：表设计、PK/SK、GSI/LSI、按需/预置容量、Streams、TTL
- ElastiCache（Redis/Memcached）：缓存策略
- Redshift/Athena/Glue（韩国 2026 prepare 材料有 Analytics 章节）
- MSK（Kafka 托管，韩国 2026 第2任务用）、Kinesis

### 6. 安全与合规
- KMS：密钥策略、**每服务独立密钥（韩国题面要求 KMS 5 把钥匙）**
- Secrets Manager / Parameter Store（+External Secrets 注入 K8s）
- WAF：托管规则组（**韩国 2025 第3任务：无 User-Agent 请求 → 403**；SQL 注入 → 403）
- Shield/DDoS、GuardDuty、Security Hub、Inspector（镜像扫描：**韩国考 ECR 扫描无 Critical/High**）
- ACM 证书

### 7. 监控与成本
- CloudWatch：指标/日志/告警/仪表盘、**Container Insights**、Logs Insights 查询
- CloudTrail/X-Ray
- **Cost Explorer、Budgets；成本优化题（韩国 40 分卷子有 12 分是成本！）**：right-sizing、Spot、S3 分层、空闲资源清理

### 8. 其他云对照表（快速迁移）

| 能力 | AWS | Azure | GCP | 华为云 | 阿里云 |
|------|-----|-------|-----|--------|--------|
| 虚机 | EC2 | VM | Compute Engine | ECS | ECS |
| 对象存储 | S3 | Blob | GCS | OBS | OSS |
| 负载均衡 | ELB | LB/AppGW | Cloud LB | ELB | SLB |
| K8s | EKS | AKS | GKE | CCE | ACK |
| 关系库 | RDS | SQL DB | Cloud SQL | RDS | RDS |
| NoSQL | DynamoDB | Cosmos DB | Firestore | DDS | Tablestore |
| CDN | CloudFront | Front Door | Cloud CDN | CDN | CDN |
| IAM | IAM | Entra ID | Cloud IAM | IAM | RAM |
| 监控 | CloudWatch | Monitor | Cloud Ops | AOM | ARMS |

> 中国赛"公有云"卷面：华为云（ECS/EVS/OBS/ELB/VPC/IMS）或阿里云，操作逻辑同构，赛前一周过一遍控制台即可迁移。

## 对应真题（练法）

| 真题 | 练什么 |
|------|--------|
| 韩国 2025 全锦赛 제1/2/3 과제 + 评分标准 | **最完整的闭环训练**：架构→部署→SLO→自评 |
| 韩国 2026 task1/2/3 + 出题源码 | 进阶：GitOps/监控/压测评分器，全链路复刻 |
| 葡萄牙 2024 全国冠军工程 | 多 VPC/多区域、NLB/ASG/EFS/RDS/Route53 综合 |
| 各国 day1 题解 ×3（경기/경북/광주） | Terraform 实现 EKS+KMS+S3+ECR+DynamoDB+Lambda+CloudFront |
| 国内赛"公有云"赛卷 | 华为云/阿里云操作映射练习 |

**标准训练流程**：拿韩国题面（txt 已在 `test-projects/korea-2025-题面文本/`）→ 按 `<비번호>` 生成自己的变量 → 限时 4h 裸做 → 对照 `2025_mark.md` 的 40 分表逐项自测 → 对比题解仓库找差距。

## 超前部分（大赛之外）

- **多账号架构**：Control Tower/Organizations、集中日志/安全账号（企业真实形态）
- **FinOps 体系化**：成本分配标签策略、异常检测、单位经济（cost per request）
- **GitOps 全自动**：本包韩国 2026 task1 已是这个形态（Terraform + ArgoCD + Helm 到 S3 的私有 Helm repo）
- **AI/ML 服务**：SageMaker、Bedrock（WSOS 2026 已把 AI 服务写进职业描述！"利用现有 ML/AI 服务"）
- **混合云**：Outposts、Direct Connect、EKS Anywhere
- **架构即代码校验**：cfn-guard / Checkov / tfsec 策略即代码
- **Serverless 进阶**：Lambda SnapStart、响应流、幂等设计

## 检验标准

1. 3 小时内用 Terraform 从零交付：VPC（多 AZ 公私子网）+ ALB + ASG（step scaling）+ RDS MultiAZ + S3 + CloudWatch 仪表盘，全绿通过
2. CloudFront 故障注入练习（改坏 Origin/缓存策略）10 分钟内定位恢复
3. 给一份韩国题面，能在 30 分钟内列出"资源清单 + 变量表 + 评分对照表"三件套
4. 讲清"一个请求从 CloudFront 进来 → WAF → ALB → EC2 → RDS → 返回"的每一跳（韩国题面里全是这种端到端考点）

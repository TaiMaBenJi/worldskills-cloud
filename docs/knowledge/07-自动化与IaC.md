# 07 · 自动化与 IaC（L7）—— Ansible / Terraform / CI-CD

> 世界赛 Module A 有 Ansible 评分点（A15）；韩国赛第2任务整题是自动化与 CI/CD；现代云赛题里"手点控制台"已死，**一切皆代码**。

---

## 能力清单

- [ ] Ansible：inventory/playbook/roles/vault 全流程，能用一套 playbook 配置 10 台异构服务器
- [ ] Terraform：多模块工程、state 管理、变量体系、provider 认证、与 CI 集成
- [ ] 至少一个 CI/CD 系统（GitHub Actions/GitLab CI）打通"代码→构建→测试→部署"
- [ ] 会写 Makefile 把复杂操作封装成 `make up/mark/down`（韩国赛选手标准做法）
- [ ] 理解不可变基础设施与"从零重建"思维

## 知识地图

### 1. Ansible（配置管理）
- 无代理架构；inventory（INI/YAML，含动态 inventory）
- Playbook：play/task/handler、变量优先级、facts、条件（when）、循环、tags
- 模块精讲：`apt/yum/dnf`、`copy/template`、`user/group`、`service/systemd`、`file`、`lineinfile`、`command/shell`（慎用）、`debug`
- Roles 结构化复用；Galaxy 生态；**Vault 加密机密**
- 实战场景（=Module A A15）：批量配置 web 集群、统一证书下发、nginx 配置管理
- 对照工具：Puppet/Chef/SaltStack 概念

### 2. Terraform（基础设施即代码）
- HCL 语法：资源/数据源/变量/输出/locals、表达式与函数
- Provider 与认证（AWS profile/环境变量）；版本锁定 `.terraform.lock.hcl`
- **State**：本地 vs 远端（S3+DynamoDB 锁）、import、moved block、state 拆分
- 模块化：写 module、版本约束；常用公共模块（VPC/EKS）
- 工作流：`fmt/validate/plan/apply/destroy`；**workspace/多环境策略**
- 生命周期：`create_before_destroy`、`prevent_destroy`（韩国 2026：DynamoDB 防误删 + make down 自动解锁）
- 漂移检测、`terraform graph`
- 竞品对照：CloudFormation（加拿大安大略题用）、Pulumi、CDK、OpenTofu

### 3. CI/CD
- GitHub Actions：workflow 语法、secrets、矩阵构建、OIDC 联邦到 AWS（免长期密钥）
- GitLab CI：`.gitlab-ci.yml`、runner、stage
- Jenkins 基础（老牌环境）
- 流水线设计：lint→test→build→scan→push→deploy→smoke test
- **CodePipeline/CodeBuild/CodeDeploy**（AWS 原生，韩国 2021 国家队训练用）
- 部署策略：滚动/蓝绿/金丝雀（Argo Rollouts）
- **镜像构建流水线**：Docker build → 推 ECR → Trivy/Scanner 扫描 → 通过才部署（韩国赛判断标准：Critical/High 必须为 0）

### 4. 配置即代码周边
- Makefile：目标/依赖/伪目标，把 40 步操作压成 4 条命令
- pre-commit、shellcheck、tflint（质量保障）
- 动态配置：cloud-init/user_data（EC2 引导）、Packer 镜像烘焙
- **GitOps 与 CI 的分工**：CI 管构建，GitOps 管部署（防止"ci 里直接 kubectl apply"）

## 对应真题

| 真题 | 用法 |
|------|------|
| 里昂 Module A：A15 ansible ping + 部署验证 | 最小 Ansible 验收 |
| 韩国 2025 제2과제（S3 事件+Lambda+DynamoDB 自动化） | 事件驱动自动化 |
| 韩国 2025 서울 CI/CD 模块（gac-app/gac-gitops） | 完整 CI+GitOps 示例 |
| 韩国 2026 task1/2/3 的 Makefile 体系 | **工程师级工程化模板**（make up/images/k8s/mark） |
| 加拿大安大略题（CloudFormation+Terraform） | CFN/裸 Terraform 对照 |
| Module B marking scripts（PowerShell 自动化建 AD 对象） | Windows 侧自动化 |

**练法**：以韩国 2026 task2（自动化任务，含 S3→Lambda→DynamoDB→MSK 流水线）为毕业设计，完整实现并把 `make mark` 跑绿。

## 超前部分

- **Terratest/Kitchen**：给 IaC 写自动化测试（真正的工程化分水岭）
- **Crossplane**：用 K8s CRD 管理云资源（比 Terraform 更进一步）
- **Atlantis/环境 PR 化**：Terraform PR 自动 plan/apply
- **策略即代码**：OPA/Conftest、tfsec/Checkov/cfn-guard 进流水线
- **Ansible 事件驱动（EDA）**：webhook 触发自动化（Ansible Rulebook）
- **平台化**：把上述全封装成 Internal Developer Platform（见 10 章）

## 检验标准

1. 一个 Ansible playbook：新装 3 台 Nginx 节点 + 统一 vhost + 证书 + 健康检查，重复执行幂等（第二次 0 changed）
2. 一套 Terraform 工程：模块化（网络/计算/数据分离）+ 远端 state + destroy 后完全清理
3. 配一条 GitHub Actions：push → build 镜像 → 扫描 → 推 ECR → ArgoCD 自动部署，全绿
4. 解释题：为什么比赛评分更信任"脚本输出"而不是"你说你配了"（评分哲学）

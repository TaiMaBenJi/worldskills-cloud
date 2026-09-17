# 第 11 章 · Kubernetes 入门（指挥容器军团）

> 上章你学会了造"集装箱"。但当你有 100 个集装箱要管理：坏了要自动重拉、流量大了要加机器、发布了新版本要平滑升级……**手工干不动**。
> Kubernetes（K8s）= 集装箱的"自动驾驶系统"。它是现代云计算的核心，韩国赛全流程、国赛容器云、云厂商的托管服务全围绕它。
> 预计学习时间：3-4 周（本章只是入门，K8s 值得单独学一个月）。

---

## 11.1 为什么需要 K8s？先看 Docker 的三个难题

1. **一台机器容不下**：应用火了，一台服务器跑 50 个容器到极限了，怎么分布到 10 台机器并统一调度？
2. **容器会死**：某个容器崩了，谁来自动重启它？机器整个宕了呢？
3. **更新与流量**：发新版本要不停机滚动升级；流量涨了要自动加容器——手工做不到。

**K8s 的答案**：整个机房几十台机器组成一个"大电脑"，你只描述"我要 3 个副本的网站"，剩下的它全自动。

> 一句话对比：**Docker 管一个容器；K8s 管几千个容器 + 几百台机器。**

---

## 11.2 架构一页通（看懂这张表，你已经比 80% 的人懂了）

```
┌─────────────────────────────────────────┐
│            控制平面 (Control Plane)       │  ← "大脑"（一台或三台机器）
│  API Server（总入口，kubectl 对话的对象） │
│  etcd（记所有状态的数据库）               │
│  Scheduler（决定容器去哪个节点）          │
│  Controller Manager（维持"期望状态"）     │
└──────────────────┬──────────────────────┘
                   │ 指挥
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ 节点1    │  │ 节点2    │  │ 节点3    │   ← "四肢"（干活的工人们）
│ kubelet │  │ kubelet │  │ kubelet │   （每台机器上的监工）
│ 容器们   │  │ 容器们   │  │ 容器们   │
└─────────┘  └─────────┘  └─────────┘
```

**核心心法：声明式（Declarative）**
你不再说"运行这个容器"（命令式），而是说"**我要 3 个 nginx 副本一直存在**"（声明式）。K8s 会不断检查现状和你的要求，少了就补、死了就重拉。**这叫"期望状态"与"实际状态"的对账。**

---

## 11.3 搭一个本地 K8s 环境

### 11.3.1 方案选择
| 方案 | 适合 | 命令 |
|------|------|------|
| **minikube** | 本地学习（推荐★） | 一条命令起一个单机 K8s |
| kind | K8s in Docker（快） | `kind create cluster` |
| k3s | 轻量（半台机器即可） | 安装脚本一行 |
| 云托管（EKS/ACK/CCE） | 实战/比赛 | 控制台点点点（第 12 章） |

### 11.3.2 装 minikube（动手）
```bash
# 先确保有 Docker（第 10 章装过）
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# 装 kubectl（K8s 的命令行客户端）★
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install kubectl /usr/local/bin/kubectl

# 启动集群（--driver=docker 表示用 docker 假装一台机器）
minikube start --driver=docker --cpus=2 --memory=3g
```
启动成功后会显示 "Done! kubectl is now configured"。
```bash
kubectl get nodes        # 看到 minikube 节点 Ready = 集群活了！
kubectl get pods -A      # 看到一堆系统 Pod 在跑
```
> 提示：国内网络拉镜像慢的话，`minikube start --image-mirror-country=cn` 用国内镜像源。

### 11.3.3 先逛一圈：了解集群里有什么
```bash
kubectl get nodes                    # 节点
kubectl get ns                       # 命名空间（ns = "逻辑分区"，默认 default）
kubectl get pods -n kube-system      # 系统组件都在跑什么
kubectl cluster-info                 # 集群信息
```

---

## 11.4 核心对象实战（一个个亲手创建）

> kubectl 命令的两种姿势：**命令式**（快）和**声明式 yaml 文件**（生产标准）。
> 学习时两种都用，**工作/比赛以 yaml 为主**。

### 11.4.1 Pod —— 最小的调度单位
Pod = 一个或多个容器的"小包袱"（通常 1 个容器），是 K8s 里最小的管理单位。

```bash
# 命令式起一个 Pod
kubectl run mynginx --image=nginx --port=80
kubectl get pods                      # 看状态：Running
kubectl describe pod mynginx          # ★ 详情（排错第一命令）
kubectl logs mynginx                  # 看日志
# 想访问它（临时端口转发）：
kubectl port-forward mynginx 8080:80
# 另开终端：curl http://localhost:8080 → Welcome
```
**注意**：直接创建的 Pod **没人管它**，死了就死了。生产不用裸 Pod——往下看。

### 11.4.2 Deployment —— 管理 Pod 的"管家"（**工作主力**）
声明式 yaml（**从今天起，写 yaml 就是你的日常**）：
```bash
nano deploy.yaml
```
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web                  # Deployment 名字
spec:
  replicas: 3                # ★ 我要 3 个副本（K8s 会一直保证这个数）
  selector:
    matchLabels:
      app: web               # 管哪些 Pod（按标签找）
  template:                  # Pod 模板（按这个模板造 Pod）
    metadata:
      labels:
        app: web             # Pod 的标签（必须和上面 selector 对上）
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
```
```bash
kubectl apply -f deploy.yaml     # ★ 应用这个文件（"apply"你会打一千遍）
kubectl get pods                 # 看到 3 个 web-xxx 的 Pod
kubectl get deploy               # READY 3/3
```
**见证 K8s 的魔法——自愈**：
```bash
kubectl delete pod <随便一个web的Pod名>
kubectl get pods                 # 瞬间又补了一个新的！（Controller 在对账）
```
**见证扩容**：
```bash
kubectl scale deploy web --replicas=5     # 手动扩到 5 个
kubectl get pods                          # 5 个了
```
**见证滚动更新**：
```bash
kubectl set image deploy/web nginx=nginx:1.26
kubectl rollout status deploy/web         # 滚动升级过程（一个一个新旧替换，不停机）
kubectl rollout history deploy/web        # 版本历史
kubectl rollout undo deploy/web           # ★ 出问题一键回滚
```

### 11.4.3 Service —— 给 Pod 群一个固定入口
Pod 的 IP 会变（重建就换）。Service 给一组 Pod 一个**固定虚拟 IP + 域名**，并自动负载均衡。
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-svc
spec:
  selector:
    app: web              # 选中所有带 app=web 标签的 Pod
  ports:
  - port: 80              # Service 自己的端口
    targetPort: 80        # 转发到 Pod 的哪个端口
  type: ClusterIP         # 类型（见下表）
```
| type | 作用 | 场景 |
|------|------|------|
| ClusterIP | 集群内访问（默认） | 内部服务互访 |
| NodePort | 每个节点开个端口对外 | 学习/临时暴露 |
| LoadBalancer | 让云厂商给个负载均衡器 | 生产（云上） |
| ExternalName | 映射到外部域名 | 特殊场景 |

```bash
kubectl apply -f svc.yaml
kubectl get svc
# 集群内验证（起个临时容器当"访客"）：
kubectl run test --rm -it --image=busybox -- wget -qO- http://web-svc
# → 能拿到 nginx 首页 = Service 通了！（注意：用了"服务名"当域名）
```

### 11.4.4 Ingress —— 集群的"大门"（域名→服务）
Service 是内部的，外部用户需要 Ingress（七层入口，按域名/路径路由）。
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: web.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-svc
            port:
              number: 80
```
（minikube 用户：先 `minikube addons enable ingress`，然后 `minikube ip` 拿集群 IP，hosts 指向它。）

### 11.4.5 ConfigMap & Secret —— 配置与密码
**心法：镜像里不写配置，配置从外面灌。**（同一个镜像，测试/生产环境用不同配置）
```bash
# ConfigMap：普通配置
kubectl create configmap app-config --from-literal=MODE=prod --from-literal=LOG_LEVEL=info

# Secret：敏感信息（base64 存储，别当真加密）
kubectl create secret generic db-secret --from-literal=password='S3cret!'
```
在 Pod 里用（yaml 片段）：
```yaml
      containers:
      - name: app
        image: myapp
        envFrom:
        - configMapRef:
            name: app-config        # 全部键值变成环境变量
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
```
或者以"文件"形式挂进容器：
```yaml
        volumeMounts:
        - name: config-vol
          mountPath: /etc/app
      volumes:
      - name: config-vol
        configMap:
          name: app-config
```

### 11.4.6 存储：PV / PVC
```yaml
# PVC：我要一块 1Gi 的存储（像"申请单"）
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 1Gi
```
Pod 里挂载：
```yaml
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: data-pvc
      containers:
      - name: db
        image: mysql:8
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
```
**关系**：PVC（申请单）→ 自动找到/创建 PV（实际存储）→ 挂进容器。**这个"声明式申请"的思想贯穿 K8s 全部。**

### 11.4.7 健康检查（探针）——生产必备
```yaml
        livenessProbe:            # 活着吗？失败 → 重启容器
          httpGet: { path: /healthz, port: 80 }
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:           # 能接客吗？失败 → 从 Service 摘掉（不重启）
          httpGet: { path: /, port: 80 }
          initialDelaySeconds: 5
```
**liveness = 心脏监护（死了重启）；readiness = 能不能上班（没准备好先别派活）。** 两个都配，生产必须。

### 11.4.8 HPA —— 自动伸缩
```bash
kubectl autoscale deploy web --min=2 --max=10 --cpu-percent=70
```
→ 当 CPU 超过 70%，自动加 Pod（最多 10 个），闲了自动缩回。
（前提：装了 metrics-server：minikube 用 `minikube addons enable metrics-server`）

---

## 11.5 排错三件套（K8s 界的"望闻问切"）

```bash
kubectl get pods                      # ① 先看状态：Pending/ImagePullBackOff/CrashLoopBackOff...
kubectl describe pod <名字>           # ② 看事件（Events 区是宝藏：调度失败原因/拉镜像失败原因）
kubectl logs <名字> [--previous]      # ③ 看日志（--previous 看"上一次崩溃前"的日志）
```

**状态码翻译器**（背下来）：
| 状态 | 意思 | 常见原因 |
|------|------|----------|
| Pending | 还没调度上 | 资源不够 / 没有匹配节点 / PVC 没满足 |
| ImagePullBackOff | 拉不到镜像 | 镜像名错 / 私有仓库没配 Secret |
| CrashLoopBackOff | 反复崩溃重启 | 应用启动报错（看 logs！） |
| OOMKilled | 内存超限被杀 | limit 太小或内存泄漏 |
| Evicted | 被驱逐 | 节点资源不足 |
| Error / Completed | 退出 | 初始化任务完成（正常）或异常 |

**其他常用**：
```bash
kubectl get all                       # 看所有资源一把抓
kubectl top pods                      # 资源用量（需 metrics-server）
kubectl exec -it <pod> -- sh          # 进容器（排错）
kubectl get events --sort-by=.lastTimestamp | tail   # 看最近事件
kubectl -n 命名空间 get pods          # 指定命名空间
kubectl delete -f xxx.yaml            # 删除（按文件）
```

---

## 11.6 综合实战：把第 10 章的 Flask 应用搬上 K8s

```bash
# 1. 构建镜像并推送到能访问的仓库（或 minikube 直接用本地镜像）
docker build -t myapp:v1 ~/docker-lab/myapp
minikube image load myapp:v1          # minikube 专用：直接把本地镜像塞进去

# 2. 写全套 yaml（deploy.yaml + svc.yaml + ingress.yaml）
#    改动点：image: myapp:v1；加 liveness/readiness 探针

# 3. 部署
kubectl apply -f .

# 4. 验证
kubectl get pods,svc,ingress
curl http://web.local/                 # （配好 hosts 后）
# → 你好，我是容器里的 Flask 应用！（现在它是 K8s 管理的 3 副本了）

# 5. 极限测试：
kubectl scale deploy myapp --replicas=10      # 秒级 10 副本
kubectl delete pod <某副本>                    # 自愈
kubectl rollout undo deploy/myapp              # 回滚
```

---

## 11.7 练习与自检

### 练习
1. minikube 起集群，部署 3 副本 nginx，删 Pod 观察自愈
2. 用 NodePort 类型的 Service 暴露，用 `minikube service` 打开
3. 给 Deployment 加 ConfigMap 环境变量，进容器 `env` 验证
4. 创建 PVC 挂给 MySQL Pod，删 Pod 再建，验证数据持久
5. 故意把镜像名改错，观察 ImagePullBackOff 并用 describe 定位
6. 给应用配 livenessProbe，故意把 /healthz 写错，观察容器反复重启
7. （挑战）配 HPA，用 `kubectl run` 起一个压测容器制造 CPU 负载，观察自动扩容

### 自检清单
- [ ] 我能画出"控制平面 + 节点 + Pod"架构图并解释"声明式对账"
- [ ] 我理解 Pod/Deployment/Service/Ingress 四者的关系（Pod 生灭→Deployment 管→Service 固定入口→Ingress 对外）
- [ ] 我会写 Deployment/Service/ConfigMap/Secret/PVC 的 yaml
- [ ] 我用过 describe+logs 排查过至少 3 种故障状态
- [ ] 我做过滚动更新和回滚
- [ ] 我知道探针、HPA、命名空间是干什么的

### 对应真题
- 韩国赛 2025/2026 全套（EKS + Helm + ArgoCD + 监控）→ 本章是它的基础，第 13 章把它推向 GitOps
- 中国国赛"容器云"模块：K8s 安装与运维 —— 上述对象操作全覆盖
- 世界赛现代模块：容器编排能力（WSOS 官方标准明确提到 microservice orchestration）

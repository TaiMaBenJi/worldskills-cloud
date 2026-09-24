#!/bin/bash
# learn —— WorldSkills 零基础第一课：像教练一样带你敲命令
# 用法：在终端输入 learn 回车，跟着提示做即可
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[1;34m'; N='\033[0m'
STEP=0
TOTAL=10

say()  { echo -e "$1"; }
ok()   { echo -e "${G}✅ 对了！$1${N}"; echo; }
hint() { echo -e "${Y}💡 提示：$1${N}"; }
give() { echo -e "${R}再试一次。直接照着输入这个：${B} $1 ${N}"; }

# ask "提示语" "检查函数名" "提示1" "答案"
ask() {
  local prompt="$1" checker="$2" tip="$3" answer="$4" try=0
  while true; do
    read -r -p "$(echo -e "${B}[$((++STEP))/$TOTAL]${N} $prompt ")" input
    case "$input" in q|Q|quit|exit) say "已退出，下次输入 ${B}learn${N} 继续。"; exit 0;; esac
    if $checker "$input"; then return 0; fi
    try=$((try+1))
    [ $try -eq 1 ] && hint "$tip" || give "$answer"
  done
}
trim() { echo "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr -s ' '; }
is()   { [ "$(trim "$1")" = "$2" ]; }
has()  { local s; s=$(trim "$1"); shift; for k in "$@"; do case "$s" in *$k*) ;; *) return 1;; esac; done; }

clear
say "${B}╔══════════════════════════════════════════════╗${N}"
say "${B}║   🎓 WorldSkills 云计算 · 零基础第一课       ║${N}"
say "${B}║   规则：看提示 → 你敲命令 → 我检查 → 过关    ║${N}"
say "${B}║   随时输入 q 退出                            ║${N}"
say "${B}╚══════════════════════════════════════════════╝${N}"
echo
say "_linux 区分大小写，命令都是小写。现在开始——"

ask "第1步：输入 ${B}pwd${N} 然后回车（pwd = print working directory，打印当前所在位置）" \
  'is "$input" pwd' "就是三个字母 p-w-d，输完按回车" "pwd"
ok "你刚问了系统「我在哪」，它回答 ${B}$(pwd)${N}——这是你的主目录（home），你的地盘。"

ask "第2步：输入 ${B}whoami${N} 回车（who am i = 我是谁）" \
  'is "$input" whoami' "who-am-i，六个字母" "whoami"
ok "回答是 ${B}$(whoami)${N}——你的用户名。Linux 每个操作都有身份。"

ask "第3步：输入 ${B}ls${N} 回车（list = 列出这里有什么文件）" \
  'is "$input" ls' "就两个字母 l-s（小写L）" "ls"
ok "看到一堆名字了吗？那就是你家目录里的东西（蓝色的是文件夹）。"

ask "第4步：创建一个文件夹：输入 ${B}mkdir myfirst${N} 回车（make directory）" \
  'has "$input" mkdir myfirst' "mkdir 空格 myfirst，中间有空格" "mkdir myfirst"
ok "文件夹建好了。没任何输出 = 成功（Linux 的哲学：没消息就是好消息）。"

ask "第5步：进去看看：输入 ${B}cd myfirst${N} 回车（cd = change directory）" \
  'has "$input" cd myfirst' "cd 空格 myfirst" "cd myfirst"
ok "进来了！"

ask "第6步：再输入一次 ${B}pwd${N} 回车，看看现在的位置" \
  'is "$input" pwd' "和第1步一样，输入 pwd" "pwd"
ok "位置变成了 ${B}$(pwd)${N}——你刚才用 cd 走进来了。cd 和 pwd 是形影不离的一对。"

ask "第7步：造一个文件并写入内容：输入 ${B}echo 你好云计算 > note.txt${N} 回车" \
  'has "$input" echo note.txt ">"' "echo 后面是内容，> 表示把内容写进文件，最后是文件名" 'echo 你好云计算 > note.txt'
ok "一个文件诞生了，里面装着你的话。这就是「写文件」。"

ask "第8步：验证内容：输入 ${B}cat note.txt${N} 回车（cat = 读取并显示）" \
  'has "$input" cat note.txt' "cat 空格 note.txt" "cat note.txt"
ok "内容出来了。「写进去 → 读出来」，这就是程序世界的最基本循环。"

ask "第9步：回到上一层：输入 ${B}cd ..${N} 回车（.. 代表上一层）" \
  'is "$input" "cd .."' "cd 空格 点 点" "cd .."
ok "回来了（可以用 pwd 随时验证，多敲不会坏）。"

say "${Y}━━━ 第10步 · 毕业挑战（自己动手，不看前面的答案）━━━${N}"
say "任务：创建文件夹 ${B}challenge${N}，进去，创建文件 ${B}me.txt${N}，"
say "内容写上你的名字（随便什么名字），然后回到上一层。"
say "${Y}要用到的招式（刚才全学过）：mkdir、cd、echo ... >、cd ..${N}"
say "做好了直接按回车，我来检查（输入 q 退出）："
while true; do
  read -r -p "$(echo -e "${B}[10/$TOTAL]${N} 做好了按回车: ")" input
  case "$input" in q|Q) say "已退出。"; exit 0;; esac
  if [ -s "$HOME/challenge/me.txt" ]; then ok "检查通过：$HOME/challenge/me.txt 内容是「$(cat "$HOME/challenge/me.txt")」"; break; fi
  hint "没找到 $HOME/challenge/me.txt —— 一步一步来：先 mkdir challenge，再 cd challenge，再 echo 名字 > me.txt，再 cd .."
done

echo
say "${G}╔══════════════════════════════════════════════╗${N}"
say "${G}║   🎉 毕业了！你已掌握 Linux 六个核心动作：    ║${N}"
say "${G}║   pwd 看位置 · ls 看内容 · mkdir 建目录      ║${N}"
say "${G}║   cd 走路 · echo> 写文件 · cat 读文件        ║${N}"
say "${G}╚══════════════════════════════════════════════╝${N}"
say ""
say "📌 下一步（按顺序）："
say "   1. 输入 ${B}learn 2${N} —— 第二课：文件操作五件套（复制/移动/删除）"
say "   2. 或打开 Windows 的 ${B}study.html${N} 读教程第 1 章对应小节"

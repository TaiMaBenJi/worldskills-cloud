#!/bin/bash
# ============================================================
# 判读专项 · 答题卡评分脚本（8 题 × 5 分 = 40 分）
# 用法: sudo bash grad_cabling.sh
# ============================================================
if [ "$(id -u)" -ne 0 ]; then echo "请用 root 运行: sudo bash grad_cabling.sh"; exit 1; fi

DIR="$(cd "$(dirname "$0")" && pwd)"
CARD="$DIR/答题卡.md"
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
SCORE=0
KEY=(B A B C B B A A)

echo "=============================================="
echo " 判读专项评分  $(date '+%Y-%m-%d %H:%M')"
echo "=============================================="

if [ ! -f "$CARD" ]; then
  echo -e "${RED}找不到答题卡: $CARD${NC}"; exit 1
fi

for i in 1 2 3 4 5 6 7 8; do
  LINE=$(grep -m1 "第${i}题" "$CARD")
  ANS=$(echo "$LINE" | grep -oE "[A-D]" | head -1)
  WANT=${KEY[$((i-1))]}
  if [ "$ANS" = "$WANT" ]; then
    echo -e "${GREEN}[PASS]${NC} 第${i}题  你的答案: ${ANS} (+5分)"
    SCORE=$((SCORE+5))
  else
    echo -e "${RED}[FAIL]${NC} 第${i}题  你的答案: ${ANS:-未填} (0分)"
  fi
done

echo ""
echo "=============================================="
if [ "$SCORE" -eq 40 ]; then
  echo -e " 判读得分: ${GREEN}$SCORE / 40${NC}  ✅ 满分！判读能力已达标"
elif [ "$SCORE" -ge 35 ]; then
  echo -e " 判读得分: ${GREEN}$SCORE / 40${NC}  ✅ 通过，错题回《知识手册》§4/§6 对照速查表复盘"
else
  echo -e " 判读得分: ${RED}$SCORE / 40${NC}  ❌ 未通过，回《知识手册》§4/§6 重读故障速查表后再战"
fi
echo -e " ${YELLOW}提示：总分折算 = quiz得分×0.4 + 本成绩 + 计算自评 + 实操自评${NC}"
echo "=============================================="

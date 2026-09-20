#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B站「装机+计算机+编译原理」全网资源采集器
- 多关键词 x 多页，按播放排序抓热门
- 去重、清洗标题/描述中的高亮标签
- 输出 tools/bili_raw.json
用法: python3 bili_collect.py [每关键词页数，默认2]
"""
import json, time, re, random, sys
import requests

OUT = "/var/minis/shared/worldskills-cloud/tools/bili_raw.json"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

# 分组 -> 关键词列表
GROUPS = [
    ("装机", ["装机教程", "电脑装机教程", "DIY装机", "装机视频", "小白装机",
              "装机避坑", "台式机组装", "装机指南", "电脑配置推荐", "系统安装教程"]),
    ("计算机", ["计算机组成原理", "计算机基础入门", "计算机网络", "操作系统原理",
                "数据结构与算法", "Linux入门", "编程入门教程", "计算机科学速成",
                "计算机体系结构", "CSAPP"]),
    ("编译原理", ["编译原理", "编译原理教程", "编译器开发", "手写编译器",
                  "自制编程语言", "编译原理期末", "LLVM教程", "编译原理速成"]),
    ("进阶", ["汇编语言入门", "数字逻辑", "计算机考研408", "硬件入门",
              "电脑维修", "服务器装机"]),
]


def clean(t):
    return re.sub(r"<[^>]+>", "", t or "").replace("&quot;", '"').strip()


def main():
    pages = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Referer": "https://www.bilibili.com/",
        "Origin": "https://www.bilibili.com",
    })
    s.get("https://www.bilibili.com/", timeout=15)
    out, seen, n_req = [], set(), 0
    for group, kws in GROUPS:
        for kw in kws:
            got = 0
            for page in range(1, pages + 1):
                try:
                    r = s.get("https://api.bilibili.com/x/web-interface/search/type",
                              params={"search_type": "video", "keyword": kw,
                                      "page": page, "order": "click"}, timeout=15)
                    j = r.json()
                except Exception as e:
                    print("[WARN] %s p%d: %s" % (kw, page, e), flush=True)
                    time.sleep(2.5)
                    continue
                n_req += 1
                if j.get("code") != 0:
                    print("[WARN] %s p%d: code=%s" % (kw, page, j.get("code")), flush=True)
                    time.sleep(3)
                    continue
                for it in (j.get("data", {}).get("result") or []):
                    bv = it.get("bvid")
                    if not bv or bv in seen:
                        continue
                    seen.add(bv)
                    pic = str(it.get("pic", ""))
                    if pic.startswith("//"):
                        pic = "https:" + pic
                    play = it.get("play", 0)
                    if isinstance(play, str):
                        play = int(play) if play.isdigit() else 0
                    out.append({
                        "bvid": bv,
                        "title": clean(it.get("title", ""))[:100],
                        "author": clean(it.get("author", ""))[:40],
                        "play": play,
                        "danmaku": it.get("video_review", 0) or 0,
                        "dur": it.get("duration", ""),
                        "pub": it.get("pubdate", 0),
                        "pic": pic,
                        "desc": clean(it.get("description", ""))[:100],
                        "group": group, "kw": kw,
                        "like": it.get("like", 0) or 0,
                    })
                    got += 1
                time.sleep(random.uniform(1.2, 2.0))
            print("[OK] %s (%s): +%d, total=%d" % (kw, group, got, len(out)), flush=True)
    out.sort(key=lambda x: -x["play"])
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print("ALL DONE %d videos / %d requests -> %s" % (len(out), n_req, OUT), flush=True)


if __name__ == "__main__":
    main()

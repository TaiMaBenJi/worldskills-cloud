#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bili_raw.json -> app/resource-data.js（含平台/开源/工具箱精选）"""
import json, os

BASE = "/var/minis/shared/worldskills-cloud"
raw = json.load(open(BASE + "/tools/bili_raw.json", encoding="utf-8"))

CAP = {"装机": 220, "计算机": 220, "编译原理": 160, "进阶": 160}
MINPLAY = 800

# 内容过滤：只保留云计算 / 装机 / 计算机原理 / 编译原理相关（剔除编程语言培训课与娱乐整活）
BLACK_SUB = ['python', '黑马', 'java', 'c++', 'c#', '前端', 'html', 'css', 'vue', 'react',
             'node.js', 'nodejs', 'golang', 'go语言', 'rust', 'php', 'kotlin', 'swift',
             '小程序', 'django', 'flask', 'spring', 'mybatis', '安卓开发', 'ios开发',
             '游戏开发', 'unity', 'cocos', 'web开发',
             '旮旯game', '海景房', '狗子', '速冻机箱', '炸不死', '黑悟空', '图吧禁片',
             '电竞小屋', '毛坯房', '小姐姐', '女主播', '王思聪', '幼教级', '达芬奇谜题',
             '鲨鱼很危险', '摆烂', '刷墙工', '垃圾堆',
             '修不起', '天价维修', '暗藏玄机', '煮鸡蛋', '上门维修', '女师傅', '血赚',
             '车祸', '飞线', '乔布斯', '津门', '河钓鱼', '闲鱼', '每天认识一个']


def blocked(t):
    lt = (t or '').lower()
    return any(w in lt for w in BLACK_SUB)


items, seen = [], set()
for x in raw:
    if x["bvid"] in seen or x["play"] < MINPLAY:
        continue
    seen.add(x["bvid"])
    items.append({"t": x["title"], "a": x["author"], "p": x["play"],
                  "d": x["dur"], "b": x["bvid"], "g": x["group"], "pub": x["pub"]})

out = []
for g, cap in CAP.items():
    gs = [x for x in items if x["g"] == g]
    gs.sort(key=lambda z: -z["p"])
    gs = gs[:cap]
    gs = [x for x in gs if not blocked(x["t"])]  # 先截断后过滤：不补位，宁缺毋滥
    out += gs
out.sort(key=lambda z: -z["p"])

EXTRA = {
    "platforms": [
        {"name": "B站", "desc": "主源 · 本库已自动抓取 B站全网热门", "hot": True, "links": [
            {"t": "装机教程", "u": "https://search.bilibili.com/all?keyword=%E8%A3%85%E6%9C%BA%E6%95%99%E7%A8%8B"},
            {"t": "装机实录", "u": "https://search.bilibili.com/all?keyword=%E8%A3%85%E6%9C%BA%E5%AE%9E%E5%BD%95"},
            {"t": "计算机组成原理", "u": "https://search.bilibili.com/all?keyword=%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%BB%84%E6%88%90%E5%8E%9F%E7%90%86"},
            {"t": "操作系统", "u": "https://search.bilibili.com/all?keyword=%E6%93%8D%E4%BD%9C%E7%B3%BB%E7%BB%9F%E8%AF%BE%E7%A8%8B"},
            {"t": "计算机网络", "u": "https://search.bilibili.com/all?keyword=%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%BD%91%E7%BB%9C"},
            {"t": "编译原理", "u": "https://search.bilibili.com/all?keyword=%E7%BC%96%E8%AF%91%E5%8E%9F%E7%90%86"},
            {"t": "自制编译器", "u": "https://search.bilibili.com/all?keyword=%E8%87%AA%E5%88%B6%E7%BC%96%E8%AF%91%E5%99%A8"},
            {"t": "CS自学", "u": "https://search.bilibili.com/all?keyword=CS%E8%87%AA%E5%AD%A6"},
        ]},
        {"name": "知乎", "desc": "查概念、查选购避坑、查学习路线", "links": [
            {"t": "装机指南搜索", "u": "https://www.zhihu.com/search?type=content&q=%E8%A3%85%E6%9C%BA%E6%8C%87%E5%8D%97"},
            {"t": "编译原理怎么学", "u": "https://www.zhihu.com/search?type=content&q=%E7%BC%96%E8%AF%91%E5%8E%9F%E7%90%86%E6%80%8E%E4%B9%88%E5%AD%A6"},
            {"t": "计算机基础学习路线", "u": "https://www.zhihu.com/search?type=content&q=%E8%AE%A1%E7%AE%97%E6%9C%BA%E5%9F%BA%E7%A1%80%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF"},
        ]},
        {"name": "中国大学MOOC", "desc": "国内高校正规课程（免费旁听）", "links": [
            {"t": "编译原理", "u": "https://www.icourse163.org/search.htm?search=%E7%BC%96%E8%AF%91%E5%8E%9F%E7%90%86"},
            {"t": "计算机组成原理", "u": "https://www.icourse163.org/search.htm?search=%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%BB%84%E6%88%90%E5%8E%9F%E7%90%86"},
            {"t": "操作系统", "u": "https://www.icourse163.org/search.htm?search=%E6%93%8D%E4%BD%9C%E7%B3%BB%E7%BB%9F"},
        ]},
        {"name": "YouTube", "desc": "国际顶级公开课（需网络条件）", "links": [
            {"t": "CS50 哈佛计算机导论", "u": "https://www.youtube.com/results?search_query=CS50+harvard+2024"},
            {"t": "Nand2Tetris", "u": "https://www.youtube.com/results?search_query=nand2tetris+lecture"},
            {"t": "Compilers 编译原理", "u": "https://www.youtube.com/results?search_query=compilers+course+lecture"},
            {"t": "How to build a PC 装机", "u": "https://www.youtube.com/results?search_query=how+to+build+a+pc+full+guide"},
        ]},
        {"name": "经典公开课直达", "desc": "系统化学习的最佳入口", "links": [
            {"t": "Stanford Compilers（官网）", "u": "https://online.stanford.edu/courses/soe-ycscs1-compilers"},
            {"t": "MIT 6.004 计组", "u": "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/"},
            {"t": "MIT Missing Semester", "u": "https://missing.csail.mit.edu/"},
            {"t": "CS自学指南 csdiy.wiki", "u": "https://csdiy.wiki/"},
        ]},
    ],
    "projects": [
        {"name": "Crafting Interpreters", "desc": "《手写解释器》——从零写两遍解释器（Java 版 + C 版），编译原理最佳动手书，在线免费全文。", "u": "https://craftinginterpreters.com/"},
        {"name": "chibicc · 手写 C 编译器", "desc": "日本大神 Rui Ueyama 的 C 编译器，每一步一个 commit，可跟读完整实现史。", "u": "https://github.com/rui314/chibicc"},
        {"name": "A Compiler Writing Journey", "desc": "用 C 从零写一门语言的自学编译器教程（ACWJ），循序渐进 70+ 篇。", "u": "https://github.com/DoctorWkt/acwj"},
        {"name": "build-your-own-x", "desc": "『从零手写一切』大全集：编译器、操作系统、数据库、Docker、Git…全球最火自学仓库之一。", "u": "https://github.com/codecrafters-io/build-your-own-x"},
        {"name": "OSSU 计算机科学自学路线", "desc": "把大学 CS 完整课程表开源化，照着学就是一套本科。", "u": "https://github.com/ossu/computer-science"},
        {"name": "Nand2Tetris", "desc": "从与非门一路造出计算机和编译器——理解『计算机怎么工作』的终极课程。", "u": "https://www.nand2tetris.org/"},
        {"name": "CSAPP 深入理解计算机系统", "desc": "CMU 经典教材官网（含 Labs：二进制炸弹、Cache Lab…全是动手）。", "u": "http://csapp.cs.cmu.edu/"},
        {"name": "OSTEP 操作系统导论", "desc": "免费操作系统教材 + 配套作业，和 CSAPP 搭配学。", "u": "https://pages.cs.wisc.edu/~remzi/OSTEP/"},
        {"name": "Compiler Explorer", "desc": "在线看你的 C/C++/Rust 代码编译成什么汇编——学编译原理最直观的工具。", "u": "https://godbolt.org/"},
        {"name": "free-programming-books", "desc": "免费编程书大全（含中文目录），收藏级资源。", "u": "https://github.com/EbookFoundation/free-programming-books/blob/main/books/free-programming-books-zh.md"},
    ],
    "toolbox": [
        {"name": "Ventoy", "desc": "U盘装系统神器：一次制作，ISO 直接拷贝即用，支持多系统。", "u": "https://www.ventoy.net/cn/index.html"},
        {"name": "Rufus", "desc": "另一款经典启动盘制作工具（小巧、快速）。", "u": "https://rufus.ie/zh/"},
        {"name": "Windows 11 官方镜像", "desc": "装机装系统一律用微软官方镜像，别用来路不明的 GHOST 版。", "u": "https://www.microsoft.com/software-download/windows11"},
        {"name": "CPU-Z / GPU-Z", "desc": "验机必备：看 CPU/内存/主板/显卡真实参数，防二手翻新。", "u": "https://www.cpuid.com/softwares/cpu-z.html"},
        {"name": "CrystalDiskInfo", "desc": "硬盘健康度（SMART）检测，装机后第一件事查盘。", "u": "https://crystalmark.info/en/software/crystaldiskinfo/"},
        {"name": "HWiNFO", "desc": "硬件监控全能王：温度、电压、风扇转速全掌握。", "u": "https://www.hwinfo.com/"},
        {"name": "MSI Afterburner", "desc": "显卡监控 + 超频 + 游戏内帧数显示（不限微星卡）。", "u": "https://www.msi.com/Landing/afterburner/graphics-cards"},
        {"name": "MemTest86", "desc": "内存稳定性金标准：新装机/拷机必跑一轮。", "u": "https://www.memtest86.com/"},
        {"name": "OCCT", "desc": "一键烤机（CPU/内存/显卡/电源）——稳定性验证神器。", "u": "https://www.ocbase.com/"},
        {"name": "图吧工具箱", "desc": "中文装机体检合集（需自行搜索最新官网，注意识别冒名站）。", "u": "https://search.bilibili.com/all?keyword=%E5%9B%BE%E5%90%A7%E5%B7%A5%E5%85%B7%E7%AE%B1"},
    ],
}

data = {"gen": "2026-09-20", "items": out, "extra": EXTRA}
js = "window.RES_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
open(BASE + "/app/resource-data.js", "w", encoding="utf-8").write(js)
print("items:", len(out), "| groups:", {g: len([x for x in out if x['g'] == g]) for g in CAP})
print("written:", BASE + "/app/resource-data.js", len(js), "chars")

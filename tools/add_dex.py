#!/usr/bin/env python3
"""add_dex.py <base.apk> <classes.dex> <out.apk>

把 classes.dex 并入 aapt2 link 产出的 APK，逐条保留原始压缩方式
（resources.arsc 等必须继续 STORED，否则安装/加载会出问题）。
classes.dex 以 STORED 写入（与历史可安装产物一致；侧载不要求 zipalign）。
"""
import os
import sys
import zipfile


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    base, dex, outp = sys.argv[1:4]
    if os.path.exists(outp):
        os.remove(outp)
    if os.path.exists(dex) and '<html' in open(dex, 'rb').read(64).decode('latin-1').lower():
        sys.exit('refusing: %s looks like HTML (404 page?), not a dex' % dex)
    with zipfile.ZipFile(base) as zin, zipfile.ZipFile(outp, 'w') as zo:
        for info in zin.infolist():
            if info.filename == 'classes.dex':
                continue
            zi = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            zi.compress_type = info.compress_type
            zi.external_attr = info.external_attr
            zo.writestr(zi, zin.read(info.filename))
        zi = zipfile.ZipInfo('classes.dex')
        zi.compress_type = zipfile.ZIP_STORED
        with open(dex, 'rb') as f:
            zo.writestr(zi, f.read())
    print('merged -> %s (%d bytes)' % (outp, os.path.getsize(outp)))


if __name__ == '__main__':
    main()

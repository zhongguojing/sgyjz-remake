#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
三国志英杰传 DOS 版资源提取工具
================================
从原版 DOS 游戏的 IDX/GRP 文件中提取图片资源。

文件格式分析（基于 desperate-angel 复刻版源码）：
  - IDX 文件：每4字节一个 int32，记录对应图片在 GRP 文件中的偏移
  - GRP 文件：图片像素数据，支持两种格式：
    1. RLE 压缩格式（原版 DOS 格式）：
       - 头部 8 字节：w(2) + h(2) + xoff(2) + yoff(2)
       - 像素数据：RLE 编码，使用 256 色调色板
    2. PNG 格式（复刻版新增）：直接存储为 PNG
  - PAL 文件：256 色调色板，每色 3 字节 (R, G, B)

用法：
  python extract_assets.py --idx FACE.IDX --grp FACE.GRP --pal MAIN.PAL --output ./output
"""

import struct
import argparse
import os
from pathlib import Path
import zlib


def load_palette(pal_path: str) -> list:
    """
    加载 256 色调色板文件。
    PAL 文件格式：256 * 3 字节，每色 (R, G, B)，每种颜色值 0-63（VGA 6-bit）
    返回：[(R, G, B, A), ...] 共 256 个 (R,G,B,A) 元组
    """
    palette = []
    with open(pal_path, 'rb') as f:
        for i in range(256):
            rgb = f.read(3)
            if len(rgb) < 3:
                palette.append((0, 0, 0, 255))
            else:
                # VGA 6-bit 调色板值 0-63，需要左移 2 位到 0-255
                r = rgb[0] << 2
                g = rgb[1] << 2
                b = rgb[2] << 2
                palette.append((r, g, b, 255))
    return palette


def decode_rle_picture(data: bytes, w: int, h: int, palette: list) -> bytes:
    """
    解码 RLE 压缩的图片数据为 RGBA 像素数据。
    返回：w * h * 4 字节的 RGBA 数据

    格式说明（基于 C 源码 CreatePicSurface32 反推）：
    逐行解码：
      - 每行第1字节：该行数据字节数 row_size
      - 然后循环：
          skip = data[p]    -> 跳过 skip 个透明像素
          p++
          solid = data[p]   -> 接下来 solid 个不透明像素
          p++
          接下来 solid 个字节：每个字节是调色板索引
          写入 data32[yoffset+x] = palette[index] | 0xff000000
    """
    # 初始化 RGBA 数据（全透明）
    rgba = bytearray(w * h * 4)

    p = 0  # 当前读取位置
    for y in range(h):
        if p >= len(data):
            break
        row_size = data[p]  # 该行数据字节数
        p += 1
        if row_size == 0:
            continue

        row_start = p
        x = 0

        while True:
            if x >= w:
                break
            if p >= len(data):
                break

            # 跳过透明像素
            skip = data[p]
            x += skip
            p += 1
            if x >= w:
                break
            if p - row_start >= row_size:
                break

            # 不透明像素个数
            solid = data[p]
            p += 1
            for j in range(solid):
                if x >= w or p >= len(data):
                    break
                idx = data[p]
                if 0 <= x < w and 0 <= y < h:
                    pos = (y * w + x) * 4
                    if idx < len(palette):
                        r, g, b, _ = palette[idx]
                        rgba[pos] = r
                        rgba[pos + 1] = g
                        rgba[pos + 2] = b
                        rgba[pos + 3] = 255  # 不透明
                p += 1
                x += 1
            if x >= w:
                break
            if p - row_start >= row_size:
                break

    return bytes(rgba)


def is_png(data: bytes) -> bool:
    """检查数据是否为 PNG 格式（前8字节为 PNG 签名）"""
    return data[:8] == b'\x89PNG\r\n\x1a\n'


def extract_image(idx_path: str, grp_path: str, pal_path: str, output_dir: str, pic_id: int = None):
    """
    从 IDX/GRP 文件中提取图片。

    :param idx_path: IDX 文件路径
    :param grp_path: GRP 文件路径
    :param pal_path: PAL 调色板文件路径
    :param output_dir: 输出目录
    :param pic_id: 要提取的图片 ID，None 表示提取所有
    """
    # 读取 IDX 文件
    with open(idx_path, 'rb') as f:
        idx_data = f.read()

    num_pics = len(idx_data) // 4
    offsets = []
    for i in range(num_pics):
        offset = struct.unpack('<i', idx_data[i*4:(i+1)*4])[0]
        offsets.append(offset)

    # 读取 GRP 文件
    with open(grp_path, 'rb') as f:
        grp_data = f.read()

    # 加载调色板
    palette = load_palette(pal_path)

    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)

    # 确定要提取的图片范围
    if pic_id is not None:
        pic_ids = [pic_id]
    else:
        pic_ids = range(num_pics - 1)

    extracted = 0
    for i in pic_ids:
        if i < 0 or i >= len(offsets) - 1:
            continue

        start = offsets[i]
        end = offsets[i + 1] if i + 1 < len(offsets) else len(grp_data)

        if start < 0 or end <= start:
            continue

        pic_data = grp_data[start:end]

        if len(pic_data) < 8:
            continue

        # 检查是否为 PNG
        if is_png(pic_data):
            # 直接保存为 PNG
            out_path = os.path.join(output_dir, f'{i:04d}.png')
            with open(out_path, 'wb') as out:
                out.write(pic_data)
            extracted += 1
            print(f'  提取图片 {i} -> {out_path} (PNG, {len(pic_data)} 字节)')
        else:
            # RLE 格式
            w = struct.unpack('<h', pic_data[0:2])[0]
            h = struct.unpack('<h', pic_data[2:4])[0]
            xoff = struct.unpack('<h', pic_data[4:6])[0]
            yoff = struct.unpack('<h', pic_data[6:8])[0]

            if w <= 0 or h <= 0 or w > 1000 or h > 1000:
                print(f'  图片 {i} 尺寸异常：{w}x{h}，跳过')
                continue

            # 解码 RLE 数据
            pixel_data = decode_rle_picture(pic_data[8:], w, h, palette)

            # 保存为 PNG
            out_path = os.path.join(output_dir, f'{i:04d}.png')
            save_rgba_as_png(out_path, pixel_data, w, h)
            extracted += 1
            print(f'  提取图片 {i} -> {out_path} ({w}x{h}, xoff={xoff}, yoff={yoff})')

    print(f'共提取 {extracted} 张图片')
    return extracted


def save_rgba_as_png(path: str, rgba_data: bytes, w: int, h: int):
    """
    将 RGBA 像素数据保存为 PNG 文件（纯 Python，无依赖）
    使用 zlib 压缩 IDAT 块。
    """
    def chunk(chunk_type: bytes, data: bytes) -> bytes:
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    # PNG 签名
    sig = b'\x89PNG\r\n\x1a\n'

    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)  # 8-bit RGBA
    ihdr = chunk(b'IHDR', ihdr_data)

    # IDAT - 过滤后压缩
    raw_data = b''
    for y in range(h):
        raw_data += b'\x00'  # 无过滤
        raw_data += rgba_data[y * w * 4:(y + 1) * w * 4]
    compressed = zlib.compress(raw_data)
    idat = chunk(b'IDAT', compressed)

    # IEND
    iend = chunk(b'IEND', b'')

    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)


def list_files(idx_path: str):
    """列出 IDX 文件中的图片信息"""
    with open(idx_path, 'rb') as f:
        idx_data = f.read()
    num_pics = len(idx_data) // 4
    print(f'IDX 文件：{idx_path}')
    print(f'图片数量：{num_pics - 1}')
    print(f'（偏移表有 {num_pics} 个条目，最后一个是文件末尾标记）')


# ==================== 命令行入口 ====================

def main():
    parser = argparse.ArgumentParser(description='三国志英杰传 DOS 版资源提取工具')
    parser.add_argument('--idx', required=True, help='IDX 文件路径（如 FACE.IDX）')
    parser.add_argument('--grp', required=True, help='GRP 文件路径（如 FACE.GRP）')
    parser.add_argument('--pal', required=True, help='PAL 调色板文件（如 MAIN.PAL）')
    parser.add_argument('--output', required=True, help='输出目录')
    parser.add_argument('--pic', type=int, help='只提取指定 ID 的图片（默认提取所有）')
    parser.add_argument('--list', action='store_true', help='只列出图片信息，不提取')

    args = parser.parse_args()

    if args.list:
        list_files(args.idx)
        return

    print(f'提取资源：')
    print(f'  IDX: {args.idx}')
    print(f'  GRP: {args.grp}')
    print(f'  PAL: {args.pal}')
    print(f'  输出: {args.output}')
    print()

    extract_image(args.idx, args.grp, args.pal, args.output, args.pic)


if __name__ == '__main__':
    main()

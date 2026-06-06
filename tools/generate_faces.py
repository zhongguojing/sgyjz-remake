#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
三国武将像素头像生成器 v2
==========================
为三国志英杰传重制版生成像素风格的三国武将头像。

风格：参考原版英杰传 64x80 像素头像，卡通化、色彩鲜明、有辨识度
生成 256x320 像素（4倍放大，保持像素感）
"""

import os
import math
import random
from PIL import Image, ImageDraw, ImageFont
import json

# ============================================================
# 三国武将数据
# ============================================================
HEROES = [
    # 蜀国
    {"id": 0, "name": "刘备", "force": "蜀", "gender": "男", "skin": (240, 200, 160), "hair": (40, 30, 20), "clothes": (80, 120, 200)},
    {"id": 1, "name": "关羽", "force": "蜀", "gender": "男", "skin": (230, 190, 150), "hair": (40, 30, 20), "clothes": (80, 160, 60)},
    {"id": 2, "name": "张飞", "force": "蜀", "gender": "男", "skin": (220, 180, 140), "hair": (30, 20, 10), "clothes": (180, 60, 60)},
    {"id": 3, "name": "赵云", "force": "蜀", "gender": "男", "skin": (240, 210, 170), "hair": (230, 220, 200), "clothes": (60, 100, 180)},
    {"id": 4, "name": "诸葛亮", "force": "蜀", "gender": "男", "skin": (240, 210, 170), "hair": (40, 30, 20), "clothes": (60, 60, 60)},
    {"id": 5, "name": "马超", "force": "蜀", "gender": "男", "skin": (200, 170, 130), "hair": (220, 200, 180), "clothes": (200, 180, 80)},
    {"id": 6, "name": "黄忠", "force": "蜀", "gender": "男", "skin": (220, 190, 150), "hair": (180, 160, 120), "clothes": (140, 100, 60)},
    {"id": 7, "name": "姜维", "force": "蜀", "gender": "男", "skin": (230, 200, 160), "hair": (50, 40, 30), "clothes": (80, 120, 200)},
    {"id": 8, "name": "魏延", "force": "蜀", "gender": "男", "skin": (220, 180, 140), "hair": (40, 30, 20), "clothes": (160, 80, 60)},
    {"id": 9, "name": "庞统", "force": "蜀", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (100, 80, 60)},
    {"id": 10, "name": "法正", "force": "蜀", "gender": "男", "skin": (240, 200, 160), "hair": (60, 50, 40), "clothes": (100, 120, 80)},
    {"id": 11, "name": "徐庶", "force": "蜀", "gender": "男", "skin": (230, 190, 150), "hair": (40, 30, 20), "clothes": (80, 100, 80)},
    {"id": 12, "name": "关平", "force": "蜀", "gender": "男", "skin": (230, 190, 150), "hair": (40, 30, 20), "clothes": (80, 160, 60)},
    {"id": 13, "name": "关兴", "force": "蜀", "gender": "男", "skin": (230, 190, 150), "hair": (40, 30, 20), "clothes": (80, 160, 60)},
    {"id": 14, "name": "张苞", "force": "蜀", "gender": "男", "skin": (220, 180, 140), "hair": (30, 20, 10), "clothes": (180, 60, 60)},
    {"id": 15, "name": "马岱", "force": "蜀", "gender": "男", "skin": (200, 170, 130), "hair": (220, 200, 180), "clothes": (200, 180, 80)},
    {"id": 16, "name": "王平", "force": "蜀", "gender": "男", "skin": (220, 180, 140), "hair": (40, 30, 20), "clothes": (80, 120, 200)},
    {"id": 17, "name": "廖化", "force": "蜀", "gender": "男", "skin": (220, 190, 150), "hair": (180, 160, 120), "clothes": (80, 120, 200)},
    {"id": 18, "name": "马谡", "force": "蜀", "gender": "男", "skin": (240, 200, 160), "hair": (40, 30, 20), "clothes": (80, 120, 200)},
    {"id": 19, "name": "严颜", "force": "蜀", "gender": "男", "skin": (210, 170, 130), "hair": (180, 160, 120), "clothes": (140, 100, 60)},

    # 魏国
    {"id": 20, "name": "曹操", "force": "魏", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (60, 60, 60)},
    {"id": 21, "name": "夏侯惇", "force": "魏", "gender": "男", "skin": (220, 180, 140), "hair": (40, 30, 20), "clothes": (140, 40, 40)},
    {"id": 22, "name": "夏侯渊", "force": "魏", "gender": "男", "skin": (220, 180, 140), "hair": (40, 30, 20), "clothes": (140, 40, 40)},
    {"id": 23, "name": "典韦", "force": "魏", "gender": "男", "skin": (220, 190, 150), "hair": (100, 80, 60), "clothes": (120, 50, 50)},
    {"id": 24, "name": "许褚", "force": "魏", "gender": "男", "skin": (220, 180, 140), "hair": (30, 20, 10), "clothes": (140, 50, 50)},
    {"id": 25, "name": "张辽", "force": "魏", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (60, 60, 120)},
    {"id": 26, "name": "徐晃", "force": "魏", "gender": "男", "skin": (220, 180, 140), "hair": (40, 30, 20), "clothes": (60, 60, 120)},
    {"id": 27, "name": "曹仁", "force": "魏", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (60, 60, 60)},
    {"id": 28, "name": "司马懿", "force": "魏", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (60, 60, 60)},
    {"id": 29, "name": "郭嘉", "force": "魏", "gender": "男", "skin": (230, 200, 160), "hair": (40, 30, 20), "clothes": (60, 60, 120)},
    {"id": 30, "name": "荀彧", "force": "魏", "gender": "男", "skin": (230, 200, 160), "hair": (40, 30, 20), "clothes": (60, 60, 120)},
    {"id": 31, "name": "张郃", "force": "魏", "gender": "男", "skin": (220, 180, 140), "hair": (40, 30, 20), "clothes": (60, 60, 120)},
    {"id": 32, "name": "于禁", "force": "魏", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (60, 60, 120)},
    {"id": 33, "name": "乐进", "force": "魏", "gender": "男", "skin": (220, 180, 140), "hair": (40, 30, 20), "clothes": (60, 60, 120)},
    {"id": 34, "name": "庞德", "force": "魏", "gender": "男", "skin": (200, 170, 130), "hair": (40, 30, 20), "clothes": (140, 40, 40)},

    # 吴国
    {"id": 35, "name": "孙权", "force": "吴", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (60, 120, 60)},
    {"id": 36, "name": "孙策", "force": "吴", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (60, 120, 60)},
    {"id": 37, "name": "周瑜", "force": "吴", "gender": "男", "skin": (230, 200, 160), "hair": (40, 30, 20), "clothes": (60, 100, 120)},
    {"id": 38, "name": "陆逊", "force": "吴", "gender": "男", "skin": (230, 200, 160), "hair": (40, 30, 20), "clothes": (60, 120, 60)},
    {"id": 39, "name": "太史慈", "force": "吴", "gender": "男", "skin": (220, 180, 140), "hair": (40, 30, 20), "clothes": (60, 120, 60)},
    {"id": 40, "name": "甘宁", "force": "吴", "gender": "男", "skin": (220, 180, 140), "hair": (40, 30, 20), "clothes": (60, 120, 60)},
    {"id": 41, "name": "吕蒙", "force": "吴", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (60, 120, 60)},
    {"id": 42, "name": "黄盖", "force": "吴", "gender": "男", "skin": (210, 170, 130), "hair": (180, 160, 120), "clothes": (60, 120, 60)},
    {"id": 43, "name": "程普", "force": "吴", "gender": "男", "skin": (210, 170, 130), "hair": (180, 160, 120), "clothes": (60, 120, 60)},
    {"id": 44, "name": "鲁肃", "force": "吴", "gender": "男", "skin": (230, 200, 160), "hair": (40, 30, 20), "clothes": (60, 100, 120)},

    # 其他势力/中立
    {"id": 45, "name": "吕布", "force": "群", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (180, 140, 60)},
    {"id": 46, "name": "貂蝉", "force": "群", "gender": "女", "skin": (240, 200, 160), "hair": (40, 30, 20), "clothes": (180, 100, 140)},
    {"id": 47, "name": "董卓", "force": "群", "gender": "男", "skin": (220, 190, 150), "hair": (180, 160, 120), "clothes": (140, 60, 60)},
    {"id": 48, "name": "袁绍", "force": "群", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (140, 60, 60)},
    {"id": 49, "name": "公孙瓒", "force": "群", "gender": "男", "skin": (220, 190, 150), "hair": (40, 30, 20), "clothes": (60, 60, 120)},
]

FORCE_COLORS = {
    "蜀": (60, 120, 200),
    "魏": (140, 40, 40),
    "吴": (60, 120, 60),
    "群": (140, 100, 40),
}


def darken(c, factor=0.5):
    return tuple(int(v * factor) for v in c[:3])

def lighten(c, factor=1.3):
    return tuple(min(255, int(v * factor)) for v in c[:3])


def draw_pixel_face_v2(hero: dict) -> Image.Image:
    """v2 版本：更精致的像素头像"""
    # 先在 64x80 像素画布上绘制，然后放大
    BASE_W, BASE_H = 64, 80
    SCALE = 4  # 最终输出 256x320

    img = Image.new('RGBA', (BASE_W, BASE_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    skin = hero["skin"]
    hair = hero["hair"]
    clothes = hero["clothes"]
    force_color = FORCE_COLORS.get(hero["force"], (100, 100, 100))
    is_female = hero["gender"] == "女"
    name = hero["name"]

    random.seed(hero["id"] * 1000)

    # ---- 背景：势力色圆角矩形 ----
    for y in range(2, BASE_H - 2):
        for x in range(2, BASE_W - 2):
            # 圆角
            if (x < 6 and y < 6) or (x < 6 and y > BASE_H - 7) or \
               (x > BASE_W - 7 and y < 6) or (x > BASE_W - 7 and y > BASE_H - 7):
                continue
            img.putpixel((x, y), (*force_color, 80))

    # ---- 头发（上半部分） ----
    hair_top = 8
    hair_bottom = 28
    for y in range(hair_top, hair_bottom):
        hw = get_hair_width_v2(name, y, hair_top, hair_bottom)
        for x in range(32 - hw, 32 + hw):
            if 0 <= x < BASE_W:
                img.putpixel((x, y), (*hair, 255))

    # ---- 面部 ----
    face_top = 26
    face_bottom = 54
    for y in range(face_top, face_bottom):
        progress = (y - face_top) / (face_bottom - face_top)
        face_w = int(10 * (1.0 - 0.3 * progress))
        for x in range(32 - face_w, 32 + face_w):
            if 0 <= x < BASE_W:
                img.putpixel((x, y), (*skin, 255))

    # ---- 眼睛 ----
    eye_y = 35
    eye_w, eye_h = 4, 3
    # 左眼
    for dy in range(eye_h):
        for dx in range(eye_w):
            if 27 + dx < BASE_W:
                img.putpixel((27 + dx, eye_y + dy), (20, 20, 20, 255))
    # 右眼
    for dy in range(eye_h):
        for dx in range(eye_w):
            if 33 + dx < BASE_W:
                img.putpixel((33 + dx, eye_y + dy), (20, 20, 20, 255))

    # 眉毛
    for x in range(26, 32):
        img.putpixel((x, eye_y - 3), (*hair, 255))
    for x in range(34, 40):
        img.putpixel((x, eye_y - 3), (*hair, 255))

    # ---- 鼻子 ----
    nose_y = 41
    for dy in range(3):
        img.putpixel((32, nose_y + dy), darken(skin, 0.6) + (255,))

    # ---- 嘴巴 ----
    mouth_y = 49
    mouth_color = (180, 60, 60, 255) if not is_female else (200, 80, 120, 255)
    for x in range(30, 34):
        for dy in range(2):
            img.putpixel((x, mouth_y + dy), mouth_color)

    # ---- 耳朵 ----
    for y in range(30, 46):
        img.putpixel((21, y), (*skin, 255))
        img.putpixel((20, y), darken(skin, 0.6) + (255,))
        img.putpixel((42, y), (*skin, 255))
        img.putpixel((43, y), darken(skin, 0.6) + (255,))

    # ---- 鬓角 ----
    for y in range(28, 38):
        for x in range(21, 23):
            img.putpixel((x, y), (*hair, 255))
        for x in range(41, 43):
            img.putpixel((x, y), (*hair, 255))

    # ---- 头盔/冠帽 ----
    draw_helmet_v2(draw, name, is_female, hair, force_color)

    # ---- 衣服/铠甲 ----
    body_top = 56
    for y in range(body_top, BASE_H - 2):
        body_w = int(12 * (0.8 + 0.4 * (y - body_top) / (BASE_H - body_top)))
        for x in range(32 - body_w, 32 + body_w):
            if 0 <= x < BASE_W:
                # 铠甲纹理
                if (x // 3) % 2 == (y // 3) % 2:
                    img.putpixel((x, y), darken(clothes, 0.5) + (255,))
                else:
                    img.putpixel((x, y), (*clothes, 255))

    # ---- 名字标签 ----
    name_bg_h = 10
    for y in range(BASE_H - name_bg_h, BASE_H):
        for x in range(BASE_W):
            img.putpixel((x, y), (0, 0, 0, 160))

    # 放大
    img = img.resize((BASE_W * SCALE, BASE_H * SCALE), Image.NEAREST)

    # 在放大后的图上写名字
    draw2 = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc", 20)
    except:
        font = ImageFont.load_default()

    bbox = draw2.textbbox((0, 0), name, font=font)
    tw = bbox[2] - bbox[0]
    tx = (img.width - tw) // 2
    draw2.text((tx, img.height - name_bg_h * SCALE + 4), name, fill=(255, 255, 255, 255), font=font)

    return img


def get_hair_width_v2(name, y, y_start, y_end):
    progress = (y - y_start) / (y_end - y_start)
    base = 12

    if name in ["诸葛亮", "庞统", "司马懿", "徐庶"]:
        if progress < 0.3:
            return int(base * (0.6 + progress * 1.5))
        return int(base * 0.7)
    elif name == "关羽":
        return int(base * (0.8 - progress * 0.3))
    elif name in ["张飞", "典韦"]:
        return int(base * (0.9 + progress * 0.2))
    elif name == "貂蝉":
        if progress < 0.5:
            return int(base * (0.7 + progress * 0.6))
        return int(base * 1.0)
    else:
        return int(base * (0.8 + progress * 0.4))


def draw_helmet_v2(draw, name, is_female, hair_color, force_color):
    hx, hy = 32, 6

    if name in ["曹操", "刘备", "孙权", "吕布"]:
        # 王冠
        color = (220, 200, 60, 255)
        points = [(hx, 0), (hx - 12, 12), (hx + 12, 12)]
        draw.polygon(points, fill=color)
        draw.ellipse([hx - 2, 2, hx + 2, 6], fill=(255, 50, 50, 255))

    elif name in ["关羽", "张飞", "赵云", "马超", "黄忠", "典韦", "许褚", "夏侯惇", "夏侯渊", "吕布", "孙策", "太史慈", "甘宁", "庞德"]:
        # 将军盔
        color = force_color + (255,)
        draw.rectangle([hx - 12, 0, hx + 12, 8], fill=color)
        draw.ellipse([hx - 3, -2, hx + 3, 4], fill=(220, 50, 50, 255))
        draw.rectangle([hx - 14, 6, hx - 12, 16], fill=color)
        draw.rectangle([hx + 12, 6, hx + 14, 16], fill=color)

    elif name in ["诸葛亮", "庞统", "郭嘉", "荀彧", "周瑜", "陆逊", "鲁肃"]:
        # 文士帽
        color = (200, 200, 200, 255)
        draw.rectangle([hx - 12, 2, hx + 12, 8], fill=color)
        draw.polygon([(hx - 12, 8), (hx - 16, 14), (hx - 8, 8)], fill=color)
        draw.polygon([(hx + 12, 8), (hx + 16, 14), (hx + 8, 8)], fill=color)

    elif is_female:
        color = (220, 100, 140, 255)
        draw.ellipse([hx - 10, 0, hx + 10, 10], fill=hair_color + (255,))
        draw.line([(hx, 0), (hx, -2)], fill=(220, 200, 60, 255), width=1)

    else:
        color = force_color + (200,)
        draw.rectangle([hx - 11, 2, hx + 11, 8], fill=color)


def generate_all(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    heroes_data = []

    for hero in HEROES:
        print(f"  生成 {hero['name']}...")
        img = draw_pixel_face_v2(hero)

        filename = f"{hero['id']:03d}_{hero['name']}.png"
        filepath = os.path.join(output_dir, filename)
        img.save(filepath)

        # 纯头像（不带名字）
        clean = img.crop((0, 0, img.width, img.height - 40))
        clean.save(os.path.join(output_dir, f"{hero['id']:03d}.png"))

        heroes_data.append({"id": hero["id"], "name": hero["name"],
                           "force": hero["force"], "gender": hero["gender"],
                           "face": f"{hero['id']:03d}.png"})

    # 保存数据
    data_dir = os.path.dirname(output_dir)
    with open(os.path.join(data_dir, "heroes.json"), 'w', encoding='utf-8') as f:
        json.dump(heroes_data, f, ensure_ascii=False, indent=2)

    # 生成合集
    generate_sheet(output_dir)

    print(f"\n共生成 {len(HEROES)} 个头像")


def generate_sheet(output_dir: str):
    cols = 10
    rows = math.ceil(len(HEROES) / cols)
    cell_w, cell_h = 256, 320

    sheet = Image.new('RGBA', (cols * cell_w, rows * cell_h), (30, 30, 50, 255))

    for i, hero in enumerate(HEROES):
        row = i // cols
        col = i % cols
        img = Image.open(os.path.join(output_dir, f"{hero['id']:03d}_{hero['name']}.png"))
        sheet.paste(img, (col * cell_w, row * cell_h))

    sheet.save(os.path.join(output_dir, "../faces_sheet.png"))
    print(f"合集已保存")


if __name__ == '__main__':
    print("=== 三国武将像素头像生成器 v2 ===\n")
    output = os.path.abspath(os.path.join(os.path.dirname(__file__), '../assets/faces'))
    generate_all(output)
    print("\n完成！")

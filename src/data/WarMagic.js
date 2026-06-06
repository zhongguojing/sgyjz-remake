// ============================================================
// 三国志英杰传 重制版 - 策略(魔法)系统
// 翻译自 Lua WarMagic() (jymain.lua:3747) + WarMagicHurt() (jymain.lua:4241)
//       + WarMagicHitRatio() (jymain.lua:3707) + WarMagicMenu() (jymain.lua:3465)
// ============================================================

import { WAR_CONSTANTS, limitX, between } from './WarConst.js';

// ==================== 策略类型定义 ====================
export const MAGIC_TYPE = {
  FIRE: 1,       // 火系
  WATER: 2,      // 水系
  WIND: 3,       // 风系
  EARTH: 4,      // 地系
  HEAL: 5,       // 治疗
  BUFF: 6,       // 强化
  DEBUFF: 7,     // 削弱
  SUMMON: 8,     // 召唤
};

// ==================== 效果范围定义 ====================
export const EFFECT_RANGE = {
  SINGLE: 1,     // 单格
  CROSS: 2,      // 十字
  AREA_3X3: 3,   // 3x3范围
  LINE: 4,       // 直线
  SELF: 5,       // 自身
  ALL_ENEMY: 6,  // 全体敌方
};

// ==================== 策略数据 ====================
// 翻译自 JY.Magic 数据结构
export const MAGIC_DATA = {
  1:  { name: '火计',   type: MAGIC_TYPE.FIRE,   mp: 8,  range: 2, effectRange: EFFECT_RANGE.CROSS,    power: 30, desc: '对目标及相邻格造成火属性伤害' },
  2:  { name: '水计',   type: MAGIC_TYPE.WATER,  mp: 8,  range: 2, effectRange: EFFECT_RANGE.CROSS,    power: 30, desc: '对目标及相邻格造成水属性伤害' },
  3:  { name: '落石',   type: MAGIC_TYPE.EARTH,  mp: 10, range: 2, effectRange: EFFECT_RANGE.SINGLE,   power: 35, desc: '对目标造成地属性伤害' },
  4:  { name: '旋风',   type: MAGIC_TYPE.WIND,   mp: 8,  range: 2, effectRange: EFFECT_RANGE.CROSS,    power: 25, desc: '对目标及相邻格造成风属性伤害' },
  5:  { name: '医疗',   type: MAGIC_TYPE.HEAL,   mp: 5,  range: 1, effectRange: EFFECT_RANGE.SINGLE,   power: 30, desc: '恢复目标HP' },
  6:  { name: '补给',   type: MAGIC_TYPE.HEAL,   mp: 8,  range: 2, effectRange: EFFECT_RANGE.SINGLE,   power: 50, desc: '恢复目标大量HP' },
  7:  { name: '混乱',   type: MAGIC_TYPE.DEBUFF, mp: 6,  range: 2, effectRange: EFFECT_RANGE.SINGLE,   power: 0,  desc: '使目标下回合无法行动' },
  8:  { name: '鼓舞',   type: MAGIC_TYPE.BUFF,   mp: 5,  range: 1, effectRange: EFFECT_RANGE.SINGLE,   power: 20, desc: '恢复目标士气' },
  9:  { name: '火阵',   type: MAGIC_TYPE.FIRE,   mp: 15, range: 2, effectRange: EFFECT_RANGE.AREA_3X3, power: 40, desc: '对3x3范围造成火属性伤害' },
  10: { name: '水阵',   type: MAGIC_TYPE.WATER,  mp: 15, range: 2, effectRange: EFFECT_RANGE.AREA_3X3, power: 40, desc: '对3x3范围造成水属性伤害' },
  11: { name: '落雷',   type: MAGIC_TYPE.WIND,   mp: 12, range: 3, effectRange: EFFECT_RANGE.SINGLE,   power: 50, desc: '远距离雷击' },
  12: { name: '大医疗', type: MAGIC_TYPE.HEAL,   mp: 15, range: 2, effectRange: EFFECT_RANGE.SINGLE,   power: 80, desc: '大量恢复目标HP' },
  13: { name: '幻术',   type: MAGIC_TYPE.DEBUFF, mp: 10, range: 2, effectRange: EFFECT_RANGE.CROSS,    power: 0,  desc: '使范围内敌方混乱' },
  14: { name: '八门金锁', type: MAGIC_TYPE.DEBUFF, mp: 20, range: 2, effectRange: EFFECT_RANGE.AREA_3X3, power: 0, desc: '使范围内敌方混乱' },
};

// ==================== 策略命中率计算 ====================
// 翻译自 WarMagicHitRatio() (jymain.lua:3707-3744)
//
// 公式: 命中率 = 1 - b/a
// a = 施法者智力2 * 等级/100 + 施法者智力2
// b = (目标智力2 * 等级/100 + 目标智力2) / 4
// 特殊修正：
// - 治疗/强化/召唤类策略命中率=1
// - 地系策略 b = b*2
// - 军师/策士/大将 b = b*1.5
// - 特技修正(火神/水神/沉着/神算/识破)
export function warMagicHitRatio(caster, target, magicId, enhancement = false, checkSkill = null) {
  const magic = MAGIC_DATA[magicId];
  if (!magic) return 0;

  // 治疗/强化/召唤类命中率100%
  if (magic.type >= MAGIC_TYPE.HEAL) return 1;

  const p1Int = caster.intelligence || 50;
  const p1Lv = caster.level || 1;
  const p2Int = target.intelligence || 50;
  const p2Lv = target.level || 1;

  let a = p1Int * p1Lv / 100 + p1Int;
  let b = (p2Int * p2Lv / 100 + p2Int) / 4;

  // 增强模式特技修正
  if (enhancement && checkSkill) {
    // 水系 + 藤甲/水神
    if (magic.type === MAGIC_TYPE.WATER && (checkSkill(target.classId, 3) || checkSkill(target.classId, 23))) {
      a = 1; b = 2;
    }
    // 火系 + 火神
    if (magic.type === MAGIC_TYPE.FIRE && checkSkill(target.classId, 4)) {
      a = 1; b = 2;
    }
    // 地系 + 沉着
    if (magic.type === MAGIC_TYPE.EARTH && checkSkill(target.classId, 20)) {
      a = 1; b = 2;
    }
    // 神算(施法方)
    if (checkSkill(caster.classId, 17)) {
      a = a * 2;
    }
    // 识破(目标)
    if (checkSkill(target.classId, 18)) {
      b = b * 2;
    }
  }

  // 地系策略 b翻倍
  if (magic.type === MAGIC_TYPE.EARTH) {
    b = b * 2;
  }

  // 军师/策士/大将 b*1.5
  if (target.classId === 3 || target.classId === 16 || target.classId === 19) {
    b = b * 1.5;
  }

  let hitRatio = 1 - b / a;
  hitRatio = limitX(hitRatio, 0, 1);
  return hitRatio;
}

// ==================== 策略伤害/恢复计算 ====================
// 翻译自 WarMagicHurt() (jymain.lua:4241-4408)
export function warMagicHurt(caster, target, magicId, isItem = false) {
  const magic = MAGIC_DATA[magicId];
  if (!magic) return { hurt: 0, heal: 0, moraleHurt: 0, hit: false };

  // 命中判定
  let hitRatio = isItem ? 1 : warMagicHitRatio(caster, target, magicId);
  let isHit = Math.random() < hitRatio;

  if (!isHit) {
    return { hurt: 0, heal: 0, moraleHurt: 0, hit: false };
  }

  // 治疗/恢复类
  if (magic.type === MAGIC_TYPE.HEAL) {
    let heal = magic.power;
    // 智力加成
    heal += Math.floor((caster.intelligence || 50) * caster.level / 50);
    return { hurt: 0, heal, moraleHurt: 0, hit: true };
  }

  // 士气恢复类
  if (magic.type === MAGIC_TYPE.BUFF) {
    return { hurt: 0, heal: 0, moraleHurt: -magic.power, hit: true }; // negative moraleHurt = morale gain
  }

  // 混乱类
  if (magic.type === MAGIC_TYPE.DEBUFF && magic.power === 0) {
    return { hurt: 0, heal: 0, moraleHurt: 5, hit: true, confused: true };
  }

  // 攻击类策略
  // 伤害 = 策略威力 + 智力*等级/50 - 目标智力*等级/100
  let hurt = magic.power;
  hurt += Math.floor((caster.intelligence || 50) * (caster.level || 1) / 50);
  hurt -= Math.floor((target.intelligence || 50) * (target.level || 1) / 100);
  hurt = Math.max(1, hurt);

  // 士气降幅
  let moraleHurt = Math.floor(hurt / (target.level + 5) / 4);
  if (moraleHurt === 0 && hurt > 0) moraleHurt = 1;

  // 伤害不超过剩余兵力
  if (hurt > target.hp) hurt = target.hp;

  return { hurt, heal: 0, moraleHurt, hit: true };
}

// ==================== 策略施放条件检查 ====================
// 翻译自 WarMagicCheck() (jymain.lua:4211-4240)
export function warMagicCheck(caster, target, magicId) {
  const magic = MAGIC_DATA[magicId];
  if (!magic) return { canCast: false, reason: '策略不存在' };

  // MP检查
  if ((caster.mp || 0) < magic.mp) {
    return { canCast: false, reason: 'MP不足' };
  }

  // 范围检查
  const dist = Math.max(Math.abs(caster.col - target.col), Math.abs(caster.row - target.row));
  if (dist > magic.range) {
    return { canCast: false, reason: '超出范围' };
  }

  // 友军/敌军检查
  if (magic.type === MAGIC_TYPE.HEAL || magic.type === MAGIC_TYPE.BUFF) {
    // 恢复/强化类只能对友军使用
    if (caster.side !== target.side) {
      return { canCast: false, reason: '只能对友军使用' };
    }
  } else {
    // 攻击/削弱类只能对敌军使用
    if (caster.side === target.side) {
      return { canCast: false, reason: '不能对友军使用' };
    }
  }

  return { canCast: true };
}

// ==================== 获取效果范围坐标 ====================
// 翻译自 WarGetAtkFW() 中的策略效果范围部分
export function getMagicEffectRange(centerX, centerY, effectRange) {
  const positions = [];

  switch (effectRange) {
    case EFFECT_RANGE.SINGLE:
    case EFFECT_RANGE.SELF:
      positions.push([centerX, centerY]);
      break;

    case EFFECT_RANGE.CROSS:
      positions.push([centerX, centerY]);
      positions.push([centerX - 1, centerY]);
      positions.push([centerX + 1, centerY]);
      positions.push([centerX, centerY - 1]);
      positions.push([centerX, centerY + 1]);
      break;

    case EFFECT_RANGE.AREA_3X3:
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          positions.push([centerX + dx, centerY + dy]);
        }
      }
      break;

    case EFFECT_RANGE.ALL_ENEMY:
      // 需要传入所有敌方单位坐标，此处返回空，由调用方处理
      break;

    default:
      positions.push([centerX, centerY]);
  }

  return positions;
}

// ==================== 获取可施放策略列表 ====================
// 翻译自 WarMagicMenu_sub() (jymain.lua:3548)
export function getAvailableMagics(caster, magicIds) {
  const available = [];
  for (const mid of magicIds) {
    const magic = MAGIC_DATA[mid];
    if (!magic) continue;
    if ((caster.mp || 0) >= magic.mp) {
      available.push({ id: mid, ...magic });
    }
  }
  return available;
}

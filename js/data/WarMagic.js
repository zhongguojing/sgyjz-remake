// ============================================================
// 三国志英杰传 重制版 - 策略系统模块
// 从Lua jymain.lua WarMagic()/WarMagicHurt() 翻译
// ============================================================

import { WAR_CONSTANTS } from './WarConst.js';

// ============================================================
// 策略数据 (Lua MAGIC_DATA)
// ============================================================

export const MAGIC_TYPE = {
  FIRE: 0,        // 火计
  WATER: 1,       // 水计
  WIND: 2,        // 风计
  EARTH: 3,       // 地计
  HEAL: 4,        // 医疗
  ANTI_CAVALRY: 5, // 反骑兵
  CHAOS: 6,       // 混乱
  SLEEP: 7,       // 睡眠
  POISON: 8,      // 中毒
  REINFORCE: 9,   // 强化
  WEAKEN: 10,     // 弱化
  MORALE_UP: 11,  // 士气上升
  MORALE_DOWN: 12, // 士气下降
  REVEAL: 13,     // 识破
};

export const EFFECT_RANGE = {
  SINGLE: 0,      // 单体
  CROSS: 1,       // 十字
  ALL: 2,         // 全体
  RANDOM: 3,      // 随机
};

export const MAGIC_DATA = {
  0:  { id:0,  name:'火计',   type:'damage',  mp:8,  range:2, aoe:1, desc:'对目标造成伤害' },
  1:  { id:1,  name:'水计',   type:'damage',  mp:8,  range:2, aoe:1, desc:'对目标造成伤害' },
  2:  { id:2,  name:'风计',   type:'damage',  mp:10, range:2, aoe:2, desc:'对目标及相邻造成伤害' },
  3:  { id:3,  name:'地计',   type:'damage',  mp:12, range:3, aoe:2, desc:'对范围内造成伤害' },
  4:  { id:4,  name:'医疗',   type:'heal',    mp:5,  range:1, aoe:0, desc:'恢复目标HP' },
  5:  { id:5,  name:'反骑兵', type:'buff',    mp:6,  range:1, aoe:0, desc:'提升对骑兵伤害' },
  6:  { id:6,  name:'混乱',   type:'debuff',  mp:6,  range:2, aoe:0, desc:'使敌方无法行动' },
  7:  { id:7,  name:'睡眠',   type:'debuff',  mp:8,  range:2, aoe:0, desc:'使敌方跳过回合' },
  8:  { id:8,  name:'中毒',   type:'debuff',  mp:7,  range:2, aoe:0, desc:'每回合损失HP' },
  9:  { id:9,  name:'强化',   type:'buff',    mp:6,  range:1, aoe:0, desc:'提升攻击力' },
  10: { id:10, name:'弱化',   type:'debuff',  mp:6,  range:2, aoe:0, desc:'降低防御力' },
  11: { id:11, name:'士气上升', type:'buff',  mp:5,  range:1, aoe:0, desc:'恢复士气' },
  12: { id:12, name:'士气下降', type:'debuff', mp:5,  range:2, aoe:0, desc:'降低敌方士气' },
  13: { id:13, name:'识破',   type:'reveal',  mp:4,  range:3, aoe:0, desc:'显示敌方HP' },
};

// ============================================================
// 策略命中率 (Lua WarMagicHitRatio)
// ============================================================

/**
 * 计算策略命中率
 * @param {Object} caster - 施法者 {int, level}
 * @param {Object} target - 目标 {int, level, morale}
 * @param {number} magicId - 策略ID
 * @returns {number} 命中率 (0-100)
 */
export function warMagicHitRatio(caster, target, magicId) {
  const magic = MAGIC_DATA[magicId];
  if (!magic) return 0;
  
  // 基础命中率 = 施法者智力 vs 目标智力
  const a = Math.floor(caster.int * caster.level / 100) + caster.int;
  const b = Math.floor(target.int * target.level / 100 + target.int) / 4;
  
  let ratio = 100 - Math.floor(b / a * 100);
  
  // 限制范围 20%-95%
  ratio = Math.max(20, Math.min(95, ratio));
  
  return ratio;
}

// ============================================================
// 策略伤害/效果 (Lua WarMagicHurt)
// ============================================================

/**
 * 计算策略伤害/效果
 * @param {Object} caster - 施法者
 * @param {Object} target - 目标
 * @param {number} magicId - 策略ID
 * @returns {Object} {damage, healed, buff, debuff, success}
 */
export function warMagicHurt(caster, target, magicId) {
  const magic = MAGIC_DATA[magicId];
  if (!magic) return { success: false };
  
  // 检查MP
  if (caster.mp < magic.mp) {
    return { success: false, reason: 'MP不足' };
  }
  
  // 计算命中率
  const hitRatio = warMagicHitRatio(caster, target, magicId);
  if (Math.random() * 100 > hitRatio) {
    return { success: false, reason: '未命中' };
  }
  
  // 消耗MP
  caster.mp -= magic.mp;
  
  // 根据策略类型计算效果
  switch (magic.type) {
    case 'damage': {
      // 策略伤害 = 施法者智力 * 策略威力 / 目标智力
      const dmg = Math.floor(caster.int * (magic.mp / 5) / (target.int || 1));
      target.hp = Math.max(0, target.hp - dmg);
      return { success: true, damage: dmg };
    }
    
    case 'heal': {
      // 治疗 = 施法者智力 * 0.5
      const heal = Math.floor(caster.int * 0.5 + 20);
      target.hp = Math.min(target.maxHp, target.hp + heal);
      return { success: true, healed: heal };
    }
    
    case 'debuff': {
      // 混乱/睡眠/中毒：根据智力差计算成功率
      const success = Math.random() * 100 < hitRatio;
      if (success) {
        target.status = magic.name;
        target.statusTurns = 2; // 持续2回合
        return { success: true, debuff: magic.name };
      }
      return { success: false, reason: '抵抗' };
    }
    
    case 'buff': {
      // 强化/反骑兵：成功率100%
      target.buff = magic.name;
      target.buffTurns = 2;
      return { success: true, buff: magic.name };
    }
    
    default:
      return { success: false, reason: '未知策略' };
  }
}

// ============================================================
// 策略条件检查 (Lua WarMagicCheck)
// ============================================================

/**
 * 检查是否可以对该目标使用策略
 * @param {Object} caster - 施法者
 * @param {Object} target - 目标
 * @param {number} magicId - 策略ID
 * @returns {boolean}
 */
export function warMagicCheck(caster, target, magicId) {
  const magic = MAGIC_DATA[magicId];
  if (!magic) return false;
  
  // MP不足
  if (caster.mp < magic.mp) return false;
  
  // 目标已死亡
  if (target.hp <= 0) return false;
  
  // 治疗只能对己方
  if (magic.type === 'heal' && caster.side !== target.side) return false;
  
  // 伤害策略只能对敌方
  if (magic.type === 'damage' && caster.side === target.side) return false;
  
  // 距离检查
  const dist = getHexDist(caster.col, caster.row, target.col, target.row);
  if (dist > magic.range) return false;
  
  return true;
}

// ============================================================
// 获取可用策略列表
// ============================================================

/**
 * 获取单位可用的策略
 * @param {Object} unit - 单位 {classType, level, mp}
 * @returns {Array} 可用策略ID列表
 */
export function getAvailableMagics(unit) {
  const result = [];
  
  // 只有军师/谋士/道士等才能使用策略
  const magicUsers = ['mage', 'strategist', 'taoist'];
  if (!magicUsers.includes(unit.classType)) return result;
  
  // 根据等级解锁策略
  for (const [id, magic] of Object.entries(MAGIC_DATA)) {
    if (unit.mp >= magic.mp) {
      // 简单解锁条件：等级足够
      const requiredLevel = Math.floor(id / 2) + 1;
      if (unit.level >= requiredLevel) {
        result.push(parseInt(id));
      }
    }
  }
  
  return result;
}

// ============================================================
// 工具函数
// ============================================================

function getHexDist(ca, ra, cb, rb) {
  const a = offsetToCube(ca, ra);
  const b = offsetToCube(cb, rb);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

function offsetToCube(col, row) {
  const x = col;
  const z = row - (col - (col & 1)) / 2;
  const y = -x - z;
  return { x, y, z };
}

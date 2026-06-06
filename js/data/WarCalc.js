// ============================================================
// 三国志英杰传 重制版 - 战斗计算模块
// 从Lua jymain.lua WarAtkHurt()/WarAddExp()/CheckZOC() 翻译
// ============================================================

import { TERRAIN_DEF_MODIFIER, WAR_CONSTANTS, bzSuper } from './WarConst.js';

// ============================================================
// 伤害计算 (Lua WarAtkHurt)
// ============================================================

/**
 * 计算物理攻击伤害
 * @param {Object} attacker - 攻击方 {atk, level, classType, side}
 * @param {Object} defender - 防御方 {def, level, maxHp, terrain}
 * @param {number} terrainId - 地形ID
 * @param {Object} magicEffect - 魔法效果修正 {atkMod, defMod}
 * @returns {Object} {hpDamage, moraleDamage, critical}
 */
export function warAtkHurt(attacker, defender, terrainId = 0, magicEffect = null) {
  // 基础攻击力
  let atk = attacker.atk;
  
  // 魔法效果修正
  if (magicEffect && magicEffect.atkMod) {
    atk = Math.floor(atk * magicEffect.atkMod);
  }
  
  // 基础防御力
  let def = defender.def;
  
  // 地形防御修正
  const terrainMod = TERRAIN_DEF_MODIFIER[terrainId] || 0;
  def = Math.floor(def * (100 + terrainMod) / 100);
  
  // 魔法效果修正
  if (magicEffect && magicEffect.defMod) {
    def = Math.floor(def * magicEffect.defMod);
  }
  
  // 兵种克制
  const advMult = bzSuper(attacker.classType, defender.classType);
  
  // 伤害公式: (atk - def/2) * 兵种倍率 * (100 - 地形修正)/100
  let baseDmg = atk - Math.floor(def / 2);
  if (baseDmg < 0) baseDmg = 1;
  
  let dmg = Math.floor(baseDmg * advMult * (100 - terrainMod) / 100);
  if (dmg < 1) dmg = 1;
  
  // 随机波动 ±10%
  const rand = 0.9 + Math.random() * 0.2;
  dmg = Math.floor(dmg * rand);
  
  // 暴击判定 (Lua: 暴击率 = (攻击者等级 - 防御者等级) * 2%)
  let critical = false;
  const critChance = (attacker.level - defender.level) * 2;
  if (critChance > 0 && Math.random() * 100 < critChance) {
    critical = true;
    dmg = Math.floor(dmg * 1.5);
  }
  
  // 士气伤害 (Lua: 士气损失 = 伤害 / (防御者等级 + 5) / 3)
  const moraleDmg = Math.floor(dmg / (defender.level + 5) / 3);
  
  return {
    hpDamage: dmg,
    moraleDamage: moraleDmg,
    critical: critical,
  };
}

// ============================================================
// 经验值计算 (Lua WarAddExp)
// ============================================================

/**
 * 计算获得的经验值
 * @param {Object} unit - 获得经验的单位
 * @param {Object} enemy - 被攻击/击杀的敌人
 * @param {boolean} isKill - 是否击杀
 * @returns {number} 获得的经验值
 */
export function warAddExp(unit, enemy, isKill = false) {
  let exp = 0;
  
  // 基础经验：根据敌人等级
  if (enemy && enemy.level) {
    exp = enemy.level * 2;
  } else {
    exp = 5;
  }
  
  // 击杀奖励
  if (isKill) {
    exp += WAR_CONSTANTS.EXP_KILL;
  }
  
  // 等级差修正
  if (enemy && unit.level && enemy.level > unit.level) {
    exp += (enemy.level - unit.level) * 3;
  }
  
  return exp;
}

/**
 * 检查并应用升级
 * @param {Object} unit - 单位对象
 * @returns {boolean} 是否升级
 */
export function checkLevelUp(unit) {
  const expNeeded = WAR_CONSTANTS.EXP_PER_LEVEL * (unit.level - 1) + WAR_CONSTANTS.EXP_PER_LEVEL;
  
  if (unit.exp >= expNeeded) {
    unit.level++;
    unit.exp -= expNeeded;
    
    // 属性成长 (Lua: 随机提升)
    unit.atk += Math.floor(Math.random() * 3) + 1;
    unit.def += Math.floor(Math.random() * 2) + 1;
    unit.maxHp += Math.floor(Math.random() * 5) + 3;
    unit.hp = unit.maxHp; // 升级回满HP
    
    return true;
  }
  
  return false;
}

// ============================================================
// ZOC (Zone of Control) 检测 (Lua CheckZOC)
// ============================================================

/**
 * 检测ZOC（区域控制）
 * 如果移动方向被敌方单位相邻，剩余移动力减为0
 * @param {number} col - 当前列
 * @param {number} row - 当前行
 * @param {number} nextCol - 目标列
 * @param {number} nextRow - 目标行
 * @param {string} side - 移动方阵营 ('player'/'enemy')
 * @param {Array} units - 所有单位
 * @returns {boolean} 是否受到ZOC影响
 */
export function checkZOC(col, row, nextCol, nextRow, side, units) {
  // 获取相邻敌方单位
  const enemies = units.filter(u => 
    u.side !== side && 
    u.hp > 0 && 
    isAdjacent(nextCol, nextRow, u.col, u.row)
  );
  
  return enemies.length > 0;
}

/**
 * 判断两个六角格是否相邻
 */
function isAdjacent(c1, r1, c2, r2) {
  const dist = getHexDist(c1, r1, c2, r2);
  return dist <= 1;
}

/**
 * 六角格距离 (轴向坐标)
 */
function getHexDist(ca, ra, cb, rb) {
  // 转换为立方坐标
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

// ============================================================
// 回合恢复 (Lua WarRest)
// ============================================================

/**
 * 回合开始时恢复HP/MP
 * @param {Object} unit - 单位
 * @param {number} terrainId - 当前地形
 */
export function warRest(unit, terrainId = 0) {
  // HP恢复（山地/树林）
  if (TERRAIN_DEF_MODIFIER[terrainId] !== undefined) {
    // 山地/树林恢复HP
    if (terrainId === 2 || terrainId === 3) {
      const heal = Math.floor(unit.maxHp * 0.1);
      unit.hp = Math.min(unit.maxHp, unit.hp + heal);
    }
  }
  
  // MP恢复（所有单位每回合恢复5点）
  if (unit.maxMp) {
    unit.mp = Math.min(unit.maxMp, unit.mp + 5);
  }
}

// ============================================================
// 攻击范围计算 (Lua War_CalAtkFW)
// ============================================================

/**
 * 计算单位的攻击范围
 * @param {Object} unit - 单位
 * @param {number} range - 攻击距离（默认1）
 * @returns {Array} 可攻击的六角格坐标列表
 */
export function getAtkFW(unit, range = 1) {
  const result = [];
  
  for (let r = -range; r <= range; r++) {
    for (let c = -range; c <= range; c++) {
      const dist = (Math.abs(c) + Math.abs(r) + Math.abs(-c - r)) / 2;
      if (dist > 0 && dist <= range) {
        result.push({
          col: unit.col + c,
          row: unit.row + r,
        });
      }
    }
  }
  
  return result;
}

/**
 * 檢測某位置是否在攻击范围内
 */
export function isInAtkRange(attacker, targetCol, targetRow, range = 1) {
  return getHexDist(attacker.col, attacker.row, targetCol, targetRow) <= range;
}

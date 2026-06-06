// ============================================================
// 三国志英杰传 重制版 - 战斗计算核心
// 翻译自 Lua WarAtkHurt() (jymain.lua:4823) + WarAtk() (jymain.lua:4982)
// ============================================================

import {
  TERRAIN_DEF_MODIFIER,
  bzSuper,
  CLASS_ADVANTAGE_MULT,
  CLASS_DISADVANTAGE_MULT,
  WAR_CONSTANTS,
  limitX,
} from './WarConst.js';

// ==================== 伤害计算核心 ====================
// 翻译自 WarAtkHurt() (jymain.lua:4823-4980)
//
// 参数:
//   attacker: { atk, level, classId, weapon?, atk_buff? }
//   defender: { def, level, classId, maxHp, hp, morale, maxMorale, weapon?, def_buff? }
//   terrainId: 防御方所在地形ID
//   flag: 0=普通攻击, 1=反击, 2=乱射, 3=乱舞
//   enhancement: 是否启用增强模式(特技/buff等)
//   checkSkill: (defenderClassId, skillId) => boolean  特技检查回调
//
// 返回: { hurt, moraleHurt, exp, flag2 }
//   hurt: 伤害值
//   moraleHurt: 士气降低值
//   exp: 获得的经验值
//   flag2: 0=普通, 1=格挡, 2=暴击
export function warAtkHurt(attacker, defender, terrainId, flag = 0, enhancement = false, checkSkill = null) {
  const atk = attacker.atk;
  let def = defender.def;

  // ---- 兵种克制修正 ----
  // 翻译自 jymain.lua:4834-4843
  if (enhancement && attacker.weapon === 10) {
    // 倚天剑：必克制
    def = Math.floor(def * CLASS_ADVANTAGE_MULT);
  } else if (enhancement && defender.weapon === 11) {
    // 青釭剑：不被克制
    def = Math.floor(def * CLASS_DISADVANTAGE_MULT);
  } else if (bzSuper(attacker.classId, defender.classId)) {
    // 兵种克制：防御 * 3/4
    def = Math.floor(def * CLASS_ADVANTAGE_MULT);
  } else if (bzSuper(defender.classId, attacker.classId)) {
    // 兵种被克制：防御 * 5/4
    def = Math.floor(def * CLASS_DISADVANTAGE_MULT);
  }

  // ---- 基本物理杀伤 ----
  // 公式: (攻击方攻击力 - 防御力修正值/2) * (100 - 地形杀伤修正) / 100
  // 翻译自 jymain.lua:4854-4866
  let hurt = atk - def / 2;

  if (enhancement) {
    // 增强模式：使用buff/debuff
    const buffRatio = limitX(100 + (attacker.atk_buff || 0) - (defender.def_buff || 0), 10, 200) / 100;
    hurt = hurt * buffRatio;

    // 藤甲特技：减少伤害
    if (checkSkill && checkSkill(defender.classId, 23)) {
      hurt = hurt * (100 - 30) / 100; // 参数1=30
    }
    // 倾国特技：减少伤害
    if (checkSkill && checkSkill(defender.classId, 47)) {
      hurt = hurt * (100 - 30) / 100; // 参数1=30
    }
  } else {
    // 原版模式：使用地形杀伤修正
    const terrainMod = TERRAIN_DEF_MODIFIER[terrainId] || 0;
    hurt = hurt * (100 - terrainMod) / 100;
  }

  // ---- 反击/乱射/乱舞伤害修正 ----
  // 翻译自 jymain.lua:4867-4871
  if (flag === 1) {
    // 反击：伤害减半
    hurt = hurt / 2;
  } else if (flag === 2 || flag === 3) {
    // 乱射/乱舞：伤害40%
    hurt = hurt * WAR_CONSTANTS.SPREAD_MULT;
  }

  hurt = Math.floor(hurt);

  // ---- 特殊伤害限制 ----
  if (enhancement) {
    // 狼顾特技：伤害不超过最大兵力/5
    if (checkSkill && checkSkill(defender.classId, 43)) {
      if (hurt > defender.maxHp / 5) {
        hurt = Math.floor(defender.maxHp / 5);
      }
    }
    // 青龙偃月刀特技：被攻击时必定格挡
    if (checkSkill && checkSkill(defender.classId, 104)) {
      if (hurt > defender.maxHp / 5) {
        hurt = Math.floor(defender.maxHp / 5);
      }
    }
    // 霸王之剑/暴击特技：攻击时必定暴击
    if (attacker.weapon === 60 || (checkSkill && checkSkill(attacker.classId, 115))) {
      // 拥有藤甲/狼顾/倾国时免疫
      const immuneSkill = (checkSkill && checkSkill(defender.classId, 23)) ||
                          (checkSkill && checkSkill(defender.classId, 43)) ||
                          (checkSkill && checkSkill(defender.classId, 47));
      if (!immuneSkill) {
        if (hurt < defender.hp * 0.4) {
          hurt = Math.floor(defender.hp * 0.4);
        }
      }
    }
  }

  // ---- 最低伤害 ----
  // 翻译自 jymain.lua:4894-4900
  if (hurt < atk / WAR_CONSTANTS.MIN_HURT_RATIO) {
    hurt = Math.floor(atk / WAR_CONSTANTS.MIN_HURT_RATIO);
  }
  if (hurt < 1) {
    hurt = 1;
  }

  // ---- 暴击/格挡判定 ----
  // 翻译自 jymain.lua:4901-4908
  let flag2 = 0; // 0=普通, 1=格挡, 2=暴击
  if (hurt >= defender.maxHp * WAR_CONSTANTS.CRIT_THRESHOLD) {
    flag2 = 2; // 暴击
  } else if (hurt >= defender.hp + defender.maxHp / 5) {
    flag2 = 2; // 暴击（一击致命）
  } else if (hurt <= defender.maxHp * WAR_CONSTANTS.BLOCK_THRESHOLD) {
    flag2 = 1; // 格挡
  }

  // 伤害不超过剩余兵力
  if (hurt > defender.hp) {
    hurt = defender.hp;
  }

  // ---- 士气降幅 ----
  // 翻译自 jymain.lua:4913-4925
  // 士气降幅 = 伤害 / (防御方等级 + 5) / 3
  let moraleHurt = Math.floor(hurt / (defender.level + 5) / 3);
  if (moraleHurt === 0 && hurt > 0) {
    moraleHurt = 1;
  }
  // 三尖刀特技：额外减少士气
  if (enhancement && (attacker.weapon === 14 || (checkSkill && checkSkill(attacker.classId, 113)))) {
    moraleHurt = moraleHurt + 10;
  }
  moraleHurt = limitX(moraleHurt, 0, defender.morale);

  // ---- 经验值计算 ----
  // 翻译自 jymain.lua:4926-4978
  let exp = 0;
  if (attacker.level < WAR_CONSTANTS.MAX_LEVEL) {
    let part1 = 0;
    let part2 = 0;

    if (attacker.level <= defender.level) {
      // 攻击方等级 <= 防御方等级
      // 基本经验值 = (防御方等级 - 攻击方等级 + 3) * 2
      part1 = (defender.level - attacker.level + 3) * 2;
      if (part1 > 16) part1 = 16;
      if (enhancement) {
        part1 = (defender.level - attacker.level + 5) * 2;
        if (part1 > 24) part1 = 24;
      }
    } else {
      // 攻击方等级 > 防御方等级
      part1 = 4;
      if (enhancement) part1 = 8;
    }

    // 击杀奖励经验
    if (hurt === defender.hp) {
      if (defender.isLeader) {
        // 杀死主将
        part2 = 48;
      } else if (defender.level > attacker.level) {
        // 敌军等级高于我军
        part2 = 32;
      } else {
        // 敌军等级低于等于我军
        part2 = Math.floor(64 / (attacker.level - defender.level + 2));
        if (enhancement) {
          part2 = 32 - (attacker.level - defender.level) * 4;
          part2 = limitX(part2, 8, 48);
        }
      }
    }

    exp = part1 + part2;
  }

  return { hurt, moraleHurt, exp, flag2 };
}

// ==================== 经验值获取 + 升级 ====================
// 翻译自 WarAddExp() (jymain.lua:5648-5699)
export function warAddExp(person, exp) {
  if (exp <= 0) return false;
  if (person.level >= WAR_CONSTANTS.MAX_LEVEL) return false;

  const oldExp = person.exp;
  let lvUpFlag = false;
  let overflowExp = 0;

  if (oldExp + exp > WAR_CONSTANTS.EXP_MAX) {
    overflowExp = oldExp + exp - WAR_CONSTANTS.EXP_MAX;
    exp = WAR_CONSTANTS.EXP_MAX - oldExp;
  }

  person.exp = oldExp + exp;

  // 检查升级
  if (person.exp >= WAR_CONSTANTS.EXP_MAX) {
    lvUpFlag = true;
    person.exp = 0;
    person.level = limitX(person.level + 1, 1, WAR_CONSTANTS.MAX_LEVEL);
  }

  // 溢出经验处理
  if (overflowExp > 0) {
    person.exp = overflowExp;
  }

  return lvUpFlag;
}

// ==================== 回合恢复 ====================
// 翻译自 WarRest() (jymain.lua:8918-9046)
export function warRest(person, terrainId, adjacentUnits) {
  let hpRecovery = 0;
  let moraleRecovery = 0;
  let hpTimes = 0;
  let moraleTimes = 0;

  // 地形恢复
  // 村庄(8)和鹿砦(13)：恢复兵力+士气
  // 兵营(14)：恢复兵力
  if (terrainId === 8 || terrainId === 13) {
    hpTimes += 1;
    moraleTimes += 1;
  } else if (terrainId === 14) {
    hpTimes += 1;
  }

  // 道具恢复（TODO: 实现道具系统后补充）

  // 计算恢复量
  if (hpTimes > 0) {
    // 兵力恢复量 = 150 + (0~10之间的随机数) * 10
    hpRecovery = 150 + Math.floor(Math.random() * 11) * 10;
    hpRecovery *= hpTimes;
    // 接近满血时自动补满
    if (person.maxHp - person.hp - hpRecovery < 10) {
      hpRecovery = person.maxHp - person.hp;
    }
  }

  if (moraleTimes > 0) {
    // 士气恢复量 = 统率/10 + (1~5)
    moraleRecovery = Math.floor((person.leadership || 50) / 10) + Math.floor(Math.random() * 5) + 1;
    moraleRecovery *= moraleTimes;
    // 接近上限时自动补满
    if (person.maxMorale - person.morale - moraleRecovery < 10) {
      moraleRecovery = person.maxMorale - person.morale;
    }
  }

  // 军乐队恢复MP
  // 翻译自 jymain.lua:9017-9032
  let mpRecovery = 0;
  if (adjacentUnits) {
    for (const adj of adjacentUnits) {
      // 军乐队(bz=4)或僧兵(bz=13)旁边恢复MP
      if (adj.classId === 4 || adj.classId === 13) {
        mpRecovery += Math.floor(1 + adj.level / 10);
      }
    }
  }

  return {
    hpRecovery: Math.max(0, hpRecovery),
    moraleRecovery: Math.max(0, moraleRecovery),
    mpRecovery: Math.max(0, mpRecovery),
  };
}

// ==================== ZOC检测 ====================
// 翻译自 CheckZOC() (jymain.lua:6792-6808)
// 检查指定位置是否在敌方单位的控制区域内
export function checkZOC(unit, x, y, units) {
  // 强行特技免疫ZOC
  // TODO: 实现特技后补充

  const directions = [
    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
    { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, // 六角格额外方向
  ];

  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    const occupant = units.find(u => u.col === nx && u.row === ny && u.hp > 0);
    if (occupant && occupant.side !== unit.side) {
      return true; // 在敌方ZOC中
    }
  }
  return false;
}

// ==================== 攻击范围计算 ====================
// 翻译自 WarGetAtkFW() (jymain.lua:8512)
// 获取从(x,y)出发、攻击范围为fw的所有可攻击坐标
export function getAtkFW(x, y, atkRange) {
  const result = [];

  // 近战1格（6个相邻格）
  if (atkRange >= 1) {
    const neighbors = [
      [x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y],
      [x + 1, y - 1], [x - 1, y + 1], // 六角格
    ];
    for (const [nx, ny] of neighbors) {
      result.push([nx, ny]);
    }
  }

  // 2格范围（弓兵等远程）
  if (atkRange >= 2) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        // 简化：使用cube距离
        if (dist <= 2 && dist > 1) {
          result.push([x + dx, y + dy]);
        }
      }
    }
  }

  // 3格范围（弩兵等）
  if (atkRange >= 3) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        if (dx === 0 && dy === 0) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (dist <= 3 && dist > 2) {
          result.push([x + dx, y + dy]);
        }
      }
    }
  }

  return result;
}

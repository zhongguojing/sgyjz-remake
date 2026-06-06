// ============================================================
// 三国志英杰传 重制版 - 兵种/地形/常量数据
// 从Lua jymain.lua / jyconfig.lua 翻译
// ============================================================

// 游戏状态
export const GAME_STATE = {
  START: 0,
  SMAP_AUTO: 1,
  SMAP_MANUAL: 2,
  MMAP: 3,
  WMAP: 4,
  WMAP2: 5,
  DEAD: 6,
  END: 7,
  WARWIN: 8,
  WARLOSE: 9,
};

// 地形类型 (与Lua CC.TERRAIN对应)
export const TERRAIN = {
  PLAIN: 0,      // 平地
  WALL: 1,       // 城墙/建筑
  MOUNTAIN: 2,   // 山地
  FOREST: 3,     // 树林
  DESERT: 4,     // 沙漠
  SWAMP: 5,      // 沼泽
  WATER: 6,      // 水域
  BRIDGE: 7,     // 桥梁
  GATE: 8,       // 城门
  CASTLE: 9,     // 城堡
};

export const TERRAIN_NAMES = ['平地', '城墙', '山地', '树林', '沙漠', '沼泽', '水域', '桥梁', '城门', '城堡'];
export const TERRAIN_COLORS = [0x4a7c3f, 0x777777, 0x8B7355, 0x2d5a27, 0xedc9af, 0x708090, 0x4682B4, 0x8B7355, 0x888888, 0x555555];
export const TERRAIN_ICONS = ['', '城', '山', '林', '沙', '沼', '水', '桥', '门', '堡'];

// 地形防御修正 (Lua TERRAIN_DEF_MODIFIER)
export const TERRAIN_DEF_MODIFIER = [
  0,    // 平地 +0%
  30,   // 城墙 +30%
  20,   // 山地 +20%
  10,   // 树林 +10%
  0,    // 沙漠 +0%
  -10,  // 沼泽 -10%
  -20,  // 水域 -20%
  0,    // 桥梁 +0%
  40,   // 城门 +40%
  50,   // 城堡 +50%
];

// 地形恢复效果
export const TERRAIN_RECOVERY = [
  false,  // 平地
  false,  // 城墙
  true,   // 山地 (HP恢复)
  true,   // 树林 (HP恢复)
  false,  // 沙漠
  false,  // 沼泽
  false,  // 水域
  false,  // 桥梁
  false,  // 城门
  false,  // 城堡
];

// 兵种数据 (Lua CLASS_DATA 20种兵种)
export const CLASS_DATA = {
  infantry:     { id:0,  name:'步兵',     atk:25, def:20, mov:3, special:'均衡' },
  cavalry:      { id:1,  name:'骑兵',     atk:30, def:18, mov:4, special:'高机动' },
  archer:       { id:2,  name:'弓兵',     atk:22, def:15, mov:2, special:'远程' },
  mage:         { id:3,  name:'军师',     atk:15, def:12, mov:2, special:'策略' },
  musician:     { id:4,  name:'军乐队',   atk:5,  def:10, mov:2, special:'回MP' },
  transport:    { id:5,  name:'运输队',   atk:5,  def:10, mov:2, special:'补给' },
  knight:       { id:6,  name:'骑士',     atk:28, def:22, mov:4, special:'重装' },
  elephant:     { id:7,  name:'战象',     atk:35, def:25, mov:2, special:'高防' },
  navy:         { id:8,  name:'水军',     atk:22, def:18, mov:3, special:'水战' },
  assassin:     { id:9,  name:'刺客',     atk:32, def:10, mov:4, special:'暴击' },
  monk:         { id:10, name:'武僧',     atk:26, def:20, mov:3, special:'格斗' },
  taoist:       { id:11, name:'道士',     atk:18, def:14, mov:2, special:'法术' },
  imperial:     { id:12, name:'帝王',     atk:40, def:30, mov:3, special:'统帅' },
  general:      { id:13, name:'将军',     atk:35, def:25, mov:3, special:'勇猛' },
  strategist:   { id:14, name:'谋士',     atk:20, def:15, mov:2, special:'智谋' },
  guard:        { id:15, name:'亲卫队',   atk:28, def:28, mov:3, special:'护卫' },
  nomad:        { id:16, name:'游牧骑',   atk:26, def:16, mov:5, special:'游击' },
  crossbow:     { id:17, name:'弩兵',     atk:24, def:14, mov:2, special:'连射' },
  berserker:    { id:18, name:'狂战士',   atk:38, def:15, mov:3, special:'狂暴' },
  hero:         { id:19, name:'英雄',     atk:45, def:35, mov:4, special:'无双' },
};

// 兵种相克 (Lua bzSuper函数，返回攻击倍率)
// 攻击方兵种 -> 防守方兵种 -> 倍率
export const CLASS_ADVANTAGE_mults = {
  cavalry:  { infantry: 1.5 },
  infantry: { archer: 1.5 },
  archer:   { cavalry: 1.5 },
  knight:   { infantry: 1.3, archer: 1.2 },
  assassin: { mage: 1.5, musician: 1.3 },
  // 策略对步兵/骑兵有额外效果
};

// 兵种克制倍率（简化版，与Lua bzSuper一致）
export const CLASS_ADVANTAGE_MULT = 1.5;   // 克制
export const CLASS_DISADVANTAGE_MULT = 0.75; // 被克制

// 兵种地形移动消耗 (Lua CLASS_TERRAIN_COST)
// 兵种id -> 地形id -> 移动消耗
export const CLASS_TERRAIN_COST = {
  0:  [1, 99, 2, 2, 2, 99, 99, 1, 99, 99],  // 步兵
  1:  [1, 99, 99, 2, 3, 99, 99, 1, 99, 99],  // 骑兵
  2:  [1, 99, 2, 1, 2, 99, 99, 1, 99, 99],  // 弓兵
  3:  [1, 99, 2, 2, 2, 99, 99, 1, 99, 99],  // 军师
  4:  [1, 99, 2, 2, 2, 99, 99, 1, 99, 99],  // 军乐队
  5:  [1, 99, 99, 3, 2, 99, 99, 1, 99, 99],  // 运输队
};

// 攻击范围 (Lua ATTACK_RANGE)
export const ATTACK_RANGE = {
  NORMAL: 1,     // 近战
  BOW: 3,        // 弓箭
  MAGIC: 4,      // 魔法
};

// AI类型 (Lua AI_TYPE)
export const AI_TYPE = {
  NORMAL: 0,       // 普通
  DEFENSE: 1,      // 防守
  ATTACK: 2,       // 进攻
  WILD: 3,         // 野蛮
  COWARD: 4,       // 胆小
  BERSERK: 5,      // 狂暴
  ESCORT: 6,       // 护送
};

// 天气 (Lua WEATHER)
export const WEATHER = {
  CLEAR: 0,        // 晴天
  RAIN: 1,         // 雨天
  SNOW: 2,         // 雪天
  FOG: 3,          // 雾天
};

export const WEATHER_NAMES = ['晴天', '雨天', '雪天', '雾天'];

// 战斗行动类型 (Lua WAR_ACTION)
export const WAR_ACTION = {
  MOVE: 0,
  ATTACK: 1,
  MAGIC: 2,
  ITEM: 3,
  WAIT: 4,
  REST: 5,
};

// 战斗常量 (Lua WAR_CONSTANTS)
export const WAR_CONSTANTS = {
  MAX_UNITS: 50,         // 最大单位数
  MAX_TURNS: 50,         // 最大回合数
  EXP_KILL: 20,          // 击杀经验
  EXP_ATTACK: 5,         // 攻击经验
  EXP_BE_ATTACKED: 3,   // 被攻击经验
  EXP_PER_LEVEL: 100,   // 每级所需经验
  ZOC_PENALTY: 0,        // ZOC惩罚（剩余移动力减为0）
  TERRAIN_HP_REC: 10,    // 地形HP恢复量
  TERRAIN_MP_REC: 5,     // 地形MP恢复量
};

// 六角格方向 (扁平顶六边形)
export const HEX_DIRS = [
  { c: 0, r:-1 },  // 上
  { c: 1, r:-1 },  // 右上
  { c: 1, r: 0 },  // 右
  { c: 0, r: 1 },   // 下
  { c:-1, r: 0 },   // 左
  { c:-1, r:-1 },   // 左上
];

// 工具函数：兵种克制判断 (Lua bzSuper)
export function bzSuper(bz1, bz2) {
  // bz1攻击bz2时的倍率
  const adv = CLASS_ADVANTAGE_mults[bz1];
  if (adv && adv[bz2]) {
    return adv[bz2];
  }
  return 1.0;
}

// 工具函数：获取移动消耗
export function getMoveCost(classId, terrainId) {
  const costs = CLASS_TERRAIN_COST[classId];
  if (costs && costs[terrainId] !== undefined) {
    return costs[terrainId];
  }
  return 1; // 默认消耗1
}

// 工具函数：是否地形HP恢复
export function isTerrainHpRecovery(terrainId) {
  return TERRAIN_RECOVERY[terrainId] === true;
}

// 工具函数：坐标限制
export function limitX(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

// 工具函数：数值范围判断
export function between(v, min, max) {
  return v >= min && v <= max;
}

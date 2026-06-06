// ============================================================
// 三国志英杰传 重制版 - 战斗数据模块统一导出
// 从Lua jymain.lua 翻译的数据和逻辑
// ============================================================

// 常量定义
export {
  GAME_STATE,
  TERRAIN,
  TERRAIN_NAMES,
  TERRAIN_COLORS,
  TERRAIN_ICONS,
  TERRAIN_DEF_MODIFIER,
  TERRAIN_RECOVERY,
  CLASS_DATA,
  CLASS_ADVANTAGE_MULT,
  CLASS_DISADVANTAGE_MULT,
  CLASS_TERRAIN_COST,
  CLASS_ADVANTAGE_mults,
  ATTACK_RANGE,
  AI_TYPE,
  WEATHER,
  WEATHER_NAMES,
  WAR_ACTION,
  WAR_CONSTANTS,
  HEX_DIRS,
  bzSuper,
  getMoveCost,
  isTerrainHpRecovery,
  limitX,
  between,
} from './WarConst.js';

// 战斗计算
export {
  warAtkHurt,
  warAddExp,
  checkLevelUp,
  checkZOC,
  warRest,
  getAtkFW,
  isInAtkRange,
} from './WarCalc.js';

// 移动系统
export {
  getMoveRange,
  searchMovePath,
  getHexNeighbors,
  getHexDist,
} from './WarMove.js';

// 策略系统
export {
  MAGIC_TYPE,
  EFFECT_RANGE,
  MAGIC_DATA,
  warMagicHitRatio,
  warMagicHurt,
  warMagicCheck,
  getAvailableMagics,
} from './WarMagic.js';

// ============================================================
// 三国志英杰传 重制版 - AI系统
// 翻译自 Lua AI() (jymain.lua:7254) + AI_Sub() (jymain.lua:7434)
//       + WarGetMoveValue() (jymain.lua:8042)
// ============================================================

import {
  TERRAIN_NAMES,
  TERRAIN_DEF_MODIFIER,
  AI_TYPE,
  WAR_CONSTANTS,
  limitX,
  between,
  isTerrainHpRecovery,
  isTerrainMoraleRecovery,
  bzSuper,
  getMoveCost,
} from './WarConst.js';
import { warAtkHurt, getAtkFW } from './WarCalc.js';
import { calMoveStep, canExistXY } from './WarMove.js';

// ==================== AI总调度 ====================
// 翻译自 AI() (jymain.lua:7254-7377)
//
// 行动优先级：
// 1. 处于恢复性地形(村庄/鹿砦/兵营)的部队优先行动
// 2. 兵力不足(<40%)或士气低(<40)的部队优先行动
// 3. 其余部队按序行动
//
// 先处理友军，再处理敌军
export function runAI(warUnits, terrainMap, mapWidth, mapHeight, isFriendlyFirst = false) {
  const actions = []; // 收集所有AI行动指令

  // 分离友军和敌军
  const friendUnits = warUnits.filter(u => u.hp > 0 && u.isFriend && u.active && !u.confused);
  const enemyUnits = warUnits.filter(u => u.hp > 0 && u.isEnemy && u.active && !u.confused);

  // 处理友军
  processAIGroup(friendUnits, warUnits, terrainMap, mapWidth, mapHeight, actions);

  // 处理敌军
  processAIGroup(enemyUnits, warUnits, terrainMap, mapWidth, mapHeight, actions);

  return actions;
}

function processAIGroup(groupUnits, allUnits, terrainMap, mapWidth, mapHeight, actions) {
  const active = groupUnits.filter(u => u.active && !u.confused);

  // 第1优先级：恢复性地形上的部队
  for (const unit of active) {
    const terrainId = terrainMap[unit.row]?.[unit.col];
    if (terrainId === 8 || terrainId === 13 || terrainId === 14) {
      const action = aiSub(unit, allUnits, terrainMap, mapWidth, mapHeight);
      if (action) actions.push(action);
      unit.active = false;
    }
  }

  // 第2优先级：兵力不足或士气低
  for (const unit of active) {
    if (!unit.active) continue;
    if (unit.hp / unit.maxHp <= WAR_CONSTANTS.WEAK_HP_RATIO || unit.morale <= WAR_CONSTANTS.WEAK_MORALE) {
      const action = aiSub(unit, allUnits, terrainMap, mapWidth, mapHeight);
      if (action) actions.push(action);
      unit.active = false;
    }
  }

  // 第3优先级：其余部队
  for (const unit of active) {
    if (!unit.active) continue;
    const action = aiSub(unit, allUnits, terrainMap, mapWidth, mapHeight);
    if (action) actions.push(action);
    unit.active = false;
  }
}

// ==================== AI个体决策 ====================
// 翻译自 AI_Sub() (jymain.lua:7434-8041)
//
// AI类型：
// 0=被动出击型: 原地不动，敌人进入攻击范围后移动攻击
// 1=主动出击型: 主动移动并攻击
// 2=坚守原地型: 原地不动，受攻击也不移动
// 3=追击指定目标: 朝指定目标移动
// 4=移动到目的+攻击
// 5=向目标无攻击移动
// 6=移动到某点不攻击
//
// 返回: AIAction { unitId, type, targetCol, targetRow, attackTarget?, magicTarget? }
export function aiSub(unit, allUnits, terrainMap, mapWidth, mapHeight) {
  const aiType = unit.aiType || AI_TYPE.AGGRESSIVE; // 默认主动出击
  const moveStep = unit.moveStep || unit.mov || 3;

  // ---- 计算移动范围内所有可达位置的行动价值 ----
  let bestPos = { col: unit.col, row: unit.row };
  let bestValue = 0;
  let bestAction = null; // 'attack', 'magic', 'wait'

  // 追击目标消失时降级为主动出击
  let effectiveAI = aiType;
  if (aiType === AI_TYPE.PURSUE) {
    const target = allUnits.find(u => u.warId === unit.aiTarget && u.hp > 0);
    if (!target) effectiveAI = AI_TYPE.AGGRESSIVE;
  }

  // 坚守原地型（type 2）：只评估当前位置的行动价值
  if (effectiveAI === AI_TYPE.HOLD) {
    const atkValue = evaluateAtkAtPosition(unit, unit.col, unit.row, allUnits, terrainMap);
    const magicValue = evaluateMagicAtPosition(unit, unit.col, unit.row, allUnits, terrainMap);
    bestValue = Math.max(atkValue.value, magicValue.value);
    if (atkValue.value >= magicValue.value && atkValue.value > 0) {
      bestAction = { type: 'attack', target: atkValue.target };
    } else if (magicValue.value > 0) {
      bestAction = { type: 'magic', target: magicValue.target, magicId: magicValue.magicId };
    }
  } else {
    // 其他AI类型：评估移动范围内所有位置
    const stepArray = calMoveStep(unit, moveStep, terrainMap, allUnits, mapWidth, mapHeight);

    for (let step = 0; step <= moveStep; step++) {
      for (const pos of stepArray[step].positions) {
        // 该位置是否可以停留
        if (!canExistXY(pos.col, pos.row, unit, allUnits)) continue;
        // 除了起点外，不能和已有单位重叠
        if (pos.col !== unit.col || pos.row !== unit.row) {
          if (allUnits.some(u => u.col === pos.col && u.row === pos.row && u.hp > 0 && u !== unit)) continue;
        }

        const moveValue = getMoveValue(unit, pos.col, pos.row, allUnits, terrainMap, mapWidth, mapHeight, effectiveAI);

        if (moveValue.value > bestValue) {
          bestValue = moveValue.value;
          bestPos = { col: pos.col, row: pos.row };
          bestAction = moveValue.action;
        }
      }
    }

    // 如果最佳价值为0且AI不是无攻击型，考虑原地待命
    if (bestValue === 0) {
      bestAction = { type: 'wait' };
    }
  }

  // 构建返回行动
  const result = {
    unitId: unit.warId || unit.id,
    type: bestAction?.type || 'wait',
    moveTarget: bestPos,
  };

  if (bestAction?.type === 'attack') {
    result.attackTarget = bestAction.target.warId || bestAction.target.id;
  } else if (bestAction?.type === 'magic') {
    result.magicTarget = bestAction.target.warId || bestAction.target.id;
    result.magicId = bestAction.magicId;
  }

  return result;
}

// ==================== 移动价值评估 ====================
// 翻译自 WarGetMoveValue() (jymain.lua:8042-8135)
//
// 评估unit移动到(x,y)位置的行动价值
// 价值 = max(物理攻击价值, 策略攻击价值) + 地形加成 + AI目标加权 + 残血恢复优先
function getMoveValue(unit, x, y, allUnits, terrainMap, mapWidth, mapHeight, aiType) {
  let value = 0;
  let bestAction = null;

  // 无攻击移动类型
  if (aiType === AI_TYPE.MOVE_NOATK || aiType === AI_TYPE.MOVE_HOLD) {
    value = 0;
  } else {
    // 物理攻击价值
    const atkValue = evaluateAtkAtPosition(unit, x, y, allUnits, terrainMap);
    // 策略攻击价值
    const magicValue = evaluateMagicAtPosition(unit, x, y, allUnits, terrainMap);

    if (atkValue.value >= magicValue.value) {
      value = atkValue.value;
      if (atkValue.value > 0) bestAction = { type: 'attack', target: atkValue.target };
    } else {
      value = magicValue.value;
      if (magicValue.value > 0) bestAction = { type: 'magic', target: magicValue.target, magicId: magicValue.magicId };
    }
  }

  // 地形加成
  const terrainId = terrainMap[y]?.[x] || 0;
  if (value > 0) {
    // 防御性地形额外加分
    if (terrainId === 1) value += 8;       // 森林
    else if (terrainId === 2) value += 10;  // 山地
    else if (terrainId === 7) value += 2;   // 草原
    else if (terrainId === 8) value += 7;   // 村庄 (5+2)
    else if (terrainId === 13) value += 17; // 鹿砦 (12+5)
    else if (terrainId === 14) value += 9;  // 兵营 (4+5)
  }

  // AI目标加权
  if (aiType === AI_TYPE.PURSUE || aiType === AI_TYPE.MOVE_NOATK) {
    const target = allUnits.find(u => u.warId === unit.aiTarget && u.hp > 0);
    if (target) {
      value += 5 * (unit.moveStep - Math.abs(target.col - x) - Math.abs(target.row - y));
    }
  } else if (aiType === AI_TYPE.MOVE_ATTACK || aiType === AI_TYPE.MOVE_HOLD) {
    if (unit.aiDx !== undefined && unit.aiDy !== undefined) {
      value += 5 * (unit.moveStep - Math.abs(unit.aiDx - x) - Math.abs(unit.aiDy - y));
    }
  }

  // 残血恢复优先
  if (unit.hp / unit.maxHp <= WAR_CONSTANTS.WEAK_HP_RATIO || unit.morale <= WAR_CONSTANTS.WEAK_MORALE) {
    if (isTerrainHpRecovery(terrainId) || isTerrainMoraleRecovery(terrainId)) {
      value += 50;
    }
  }

  return { value, action: bestAction };
}

// ==================== 物理攻击价值评估 ====================
// 翻译自 WarGetAtkValue() (jymain.lua:8478-8511)
function evaluateAtkAtPosition(unit, x, y, allUnits, terrainMap) {
  const atkRange = unit.atkRange || 1;
  const atkPositions = getAtkFW(x, y, atkRange);
  let bestValue = 0;
  let bestTarget = null;

  for (const [ax, ay] of atkPositions) {
    const target = allUnits.find(u => u.col === ax && u.row === ay && u.hp > 0 && u.side !== unit.side);
    if (!target) continue;

    // 计算对该目标的攻击价值
    let v = 0;
    const terrainId = terrainMap[ay]?.[ax] || 0;

    // 使用伤害公式预估伤害
    const result = warAtkHurt(
      { atk: unit.atk, level: unit.level, classId: unit.classId },
      { def: target.def, level: target.level, classId: target.classId, maxHp: target.maxHp, hp: target.hp, morale: target.morale },
      terrainId
    );

    // 价值 = 伤害/10 + 击杀奖励
    v = Math.floor(result.hurt / 10);
    if (result.hurt >= target.hp) {
      v += 50; // 击杀高价值
      if (target.isLeader) v += 30; // 主将额外价值
    }

    // 等级差修正
    if (target.level > unit.level) v += (target.level - unit.level) * 2;

    if (v > bestValue) {
      bestValue = v;
      bestTarget = target;
    }
  }

  return { value: bestValue, target: bestTarget };
}

// ==================== 策略攻击价值评估 ====================
// 翻译自 WarGetMagicValue() (jymain.lua:8249-8293)
function evaluateMagicAtPosition(unit, x, y, allUnits, terrainMap) {
  // TODO: 完整实现需要策略数据
  // 简化版本：军师/策士类单位优先使用策略
  if (unit.classId !== 3 && unit.classId !== 16 && unit.classId !== 17) {
    return { value: 0, target: null, magicId: null };
  }

  if ((unit.mp || 0) < 5) return { value: 0, target: null, magicId: null };

  // 简化：评估策略范围内敌方目标
  let bestValue = 0;
  let bestTarget = null;
  let bestMagicId = 1; // 默认火计

  const strategyRange = 2;
  for (const target of allUnits) {
    if (target.side === unit.side || target.hp <= 0) continue;
    const dist = Math.max(Math.abs(target.col - x), Math.abs(target.row - y));
    if (dist > strategyRange) continue;

    let v = 20; // 基础策略价值
    if (target.hp / target.maxHp <= 0.3) v += 30; // 低血量高价值

    if (v > bestValue) {
      bestValue = v;
      bestTarget = target;
    }
  }

  return { value: bestValue, target: bestTarget, magicId: bestMagicId };
}

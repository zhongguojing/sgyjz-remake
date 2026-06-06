// ============================================================
// 三国志英杰传 重制版 - 战斗场景
// 集成Lua翻译模块（伤害计算/移动范围/AI/策略）
// ============================================================

import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.js';
import {
  TERRAIN_NAMES, TERRAIN_COLORS, TERRAIN_ICONS, TERRAIN_DEF_MODIFIER,
  CLASS_DATA, WAR_CONSTANTS, bzSuper,
  warAtkHurt, warAddExp, checkLevelUp, warRest,
  getMoveRange, getHexNeighbors, getHexDist,
  MAGIC_DATA, warMagicCheck, getAvailableMagics,
} from '../data/index.js';

// ============================================================
// BattleScene - 战斗场景（使用Lua翻译逻辑）
// ============================================================

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // 地图参数
    this.hexSize = 26;
    this.mapCols = 12;
    this.mapRows = 10;
    this.mapOffsetX = 40;
    this.mapOffsetY = 65;
    
    // 游戏状态
    this.units = [];
    this.tiles = [];
    this.selectedUnit = null;
    this.moveRange = [];
    this.turn = 'player';
    this.turnCount = 1;
    this.actedUnits = [];
    
    // 地形地图 (0=平地 1=城墙 2=山地 3=树林)
    this.terrain = [];
  }
  
  create() {
    this.cameras.main.setBackgroundColor('#0d1b2a');
    
    this.hexWidth = this.hexSize * 2;
    this.hexHeight = Math.sqrt(3) * this.hexSize;
    
    // 生成地形和地图
    this.generateTerrain();
    this.drawHexMap();
    
    // 创建汜水关之战初始单位
    this.createWarUnits();
    
    // 创建UI
    this.createUI();
    
    // 显示回合数提示
    this.showTurnNotice();
  }
  
  // ============================================================
  // 地形生成
  // ============================================================
  
  generateTerrain() {
    this.terrain = [];
    for (let y = 0; y < this.mapRows; y++) {
      this.terrain[y] = [];
      for (let x = 0; x < this.mapCols; x++) {
        if (x === 0 || x === this.mapCols - 1 || y === 0 || y === this.mapRows - 1) {
          this.terrain[y][x] = 1; // 城墙
        } else {
          const r = Math.random();
          this.terrain[y][x] = r < 0.12 ? 2 : r < 0.24 ? 3 : 0;
        }
      }
    }
  }
  
  // ============================================================
  // 六角格地图渲染
  // ============================================================
  
  drawHexMap() {
    this.tiles = [];
    for (let y = 0; y < this.mapRows; y++) {
      for (let x = 0; x < this.mapCols; x++) {
        const pos = this.hexToPixel(x, y);
        const tile = this.createHexTile(pos.x, pos.y, x, y);
        this.tiles.push(tile);
      }
    }
  }
  
  hexToPixel(col, row) {
    return {
      x: this.mapOffsetX + this.hexWidth * 0.75 * col,
      y: this.mapOffsetY + this.hexHeight * (row + 0.5 * (col % 2)),
    };
  }
  
  getHexPoints(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i);
      pts.push(cx + size * Math.cos(a), cy + size * Math.sin(a));
    }
    return pts;
  }
  
  createHexTile(x, y, col, row) {
    const tt = this.terrain[row][col];
    const color = TERRAIN_COLORS[tt] || 0x4a7c3f;
    const pts = this.getHexPoints(x, y, this.hexSize);
    
    const hex = this.add.polygon(0, 0, pts, color)
      .setStrokeStyle(1, 0x333333)
      .setOrigin(0)
      .setDepth(1);
    
    // 地形图标
    const icons = TERRAIN_ICONS;
    if (icons[tt]) {
      this.add.text(x, y, icons[tt], {
        font: '11px Arial',
        fill: '#fff',
        alpha: 0.5,
      }).setOrigin(0.5).setDepth(2);
    }
    
    // 点击区域
    const hit = this.add.circle(x, y, this.hexSize * 0.75, 0, 0)
      .setInteractive()
      .setDepth(3);
    
    hit.hexRef = hex;
    hit.col = col;
    hit.row = row;
    
    hit.on('pointerdown', () => this.onTileClick(col, row));
    hit.on('pointerover', () => {
      if (!hex._hl) hex.setStrokeStyle(2, 0x888);
    });
    hit.on('pointerout', () => {
      if (!hex._hl) hex.setStrokeStyle(1, 0x333);
    });
    
    Object.assign(hex, {
      col,
      row,
      terrainType: tt,
      isBlocked: tt === 1,
      _hl: false,
    });
    
    return hex;
  }
  
  getTerrainName(t) {
    return TERRAIN_NAMES[t] || '平地';
  }
  
  // ============================================================
  // 单位创建（使用Lua翻译的兵种数据）
  // ============================================================
  
  createWarUnits() {
    // 汜水关之战 初始配置
    this.createUnit(1, 4, '刘备', 'player', 0x2196F3, 'infantry', 28, 100, 4, 0, 1);
    this.createUnit(2, 4, '关羽', 'player', 0x2196F3, 'infantry', 30, 100, 4, 1, 1);
    this.createUnit(2, 5, '张飞', 'player', 0x2196F3, 'infantry', 26, 100, 3, 2, 1);
    this.createUnit(1, 5, '诸葛亮', 'player', 0x2196F3, 'mage', 22, 80, 2, 4, 3);
    
    this.createUnit(9, 4, '华雄', 'enemy', 0xf44336, 'infantry', 32, 120, 4, 34, 5);
    this.createUnit(8, 3, '李肃', 'enemy', 0xf44336, 'infantry', 18, 60, 3, 35, 3);
    this.createUnit(8, 5, '步兵', 'enemy', 0xf44336, 'infantry', 16, 50, 3, -1, 1);
    this.createUnit(9, 5, '弓手', 'enemy', 0xf44336, 'archer', 16, 50, 2, -1, 1);
  }
  
  createUnit(col, row, name, side, color, classType, atk, hp, mov, faceId, level = 1) {
    const pos = this.hexToPixel(col, row);
    const unit = this.add.container(pos.x, pos.y).setDepth(10);
    
    // 使用Lua翻译的兵种数据
    const cls = CLASS_DATA[classType] || CLASS_DATA.infantry;
    
    // 头像
    const faceKey = faceId >= 0 ? `face_${faceId}` : null;
    let faceImg = null;
    
    if (faceKey && this.textures.exists(faceKey)) {
      faceImg = this.add.image(0, -4, faceKey).setDisplaySize(32, 40);
      faceImg.setInteractive();
      faceImg.on('pointerdown', () => this.onUnitClick(unit));
    } else {
      faceImg = this.add.circle(0, 0, 18, color, 0.85)
        .setStrokeStyle(2, side === 'player' ? 0x64b5f6 : 0xef9a9a);
      faceImg.setInteractive();
      faceImg.on('pointerdown', () => this.onUnitClick(unit));
    }
    
    // 兵种标签
    const classLabel = this.add.text(0, -30, cls.name.substring(0, 1), {
      font: '9px Arial',
      fill: '#fff',
      stroke: '#000',
      strokeThickness: 1,
      backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5).setAlpha(0.9);
    
    // 名字
    const label = this.add.text(0, 23, name.slice(0, 3), {
      font: '10px Arial',
      fill: '#fff',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    
    // HP条
    const hpBg = this.add.rectangle(0, -22, 30, 3, 0x000, 0.6).setOrigin(0.5);
    const hpBar = this.add.rectangle(-15, -22, 30, 3, side === 'player' ? 0x4caf50 : 0xf44336)
      .setOrigin(0, 0.5);
    
    // MP条（策略单位）
    const mpBar = this.add.rectangle(-15, -20, 30, 2, 0x9c27b0).setOrigin(0, 0.5);
    mpBar.visible = (classType === 'mage');
    
    unit.add([faceImg, classLabel, label, hpBg, hpBar, mpBar]);
    
    // 单位数据（使用Lua翻译的数据结构）
    Object.assign(unit, {
      col,
      row,
      name,
      side,
      hp,
      maxHp: hp,
      mp: 30,
      maxMp: 30,
      atk,
      def: cls.def,
      mov,
      classType,
      level,
      exp: 0,
      int: 20, // 智力（策略命中率相关）
      morale: 100,
      acted: false,
      confused: false,
      circle: faceImg,
      hpBar,
      mpBar,
      classLabel,
    });
    
    this.units.push(unit);
    return unit;
  }
  
  updateHpBar(u) {
    const pct = Math.max(0, u.hp / u.maxHp);
    u.hpBar.width = 30 * pct;
    u.hpBar.x = -15;
  }
  
  updateMpBar(u) {
    if (!u.mpBar) return;
    const pct = Math.max(0, u.mp / u.maxMp);
    u.mpBar.width = 30 * pct;
    u.mpBar.x = -15;
    u.mpBar.visible = (u.classType === 'mage');
  }
  
  // ============================================================
  // 点击处理
  // ============================================================
  
  onTileClick(col, row) {
    if (this.actionMenu) {
      this.closeActionMenu();
    }
    
    // 移动单位
    if (this.selectedUnit && this.isInMoveRange(col, row)) {
      this.moveUnit(this.selectedUnit, col, row);
      return;
    }
    
    // 选择单位
    const u = this.getUnitAt(col, row);
    if (u && u.side === this.turn && !u.acted) {
      this.selectUnit(u);
    } else {
      this.clearSelection();
    }
  }
  
  onUnitClick(unit) {
    if (this.actionMenu) {
      this.closeActionMenu();
    }
    
    // 选择我方单位
    if (unit.side === this.turn && !unit.acted) {
      this.selectUnit(unit);
    }
    // 攻击敌方单位
    else if (this.selectedUnit) {
      this.tryAttack(this.selectedUnit, unit);
    }
  }
  
  selectUnit(unit) {
    this.clearSelection();
    this.selectedUnit = unit;
    
    // 高亮选中单位
    if (unit.circle instanceof Phaser.GameObjects.Image) {
      unit.circle.setTint(0xffffaa);
    } else {
      unit.circle.setStrokeStyle(3, 0xffff00);
    }
    
    // 计算移动范围（使用Lua翻译的BFS算法）
    this.moveRange = getMoveRange(unit, this.terrain, this.units, false);
    this.highlight(this.moveRange, 0x66bb6a);
  }
  
  clearSelection() {
    this.clearHL();
    this.selectedUnit = null;
    this.moveRange = [];
  }
  
  // ============================================================
  // 移动范围计算（使用Lua翻译模块）
  // ============================================================
  
  isInMoveRange(c, r) {
    return this.moveRange.some(m => m.col === c && m.row === r);
  }
  
  getUnitAt(c, r) {
    return this.units.find(u => u.col === c && u.row === r && u.hp > 0);
  }
  
  isOccupied(c, r) {
    return this.units.some(u => u.col === c && u.row === r && u.hp > 0);
  }
  
  // ============================================================
  // 单位移动
  // ============================================================
  
  moveUnit(unit, col, row) {
    const pos = this.hexToPixel(col, row);
    
    this.tweens.add({
      targets: unit,
      x: pos.x,
      y: pos.y,
      duration: 300,
      onComplete: () => {
        unit.col = col;
        unit.row = row;
        this.clearSelection();
        
        // 移动后显示行动菜单
        this.showActionMenu(unit);
      },
    });
  }
  
  // ============================================================
  // 行动菜单
  // ============================================================
  
  showActionMenu(unit) {
    this.closeActionMenu();
    
    const enemiesInRange = this.getEnemiesInAttackRange(unit);
    const canAttack = enemiesInRange.length > 0;
    const canUseMagic = (unit.classType === 'mage' || unit.classType === 'strategist') && unit.mp >= 5;
    
    const menuItems = [];
    
    if (canAttack) {
      menuItems.push({ text: '攻击', color: 0xf44336, action: () => this.enterAttackMode(unit) });
    }
    if (canUseMagic) {
      menuItems.push({ text: '策略', color: 0x9c27b0, action: () => this.enterMagicMode(unit) });
    }
    menuItems.push({ text: '待机', color: 0x888888, action: () => this.unitActed(unit) });
    
    const menuWidth = menuItems.length * 60 + 20;
    const menuH = 36;
    const menuX = Math.min(Math.max(unit.x - menuWidth / 2, 5), this.cameras.main.width - menuWidth - 5);
    const menuY = unit.y - 50;
    
    this.actionMenu = this.add.container(menuX, menuY).setDepth(200);
    const bg = this.add.rectangle(menuWidth / 2, menuH / 2, menuWidth, menuH, 0x000000, 0.85)
      .setStrokeStyle(1, 0xc9a84c);
    this.actionMenu.add(bg);
    
    menuItems.forEach((item, i) => {
      const bx = 10 + i * 60 + 30;
      const btn = this.add.rectangle(bx, menuH / 2, 56, 30, item.color, 0.7)
        .setStrokeStyle(1, 0xffffff);
      btn.setInteractive({ useHandCursor: true });
      
      const txt = this.add.text(bx, menuH / 2, item.text, {
        font: '13px Arial',
        fill: '#fff',
      }).setOrigin(0.5);
      
      btn.on('pointerover', () => btn.setFill(item.color));
      btn.on('pointerout', () => btn.setFill(item.color, 0.7));
      btn.on('pointerdown', () => {
        this.closeActionMenu();
        item.action();
      });
      
      this.actionMenu.add([btn, txt]);
    });
  }
  
  closeActionMenu() {
    if (this.actionMenu) {
      this.actionMenu.destroy();
      this.actionMenu = null;
    }
  }
  
  getEnemiesInAttackRange(unit) {
    return this.units.filter(u => 
      u.side !== unit.side && 
      u.hp > 0 && 
      this.canAttack(unit, u)
    );
  }
  
  canAttack(attacker, defender) {
    const dist = getHexDist(attacker.col, attacker.row, defender.col, defender.row);
    return dist <= 1;
  }
  
  // ============================================================
  // 攻击模式（使用Lua翻译的伤害计算）
  // ============================================================
  
  enterAttackMode(unit) {
    const enemies = this.getEnemiesInAttackRange(unit);
    this.attackModeEnemies = enemies;
    
    enemies.forEach(e => {
      e.circle.setStrokeStyle(3, 0xff0000);
      e._attackMode = true;
    });
    
    this.showFloat('点击敌方单位进行攻击（点空白处取消）', 0xffcc00);
    
    this._attackMode = true;
    this._attackModeUnit = unit;
    
    // 临时覆盖点击处理
    this.input.once('pointerdown', (pointer) => {
      this.cleanupAttackMode();
    });
  }
  
  cleanupAttackMode() {
    if (this._attackModeEnemies) {
      this._attackModeEnemies.forEach(e => {
        if (e.active) {
          e.circle.setStrokeStyle(2, e.side === 'player' ? 0x64b5f6 : 0xef9a9a);
        }
      });
    }
    this._attackMode = false;
    this._attackModeUnit = null;
    this._attackModeEnemies = null;
  }
  
  // ============================================================
  // 攻击处理（使用Lua翻译的warAtkHurt）
  // ============================================================
  
  tryAttack(attacker, defender) {
    // 清理攻击模式
    if (this._attackMode) {
      this.cleanupAttackMode();
    }
    
    // 距离检查
    if (getHexDist(attacker.col, attacker.row, defender.col, defender.row) > 1) {
      this.showFloat('不在攻击范围内！', 0xff6666);
      return;
    }
    
    // 使用Lua翻译的伤害计算
    const terrainId = this.terrain[defender.row][defender.col];
    const result = warAtkHurt(attacker, defender, terrainId);
    
    const dmg = result.hpDamage;
    defender.hp = Math.max(0, defender.hp - dmg);
    
    // 获得经验（使用Lua翻译的经验计算）
    if (defender.hp <= 0) {
      const exp = warAddExp(attacker, defender, true);
      attacker.exp += exp;
      checkLevelUp(attacker);
      this.showFloat(`${attacker.name} 获得 ${exp} 经验`, 0x66ff66);
    } else {
      attacker.exp += warAddExp(attacker, defender, false);
    }
    
    // 飘字动画
    const pos = this.hexToPixel(defender.col, defender.row);
    this.showDmg(pos.x, pos.y - 25, dmg);
    
    // 兵种克制提示
    const advMult = bzSuper(attacker.classType, defender.classType);
    if (advMult > 1) {
      this.showFloat('兵种优势！', 0x66ff66);
    }
    
    // 受击闪烁
    this.tweens.add({
      targets: defender,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 3,
      onComplete: () => { defender.alpha = 1; },
    });
    
    this.updateHpBar(defender);
    
    // 检查死亡
    if (defender.hp <= 0) {
      this.time.delayedCall(400, () => {
        this.units = this.units.filter(u => u !== defender);
        defender.destroy();
        this.checkEnd();
      });
    }
    
    // 攻击后待机
    this.unitActed(attacker);
  }
  
  // ============================================================
  // 策略模式（使用Lua翻译的策略系统）
  // ============================================================
  
  enterMagicMode(unit) {
    const availableMagics = getAvailableMagics(unit);
    
    if (availableMagics.length === 0) {
      this.showFloat('没有可用的策略！', 0xff6666);
      return;
    }
    
    // TODO: 显示策略选择菜单
    this.showFloat('策略功能开发中...', 0xffcc00);
    this.time.delayedCall(1000, () => this.unitActed(unit));
  }
  
  // ============================================================
  // 经验值系统（使用Lua翻译的checkLevelUp）
  // ============================================================
  
  addExp(unit, amount) {
    unit.exp += amount;
    if (checkLevelUp(unit)) {
      this.showFloat(`${unit.name} 升级到 Lv${unit.level}！`, 0x66ff66);
      this.updateHpBar(unit);
    }
  }
  
  // ============================================================
  // 单位行动管理
  // ============================================================
  
  unitActed(unit) {
    unit.acted = true;
    this.clearSelection();
    this.closeActionMenu();
    
    // 每回合回复MP
    if (unit.classType === 'mage' || unit.classType === 'strategist') {
      unit.mp = Math.min(unit.maxMp, unit.mp + 5);
      this.updateMpBar(unit);
    }
    
    // 检查是否所有单位都已行动
    const allActed = this.units
      .filter(u => u.side === this.turn && u.hp > 0)
      .every(u => u.acted);
    
    if (allActed) {
      this.time.delayedCall(600, () => this.endTurn());
    }
  }
  
  endTurn() {
    if (this.turn === 'player') {
      this.turn = 'enemy';
      this.turnCount++;
      this.resetActed();
      this.showTurnNotice();
      
      // 敌方AI（使用Lua翻译的AI逻辑）
      this.time.delayedCall(1000, () => this.runEnemyAI());
    } else {
      this.turn = 'player';
      this.resetActed();
      this.showTurnNotice();
    }
  }
  
  resetActed() {
    this.units.forEach(u => {
      if (u.side === this.turn) {
        u.acted = false;
        // 回合恢复（使用Lua翻译的warRest）
        warRest(u, this.terrain[u.row] ? this.terrain[u.row][u.col] : 0);
        this.updateHpBar(u);
        this.updateMpBar(u);
      }
    });
  }
  
  // ============================================================
  // 敌方AI（简化版，完整版需要使用WarAI.js）
  // ============================================================
  
  runEnemyAI() {
    const enemies = this.units.filter(u => u.side === 'enemy' && u.hp > 0);
    let delay = 0;
    
    enemies.forEach((unit, idx) => {
      this.time.delayedCall(delay, () => {
        if (unit.hp <= 0) return;
        this.aiAction(unit);
      });
      delay += 800;
    });
    
    // 所有敌人行动完毕后切换回我方
    this.time.delayedCall(delay + 600, () => {
      if (this.turn === 'enemy') {
        this.endTurn();
      }
    });
  }
  
  aiAction(unit) {
    // 找最近的玩家单位
    const players = this.units.filter(u => u.side === 'player' && u.hp > 0);
    if (players.length === 0) return;
    
    // 优先攻击范围内血量最少的敌人
    let target = null;
    let minDist = 99;
    
    for (const p of players) {
      const d = getHexDist(unit.col, unit.row, p.col, p.row);
      if (d <= 1 && p.hp < (target ? target.hp : 999)) {
        target = p;
      }
      if (d < minDist) minDist = d;
    }
    
    if (target) {
      // 攻击！
      this.aiAttack(unit, target);
      return;
    }
    
    // 向最近的玩家移动
    let closest = null;
    let closestDist = 99;
    for (const p of players) {
      const d = getHexDist(unit.col, unit.row, p.col, p.row);
      if (d < closestDist) {
        closestDist = d;
        closest = p;
      }
    }
    
    if (closest) {
      // 计算移动范围，向目标移动
      const range = getMoveRange(unit, this.terrain, this.units, false);
      if (range.length > 0) {
        // 找移动范围内离目标最近的位置
        let best = null;
        let bestDist = 99;
        for (const r of range) {
          const d = getHexDist(r.col, r.row, closest.col, closest.row);
          if (d < bestDist) {
            bestDist = d;
            best = r;
          }
        }
        
        if (best) {
          const pos = this.hexToPixel(best.col, best.row);
          this.tweens.add({
            targets: unit,
            x: pos.x,
            y: pos.y,
            duration: 400,
            onComplete: () => {
              unit.col = best.col;
              unit.row = best.row;
              
              // 移动后看能不能攻击
              const canAtk = this.units
                .filter(u => u.side === 'player' && u.hp > 0)
                .some(p => this.canAttack(unit, p));
              
              if (canAtk) {
                const t = this.units
                  .filter(u => u.side === 'player' && u.hp > 0)
                  .find(p => this.canAttack(unit, p));
                if (t) this.aiAttack(unit, t);
              }
              
              unit.acted = true;
            },
          });
          return;
        }
      }
    }
    
    // 什么都不做，待机
    unit.acted = true;
  }
  
  aiAttack(attacker, defender) {
    // 使用Lua翻译的伤害计算
    const terrainId = this.terrain[defender.row][defender.col];
    const result = warAtkHurt(attacker, defender, terrainId);
    
    const dmg = result.hpDamage;
    defender.hp = Math.max(0, defender.hp - dmg);
    this.updateHpBar(defender);
    
    // 飘字
    const pos = this.hexToPixel(defender.col, defender.row);
    this.showDmg(pos.x, pos.y - 25, dmg);
    
    if (defender.hp <= 0) {
      this.time.delayedCall(300, () => {
        this.units = this.units.filter(u => u !== defender);
        defender.destroy();
        this.checkEnd();
      });
    }
    
    attacker.acted = true;
  }
  
  // ============================================================
  // 胜利/失败判定
  // ============================================================
  
  checkEnd() {
    const e = this.units.filter(u => u.side === 'enemy' && u.hp > 0).length;
    const p = this.units.filter(u => u.side === 'player' && u.hp > 0).length;
    
    if (!e) this.showEnd('胜利！所有敌军已被击破', 0x66ff66);
    else if (!p) this.showEnd('败北...我军全军覆没', 0xff6666);
  }
  
  showEnd(msg, color) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    
    this.add.rectangle(0, 0, w, h, 0x000000, 0.7)
      .setOrigin(0)
      .setDepth(300);
    
    this.add.text(w / 2, h / 2, msg, {
      font: 'bold 36px Arial',
      fill: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(301);
  }
  
  // ============================================================
  // 高亮和UI
  // ============================================================
  
  highlight(range, color) {
    for (const r of range) {
      const t = this.getTile(r.col, r.row);
      if (t) {
        t.setFill(color);
        t._hl = true;
        t.setStrokeStyle(2, 0xaaa);
      }
    }
  }
  
  clearHL() {
    this.tiles.forEach(t => {
      t.setFill(TERRAIN_COLORS[t.terrainType] || 0x4a7c3f);
      t._hl = false;
      t.setStrokeStyle(1, 0x333);
    });
    
    this.units.forEach(u => {
      if (u.active) {
        if (u.circle instanceof Phaser.GameObjects.Image) {
          u.circle.clearTint();
        } else {
          u.circle.setStrokeStyle(2, u.side === 'player' ? 0x64b5f6 : 0xef9a9a);
        }
      }
    });
  }
  
  getTile(c, r) {
    return this.tiles.find(t => t.col === c && t.row === r);
  }
  
  createUI() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    
    this.add.rectangle(0, h - 38, w, 38, 0x000000, 0.75)
      .setOrigin(0)
      .setDepth(100);
    
    this.turnText = this.add.text(15, h - 25, '', {
      font: '13px Arial',
      fill: '#fff',
    }).setDepth(101);
    
    // 结束回合按钮
    const endBtn = this.add.text(w - 120, h - 25, '结束回合', {
      font: '13px Arial',
      fill: '#c9a84c',
    }).setDepth(101).setInteractive({ useHandCursor: true });
    
    endBtn.on('pointerdown', () => this.endTurn());
    
    // 返回按钮
    const backBtn = this.add.text(w - 60, h - 25, '返回', {
      font: '13px Arial',
      fill: '#c9a84c',
    }).setDepth(101).setInteractive({ useHandCursor: true });
    
    backBtn.on('pointerdown', () => this.scene.start('TitleScene'));
  }
  
  showTurnNotice() {
    const txt = this.turn === 'player' ? '我方回合' : '敌方回合';
    const color = this.turn === 'player' ? '#64b5f6' : '#ef9a9a';
    
    const n = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      txt,
      {
        font: 'bold 32px Arial',
        fill: color,
        stroke: '#000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setAlpha(0).setDepth(200);
    
    this.tweens.add({
      targets: n,
      alpha: 1,
      duration: 400,
      yoyo: true,
      hold: 600,
      onComplete: () => n.destroy(),
    });
    
    this.turnText.setText(`回合 ${this.turnCount}  ·  ${txt}`);
  }
  
  showDmg(x, y, dmg) {
    const t = this.add.text(x, y, `-${dmg}`, {
      font: 'bold 18px Arial',
      fill: '#f44',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(150);
    
    this.tweens.add({
      targets: t,
      y: y - 35,
      alpha: 0,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }
  
  showFloat(msg, colorHex) {
    const colorStr = `#${colorHex.toString(16).padStart(6, '0')}`;
    const t = this.add.text(
      this.cameras.main.width / 2,
      80,
      msg,
      {
        font: '14px Arial',
        fill: colorStr,
        stroke: '#000',
        strokeThickness: 2,
      }
    ).setOrigin(0.5).setDepth(200);
    
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: 60,
      duration: 1200,
      onComplete: () => t.destroy(),
    });
  }
}

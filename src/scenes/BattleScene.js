// BattleScene - 六角格战斗场景
// 纯 Phaser 实现六角格战棋系统
class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    this.tiles = [];           // 瓦片精灵数组
    this.units = [];           // 战斗单位
    this.selectedUnit = null;  // 当前选中单位
    this.moveRange = [];       // 可移动范围
    this.turn = 'player';      // 当前回合: player / enemy
    this.turnCount = 1;        // 回合数
    this.actionUnits = [];     // 本回合已行动单位
  }

  create() {
    this.cameras.main.setBackgroundColor('#0d1b2a');

    // 六角格参数（flat-top 扁顶六边形）
    this.hexSize = 26;
    this.hexWidth = this.hexSize * 2;
    this.hexHeight = Math.sqrt(3) * this.hexSize;
    this.mapCols = 12;
    this.mapRows = 10;
    this.mapOffsetX = 50;
    this.mapOffsetY = 70;

    // 生成地形数据
    this.generateTerrain();

    // 绘制六角格地图
    this.drawHexMap();

    // 创建测试单位（汜水关之战初始布局）
    this.createUnit(1, 4, '刘备', 'player', 0x2196F3, 28, 80, 4);
    this.createUnit(2, 4, '关羽', 'player', 0x2196F3, 30, 82, 4);
    this.createUnit(2, 5, '张飞', 'player', 0x2196F3, 26, 78, 3);
    this.createUnit(9, 4, '华雄', 'enemy', 0xf44336, 32, 90, 4);
    this.createUnit(8, 3, '步兵', 'enemy', 0xf44336, 18, 55, 3);
    this.createUnit(8, 5, '弓手', 'enemy', 0xf44336, 16, 50, 3);

    // UI
    this.createUI();

    // 回合提示
    this.showTurnNotice();
  }

  // ==================== 地形生成 ====================

  generateTerrain() {
    this.terrain = [];
    for (let y = 0; y < this.mapRows; y++) {
      this.terrain[y] = [];
      for (let x = 0; x < this.mapCols; x++) {
        // 边缘城墙
        if (x === 0 || x === this.mapCols - 1 || y === 0 || y === this.mapRows - 1) {
          this.terrain[y][x] = 1;
        } else {
          // 随机地形
          const r = Math.random();
          if (r < 0.1) this.terrain[y][x] = 2;      // 山地 10%
          else if (r < 0.2) this.terrain[y][x] = 3;  // 树林 10%
          else this.terrain[y][x] = 0;                // 平地 80%
        }
      }
    }
  }

  // ==================== 六角格地图渲染 ====================

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

  // flat-top 六角格：像素坐标
  hexToPixel(col, row) {
    const x = this.mapOffsetX + this.hexWidth * 0.75 * col;
    const y = this.mapOffsetY + this.hexHeight * (row + 0.5 * (col % 2));
    return { x, y };
  }

  // 获取六边形6个顶点（flat-top）
  getHexCornerPoints(cx, cy, size) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      points.push(new Phaser.Geom.Point(
        cx + size * Math.cos(angle),
        cy + size * Math.sin(angle)
      ));
    }
    return points;
  }

  createHexTile(x, y, col, row) {
    const terrainType = this.terrain[row][col];
    const color = this.getTerrainColor(terrainType);
    const isBlocked = (terrainType === 1);

    // 绘制六边形
    const points = this.getHexCornerPoints(x, y, this.hexSize);
    const hex = this.add.polygon(0, 0, points, color);
    hex.setStrokeStyle(1, 0x333333);
    hex.setOrigin(0);
    hex.setDepth(1);

    // 地形图标（用文字代替）
    const icons = { 0: '', 1: '城', 2: '山', 3: '林' };
    const icon = icons[terrainType] || '';
    if (icon) {
      const label = this.add.text(x, y, icon, {
        font: '12px Arial', fill: '#ffffff', alpha: 0.6,
      });
      label.setOrigin(0.5);
      label.setDepth(2);
    }

    // 元数据
    hex.col = col;
    hex.row = row;
    hex.terrainType = terrainType;
    hex.isBlocked = isBlocked;
    hex._highlighted = false;

    // 交互区域（用圆形简化点击检测）
    const hitArea = this.add.circle(x, y, this.hexSize * 0.8, 0x000000, 0);
    hitArea.setInteractive();
    hitArea.setDepth(3);
    hitArea.hexRef = hex;

    hitArea.on('pointerdown', () => this.onTileClick(col, row));
    hitArea.on('pointerover', () => {
      if (!hex.isBlocked && !hex._highlighted) {
        hex.setStrokeStyle(2, 0x888888);
      }
    });
    hitArea.on('pointerout', () => {
      if (!hex._highlighted) {
        hex.setStrokeStyle(1, 0x333333);
      }
    });

    return hex;
  }

  getTerrainColor(type) {
    const colors = { 0: 0x4a7c3f, 1: 0x777777, 2: 0x8B7355, 3: 0x2d5a27 };
    return colors[type] || 0x4a7c3f;
  }

  // ==================== 战斗单位 ====================

  createUnit(col, row, name, side, color, atk, hp, mov) {
    const pos = this.hexToPixel(col, row);
    const unit = this.add.container(pos.x, pos.y);
    unit.setDepth(10);

    // 单位背景圆
    const circle = this.add.circle(0, 0, 18, color, 0.85);
    circle.setStrokeStyle(2, side === 'player' ? 0x64b5f6 : 0xef9a9a);

    // 名字标签
    const label = this.add.text(0, 24, name.substring(0, 3), {
      font: '10px Arial', fill: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    });
    label.setOrigin(0.5);

    // HP 条背景
    const hpBg = this.add.rectangle(0, -22, 30, 3, 0x000000, 0.6);
    hpBg.setOrigin(0.5);

    // HP 条
    const hpBar = this.add.rectangle(-15, -22, 30, 3, side === 'player' ? 0x4caf50 : 0xf44336);
    hpBar.setOrigin(0, 0.5);

    unit.add([circle, label, hpBg, hpBar]);
    unit.col = col;
    unit.row = row;
    unit.name = name;
    unit.side = side;
    unit.hp = hp;
    unit.maxHp = hp;
    unit.atk = atk;
    unit.mov = mov;
    unit.circle = circle;
    unit.nameLabel = label;
    unit.hpBar = hpBar;
    unit.hpBg = hpBg;

    // 交互
    circle.setInteractive();
    circle.on('pointerdown', () => this.onUnitClick(unit));

    this.units.push(unit);
    return unit;
  }

  updateHpBar(unit) {
    const pct = Math.max(0, unit.hp / unit.maxHp);
    unit.hpBar.width = 30 * pct;
    unit.hpBar.x = -15;
  }

  // ==================== 点击处理 ====================

  onTileClick(col, row) {
    // 如果有选中单位，且目标在移动范围内 → 移动
    if (this.selectedUnit && this.isInMoveRange(col, row)) {
      this.moveUnit(this.selectedUnit, col, row);
      return;
    }

    // 选中该格单位
    const unit = this.getUnitAt(col, row);
    if (unit && unit.side === this.turn) {
      this.selectUnit(unit);
    } else {
      this.clearSelection();
    }
  }

  onUnitClick(unit) {
    if (unit.side === this.turn) {
      this.selectUnit(unit);
    } else if (this.selectedUnit) {
      // 攻击
      this.tryAttack(this.selectedUnit, unit);
    }
  }

  selectUnit(unit) {
    this.clearSelection();
    this.selectedUnit = unit;
    unit.circle.setStrokeStyle(3, 0xffff00);

    // 显示移动范围
    this.moveRange = this.getMoveRange(unit);
    this.highlightRange(this.moveRange, 0x66bb6a);
  }

  clearSelection() {
    this.clearHighlights();
    this.selectedUnit = null;
    this.moveRange = [];
  }

  // ==================== 移动范围 BFS ====================

  getMoveRange(unit) {
    const maxMov = unit.mov;
    const visited = {};
    const queue = [{ col: unit.col, row: unit.row, cost: 0 }];
    const result = [];
    visited[`${unit.col},${unit.row}`] = true;

    while (queue.length > 0) {
      const cur = queue.shift();
      result.push(cur);

      if (cur.cost >= maxMov) continue;

      const neighbors = this.getNeighbors(cur.col, cur.row);
      for (const n of neighbors) {
        const key = `${n.col},${n.row}`;
        if (visited[key]) continue;
        if (n.col < 0 || n.col >= this.mapCols || n.row < 0 || n.row >= this.mapRows) continue;

        const terrain = this.terrain[n.row][n.col];
        const cost = this.getMoveCost(terrain);
        if (cost >= 99) continue; // 不可通行

        const newCost = cur.cost + cost;
        if (newCost <= maxMov && !this.isOccupied(n.col, n.row)) {
          visited[key] = true;
          queue.push({ col: n.col, row: n.row, cost: newCost });
        }
      }
    }
    return result.slice(1); // 排除起始位置
  }

  getNeighbors(col, row) {
    // flat-top 六角格邻居（偶数列/奇数列偏移不同）
    const isOdd = col % 2 === 1;
    const offsets = isOdd
      ? [{ c: 0, r: -1 }, { c: 1, r: -1 }, { c: 1, r: 0 }, { c: 0, r: 1 }, { c: -1, r: 0 }, { c: -1, r: -1 }]
      : [{ c: 0, r: -1 }, { c: 1, r: 0 }, { c: 1, r: 1 }, { c: 0, r: 1 }, { c: -1, r: 1 }, { c: -1, r: 0 }];
    return offsets.map(o => ({ col: col + o.c, row: row + o.r }));
  }

  getMoveCost(terrainType) {
    const costs = { 0: 1, 1: 99, 2: 2, 3: 2 };
    return costs[terrainType] || 1;
  }

  isOccupied(col, row) {
    return this.units.some(u => u.col === col && u.row === row);
  }

  isInMoveRange(col, row) {
    return this.moveRange.some(r => r.col === col && r.row === row);
  }

  // ==================== 移动 ====================

  moveUnit(unit, col, row) {
    const pos = this.hexToPixel(col, row);
    this.tweens.add({
      targets: unit,
      x: pos.x,
      y: pos.y,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        unit.col = col;
        unit.row = row;
        this.clearSelection();
        // 移动后显示攻击选项
        this.showActionMenu(unit);
      }
    });
  }

  // ==================== 攻击 ====================

  tryAttack(attacker, defender) {
    const dist = this.getHexDistance(attacker.col, attacker.row, defender.col, defender.row);
    if (dist > 1) {
      this.showFloatingText('不在攻击范围内！', 0xff6666);
      return;
    }

    // 伤害计算
    const baseDmg = attacker.atk;
    const variance = Math.floor(Math.random() * 10) - 3;
    const dmg = Math.max(1, baseDmg + variance);

    defender.hp = Math.max(0, defender.hp - dmg);

    // 伤害数字
    const pos = this.hexToPixel(defender.col, defender.row);
    this.showDamageNumber(pos.x, pos.y - 25, dmg);

    // 受击闪烁
    this.tweens.add({
      targets: defender,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 3,
      onComplete: () => { unit.alpha = 1; },
    });

    // 更新血条
    this.updateHpBar(defender);

    // 检查死亡
    if (defender.hp <= 0) {
      this.time.delayedCall(500, () => {
        this.units = this.units.filter(u => u !== defender);
        defender.destroy();
        this.checkVictory();
      });
    }

    this.clearSelection();
  }

  getHexDistance(colA, rowA, colB, rowB) {
    // 转换为 cube coordinates 计算距离
    const cubeA = this.offsetToCube(colA, rowA);
    const cubeB = this.offsetToCube(colB, rowB);
    return Math.max(
      Math.abs(cubeA.x - cubeB.x),
      Math.abs(cubeA.y - cubeB.y),
      Math.abs(cubeA.z - cubeB.z)
    );
  }

  offsetToCube(col, row) {
    const x = col;
    const z = row - (col - (col & 1)) / 2;
    const y = -x - z;
    return { x, y, z };
  }

  // ==================== UI ====================

  createUI() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 底部信息栏
    const bar = this.add.rectangle(0, h - 38, w, 38, 0x000000, 0.75);
    bar.setOrigin(0);
    bar.setDepth(100);

    this.turnText = this.add.text(15, h - 25, '', {
      font: '13px Arial', fill: '#ffffff',
    });
    this.turnText.setDepth(101);

    // 返回按钮
    const backBtn = this.add.text(w - 70, h - 25, '返回', {
      font: '13px Arial', fill: '#c9a84c',
    });
    backBtn.setDepth(101);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('TitleScene'));
  }

  showTurnNotice() {
    const txt = this.turn === 'player' ? '我方回合' : '敌方回合';
    const color = this.turn === 'player' ? '#64b5f6' : '#ef9a9a';
    const notice = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, txt, {
      font: 'bold 32px Arial', fill: color, stroke: '#000', strokeThickness: 4,
    });
    notice.setOrigin(0.5);
    notice.setAlpha(0);
    notice.setDepth(200);

    this.tweens.add({
      targets: notice,
      alpha: 1, duration: 400,
      yoyo: true, hold: 600,
      onComplete: () => notice.destroy(),
    });

    this.turnText.setText(`回合 ${this.turnCount}  ·  ${txt}`);
  }

  showActionMenu(unit) {
    // 攻击范围内有敌人 → 可以攻击
    // TODO: 实装行动菜单（攻击/策略/待机）
  }

  showDamageNumber(x, y, dmg) {
    const txt = this.add.text(x, y, `-${dmg}`, {
      font: 'bold 18px Arial', fill: '#ff4444',
      stroke: '#000', strokeThickness: 3,
    });
    txt.setOrigin(0.5);
    txt.setDepth(150);

    this.tweens.add({
      targets: txt,
      y: y - 35, alpha: 0, duration: 700,
      onComplete: () => txt.destroy(),
    });
  }

  showFloatingText(msg, colorHex) {
    const txt = this.add.text(this.cameras.main.width / 2, 80, msg, {
      font: '15px Arial', fill: `#${colorHex.toString(16).padStart(6, '0')}`,
      stroke: '#000', strokeThickness: 2,
    });
    txt.setOrigin(0.5);
    txt.setDepth(200);

    this.tweens.add({
      targets: txt, alpha: 0, y: 60, duration: 1200,
      onComplete: () => txt.destroy(),
    });
  }

  // ==================== 高亮 ====================

  highlightRange(range, color) {
    for (const r of range) {
      const tile = this.getTileAt(r.col, r.row);
      if (tile) {
        tile.setFill(color);
        tile._highlighted = true;
        tile.setStrokeStyle(2, 0xaaaaaa);
      }
    }
  }

  clearHighlights() {
    this.tiles.forEach(t => {
      const color = this.getTerrainColor(t.terrainType);
      t.setFill(color);
      t._highlighted = false;
      t.setStrokeStyle(1, 0x333333);
    });
    this.units.forEach(u => {
      const c = u.side === 'player' ? 0x64b5f6 : 0xef9a9a;
      u.circle.setStrokeStyle(2, c);
    });
  }

  getTileAt(col, row) {
    return this.tiles.find(t => t.col === col && t.row === row);
  }

  getUnitAt(col, row) {
    return this.units.find(u => u.col === col && u.row === row);
  }

  // ==================== 胜利判定 ====================

  checkVictory() {
    const enemies = this.units.filter(u => u.side === 'enemy');
    const players = this.units.filter(u => u.side === 'player');
    if (enemies.length === 0) {
      this.time.delayedCall(600, () => this.showEndNotice('胜利！所有敌军已被击破', 0x66ff66));
    } else if (players.length === 0) {
      this.time.delayedCall(600, () => this.showEndNotice('败北...我军全军覆没', 0xff6666));
    }
  }

  showEndNotice(msg, color) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const overlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.7);
    overlay.setOrigin(0);
    overlay.setDepth(300);

    const txt = this.add.text(w / 2, h / 2, msg, {
      font: 'bold 40px Arial', fill: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000', strokeThickness: 4,
    });
    txt.setOrigin(0.5);
    txt.setDepth(301);
  }
}

window.BattleScene = BattleScene;

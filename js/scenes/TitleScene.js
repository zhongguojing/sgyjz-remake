// ============================================================
// 三国志英杰传 重制版 - 标题场景
// ============================================================

import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.js';
import { BattleScene } from './BattleScene.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }
  
  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    
    // 背景
    this.add.rectangle(0, 0, w, h, 0x0d1b2a).setOrigin(0);
    
    // 标题
    const title = this.add.text(w / 2, 110, '三国志英杰传', {
      font: 'bold 48px serif',
      fill: '#c9a84c',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    
    // 副标题
    this.add.text(w / 2, 170, '重制版 · REMAKE v0.3', {
      font: '18px Arial',
      fill: '#aaaaaa',
    }).setOrigin(0.5);
    
    // 分割线
    const line = this.add.graphics();
    line.lineStyle(1, 0xc9a84c, 0.4);
    line.lineBetween(w / 2 - 140, 200, w / 2 + 140, 200);
    
    // 菜单
    const menus = [
      { text: '开始游戏（汜水关之战）', action: () => this.scene.start('BattleScene') },
      { text: '读取存档', action: () => this.showMsg('存档功能开发中...') },
      { text: '游戏设置', action: () => this.showMsg('设置功能开发中...') },
    ];
    
    menus.forEach((m, i) => {
      const y = 290 + i * 55;
      const txt = this.add.text(w / 2, y, m.text, {
        font: '22px Arial',
        fill: '#e0d5b0',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      txt.on('pointerover', () => {
        txt.setFill('#fff');
        txt.setScale(1.08);
      });
      txt.on('pointerout', () => {
        txt.setFill('#e0d5b0');
        txt.setScale(1);
      });
      txt.on('pointerdown', m.action);
    });
    
    // 版本号
    this.add.text(w - 10, h - 10, 'v0.3.0 · Lua翻译版 · 含完整战斗计算', {
      font: '11px Arial',
      fill: '#555',
    }).setOrigin(1);
  }
  
  showMsg(msg) {
    const w = this.cameras.main.width;
    const t = this.add.text(w / 2, 480, msg, {
      font: '15px Arial',
      fill: '#ffcc00',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);
    
    this.tweens.add({
      targets: t,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => t.destroy(),
    });
  }
}

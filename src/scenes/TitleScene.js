// TitleScene - 主菜单/标题画面
class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 背景渐变效果
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d1b2a, 0x0d1b2a, 0x1a1a2e, 0x1a1a2e, 1);
    bg.fillRect(0, 0, w, h);

    // 标题
    const title = this.add.text(w / 2, 120, '三国志英杰传', {
      font: 'bold 48px serif',
      fill: '#c9a84c',
      stroke: '#000000',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    // 副标题
    const sub = this.add.text(w / 2, 180, '重制版 · REMAKE', {
      font: '18px Arial',
      fill: '#aaaaaa',
    });
    sub.setOrigin(0.5);

    // 装饰线
    const line = this.add.graphics();
    line.lineStyle(1, 0xc9a84c, 0.5);
    line.lineBetween(w / 2 - 150, 210, w / 2 + 150, 210);

    // 菜单选项
    const menuItems = [
      { text: '开始游戏', action: () => this.scene.start('BattleScene') },
      { text: '读取存档', action: () => this.showMessage('存档功能开发中...') },
      { text: '游戏设置', action: () => this.showMessage('设置功能开发中...') },
      { text: '退出游戏', action: () => this.showMessage('请关闭浏览器窗口') },
    ];

    menuItems.forEach((item, i) => {
      const y = 300 + i * 55;
      const txt = this.add.text(w / 2, y, item.text, {
        font: '24px Arial',
        fill: '#e0d5b0',
      });
      txt.setOrigin(0.5);
      txt.setInteractive({ useHandCursor: true });

      txt.on('pointerover', () => {
        txt.setFill('#ffffff');
        txt.setScale(1.1);
      });
      txt.on('pointerout', () => {
        txt.setFill('#e0d5b0');
        txt.setScale(1.0);
      });
      txt.on('pointerdown', item.action);
    });

    // 版本号
    this.add.text(w - 10, h - 10, 'v0.1.0 · 2026 · 三国志英杰传重制项目', {
      font: '11px Arial',
      fill: '#555555',
    }).setOrigin(1);
  }

  showMessage(msg) {
    const w = this.cameras.main.width;
    const notice = this.add.text(w / 2, 500, msg, {
      font: '16px Arial', fill: '#ffcc00',
      stroke: '#000', strokeThickness: 2,
    });
    notice.setOrigin(0.5);
    notice.setDepth(200);
    this.tweens.add({
      targets: notice, alpha: 0, duration: 2000, delay: 1000, onComplete: () => notice.destroy(),
    });
  }
}

window.TitleScene = TitleScene;

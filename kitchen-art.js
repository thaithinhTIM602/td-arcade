/* The stall is painted on a small pixel grid and enlarged with nearest-neighbor sampling. */
window.KitchenArt = (() => {
  'use strict';

  const W = 480, H = 256;
  const ink = '#2d2636', plum = '#483345', deep = '#203b40';
  const cream = '#f9e5b1', gold = '#e4a759', butter = '#ffdc88';
  const red = '#ad4949', darkRed = '#733843', teak = '#905e4b';
  const pine = '#377069', paleJade = '#a3c0a0';

  function rect(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function line(c, x1, y1, x2, y2, color, width = 1) {
    let x = Math.round(x1), y = Math.round(y1);
    const endX = Math.round(x2), endY = Math.round(y2);
    const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
    const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
    let error = dx + dy;
    c.fillStyle = color;
    while (true) {
      c.fillRect(x, y, width, width);
      if (x === endX && y === endY) break;
      const doubled = error * 2;
      if (doubled >= dy) { error += dy; x += sx; }
      if (doubled <= dx) { error += dx; y += sy; }
    }
  }

  function oval(c, cx, cy, rx, ry, color) {
    c.fillStyle = color;
    for (let row = -ry; row <= ry; row++) {
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (row / (ry + 0.25)) ** 2)));
      c.fillRect(Math.round(cx - half), Math.round(cy + row), 2 * half + 1, 1);
    }
  }

  function poly(c, points, color) {
    const xs = [], ys = points.map(p => p[1]);
    c.fillStyle = color;
    for (let y = Math.min(...ys); y < Math.max(...ys); y++) {
      xs.length = 0;
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) {
          xs.push(a[0] + (y + 0.5 - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const left = Math.ceil(xs[i] - 0.5);
        c.fillRect(left, Math.round(y), Math.max(0, Math.ceil(xs[i + 1] - 0.5) - left), 1);
      }
    }
  }

  function box(c, x, y, w, h, outer, inner, hi) {
    rect(c, x, y, w, h, outer);
    rect(c, x + 1, y + 1, w - 2, h - 2, inner);
    if (hi) {
      rect(c, x + 2, y + 1, w - 4, 1, hi);
      rect(c, x + 1, y + 2, 1, h - 4, hi);
    }
  }

  function bitmap(c, rows, palette, left = 0, top = 0) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length;) {
        const key = row[x];
        let end = x + 1;
        while (end < row.length && row[end] === key) end++;
        if (palette[key]) rect(c, left + x, top + y, end - x, 1, palette[key]);
        x = end;
      }
    }
  }

  const vegetables = {
    cabbage: {
      rows: [
        '.....oo..ooo....', '...ooggookkgo...', '..oghlgkgglhgo..',
        '.oghhgGgGhhlhgo.', '.ogglgGhlgGglko.', 'oghGllghkgGhllgo',
        'olhlglGhghhGgkgo', 'okGlhhGlgGlhhGko', '.okkghlhhGghgko.',
        '.ogkghGllGllgko.', '..oggkGlhlggko..', '...okkghhgkko...',
        '.....oggkko.....', '......oooo......'
      ],
      colors: {o:'#35443c',k:'#46754d',g:'#679852',G:'#83aa5a',l:'#a6c771',h:'#d6dd8c'}
    },
    mushroom: {
      rows: [
        '.....oooooo.....', '...ooerreeeoo...', '..oerrppraaeao..',
        '.oeppraaapaaaeo.', '.oarraaaaaaabeo.', 'oerraaaaaaeabbeo',
        'oaaraaaaabbbbbbo', 'oeeaaaebbbbeeeeo', '.obbbeeeeettbbo.',
        '...oottHhhtoo...', '.....ottHhto....', '.....otHhhto....',
        '....otHHhhhto...', '....otthhhtto...', '.....ootttto....',
        '.......oooo.....'
      ],
      colors:{o:'#50353b',e:'#824747',b:'#9f5041',a:'#bf6a46',r:'#d8874f',p:'#f1b56a',t:'#b8956b',h:'#e6c490',H:'#f6dfa6'}
    },
    dumpling: {
      rows: [
        '......o..oo........', '.....ohoohleoo.....', '....ohhhohhehhoo...',
        '...ohhhhehhehllho..', '..ohlhlhehhelhlhlo.', '.ohhlhllehhellhhlo.',
        '.olhhhlhhllhhlhllto', 'ohllhllhhlllhhlllto',
        'ohlhhhllhhllhhllto.', 'olllllhllllhllltoo.', '.otllllllllllttto..',
        '..ottlllllltttto...', '....ooottttttoo....', '.......oooooo......'
      ],
      colors:{o:'#705244',e:'#bf905e',t:'#bd945f',l:'#eac789',h:'#ffedbc'}
    },
    coin: {
      rows:['...oooo...','..oghhgo..','.oghghggo.','oghgghgggo','ogggghggdo','ogggghgddo','.odddhgdo.','..oddddo..','...oooo...'],
      colors:{o:'#76553f',d:'#c18142',g:'#e6a84b',h:'#ffdf84'}
    }
  };

  const spriteCache = new Map();
  let base, island, buffer;

  function surface(width, height) {
    const cv = typeof OffscreenCanvas === 'function'
      ? new OffscreenCanvas(width, height)
      : document.createElement('canvas');
    cv.width = width; cv.height = height;
    return cv;
  }

  function cachedSprite(kind) {
    if (spriteCache.has(kind)) return spriteCache.get(kind);
    const sprite = vegetables[kind] || vegetables.dumpling;
    const cv = surface(Math.max(...sprite.rows.map(row => row.length)), sprite.rows.length);
    bitmap(cv.getContext('2d'), sprite.rows, sprite.colors);
    spriteCache.set(kind, cv);
    return cv;
  }

  function sprite(c, kind, x, y, size, angle = false) {
    const art = cachedSprite(kind);
    const w = Math.max(1, Math.round(size * art.width / Math.max(art.width, art.height)));
    const h = Math.max(1, Math.round(size * art.height / Math.max(art.width, art.height)));
    c.save();
    c.imageSmoothingEnabled = false;
    c.translate(Math.round(x), Math.round(y));
    if (angle) c.scale(-1, 1);
    c.drawImage(art, -Math.round(w / 2), -Math.round(h / 2), w, h);
    c.restore();
  }

  function floor(c) {
    rect(c, 0, 0, W, H, '#669386');
    const tiles = ['#79a595','#76a291','#80a997','#74a191','#82ab9a','#78a391'];
    for (let row = -1; row < 33; row++) {
      for (let col = -1; col < 22; col++) {
        const x = col * 30 + (row % 2 ? 15 : 0), y = row * 8;
        const index = Math.abs(17 * row + 7 * col + (col * col + row) % 4) % tiles.length;
        poly(c, [[x,y],[x+15,y+8],[x,y+16],[x-15,y+8]], tiles[index]);
        line(c,x-14,y+8,x,y+15,'#588579');
        line(c,x,y+15,x+14,y+8,'#5c8a7b');
        line(c,x-12,y+7,x-1,y+1,'#8fb39c');
        if ((row * 19 + col * 23) % 9 === 0) {
          rect(c,x-2,y+10,3,1,'#6e9685');
          rect(c,x+1,y+9,2,1,'#89ae98');
        }
      }
    }
    // The inner border follows the stall footprint and leaves the cooking lanes open.
    for (const [y, shade] of [[80,'#547d70'],[81,'#609384'],[83,'#9ab59a'],[191,'#a6b99c'],[193,'#679180'],[195,'#477c73']]) {
      rect(c, 23, y, 434, 1, shade);
    }
    for (const x of [26, 29, 450, 453]) rect(c,x,81,1,115,'#6d9987');
    for (let x = 37; x < 451; x += 22) {
      rect(c,x,81,3,1,'#bcbe91');
      rect(c,x,193,3,1,'#b5b68a');
    }
    const grate = (x,y) => {
      box(c,x,y,15,6,'#648b7c','#779182','#94aa91');
      for (let k=2;k<14;k+=3) rect(c,x+k,y+2,1,3,'#587b72');
    };
    grate(63,153); grate(402,158);
    // Fragmented shadows from the window muntins.
    const light = 'rgba(255,222,147,0.075)';
    for (const x of [40,252]) {
      poly(c,[[x,84],[x+21,84],[x-3,109],[x-23,109]],light);
      poly(c,[[x+25,84],[x+38,84],[x+15,109],[x+3,109]],light);
    }
  }

  function nightWindow(c, x, y, width, height) {
    box(c,x,y,width,height,'#382f39','#865642','#be875a');
    rect(c,x+3,y+2,width-6,height-5,'#234654');
    rect(c,x+3,y+height-12,width-6,8,'#3b6670');
    const heights = [8,14,5,10,6,13,9];
    for (let i=0;i<Math.floor((width-10)/9);i++) {
      const h=heights[i % heights.length], left=x+5+i*9, bottom=y+height-4;
      rect(c,left,bottom-h,8,h,'#27404b');
      if (i%3!==1) rect(c,left+2,bottom-h+2,2,2,'#c78f59');
      if (i%2===0) rect(c,left+5,bottom-h+5,1,2,'#719794');
    }
    for (const p of [[7,5],[19,3],[35,5],[47,3],[58,6],[75,4]]) {
      if (p[0]<width-5) rect(c,x+p[0],y+p[1],1,1,'#9fb8ae');
    }
    for (let k = 14; k < width - 8; k += 25) {
      rect(c,x+k,y+2,2,height-4,'#694b43');
      rect(c,x+k+1,y+2,1,height-4,'#a46b4b');
    }
    rect(c,x+2,y+Math.floor(height/2),width-4,2,'#755441');
    rect(c,x,y+height-2,width,2,'#d29c64');
  }

  function lantern(c, x, y, small = false) {
    const scale = small ? 0.72 : 1;
    c.save(); c.translate(x, y); c.scale(scale, scale);
    rect(c,0,0,1,4,'#654a42');
    rect(c,-4,4,9,2,plum); rect(c,-3,4,7,1,gold);
    oval(c,0,13,7,8,'#763943'); oval(c,0,12,6,7,'#d9574a');
    oval(c,-1,12,4,7,'#ed8051'); rect(c,-2,7,3,11,'#ffae62');
    rect(c,-4,7,1,9,'#d95e45'); rect(c,3,7,1,10,'#b84d45');
    rect(c,-5,10,11,1,'#df7651'); rect(c,-5,16,11,1,'#d46548');
    rect(c,-4,19,9,2,'#78413d'); rect(c,-3,19,7,1,gold);
    rect(c,-1,21,2,3,'#e0a259'); rect(c,-2,24,3,2,'#c14e45');
    c.restore();
  }

  function spice(c, x, y, color, tall = false) {
    const h=tall?9:7;
    rect(c,x+1,y-h,4,2,plum);
    rect(c,x+1,y-h,4,1,'#c69867');
    box(c,x,y-h+2,6,h-1,'#665343',color);
    rect(c,x+1,y-h+4,4,2,'#e2c997');
    rect(c,x+2,y-h+4,1,2,'#b96a4e');
  }

  function wall(c) {
    rect(c,0,0,480,38,'#9fb09b');
    for (let row=0;row<6;row++) {
      const y=row*7;
      rect(c,0,y,480,1,'#809b8c'); rect(c,0,y+1,480,1,'#b1bba1');
      for (let x=(row%2)*9; x<480; x+=18) rect(c,x,y+1,1,6,'#8ba58e');
    }
    rect(c,0,0,480,3,plum); rect(c,0,2,480,1,'#a66c50');
    nightWindow(c,36,3,76,27);
    nightWindow(c,123,3,73,27);
    nightWindow(c,394,3,49,26);
    // Back shelf and hanging utensils.
    rect(c,205,12,70,2,'#6c5147'); rect(c,205,12,70,1,'#bb8c64');
    rect(c,208,14,2,3,'#755b4d'); rect(c,271,14,2,3,'#755b4d');
    for (const [sx,color,tall] of [[208,'#b67554',true],[216,'#8b6254',false],[226,'#7f8d77',true],[235,'#c18b5e',false]]) {
      spice(c,sx,12,color,tall);
    }
    for (let i=0;i<3;i++) {
      oval(c,258,10-i*2,9,2,'#59766d'); oval(c,258,9-i*2,9,1,'#d4cdb1');
    }
    rect(c,211,18,57,1,'#775344');
    for (const [x,length,i] of [[216,7,0],[226,8,1],[238,9,2],[249,7,3],[261,8,4]]) {
      rect(c,x,17,1,2,gold); rect(c,x,19,1,length,'#6d6253');
      if (i===1) {
        rect(c,x-2,24,5,6,'#6a7b70'); rect(c,x-1,24,3,5,'#d5d3b2');
      } else if (i===3) {
        line(c,x,24,x-3,29,teak,2); rect(c,x-5,29,4,2,'#a17b53');
      } else {
        oval(c,x,19+length,2,3,'#6a7b70'); rect(c,x-1,18+length,2,2,'#dad5b4');
      }
    }
    // Fabric panel above the burner, lit by the exhaust hood.
    rect(c,302,1,76,5,'#5c5553'); rect(c,309,3,62,2,'#869188');
    poly(c,[[318,5],[366,5],[381,17],[307,17]],'#556a68');
    poly(c,[[320,5],[338,5],[329,16],[309,16]],'#84988b');
    poly(c,[[354,5],[366,5],[379,16],[364,16]],'#718780');
    rect(c,306,16,76,4,'#3d5556'); rect(c,308,17,72,1,'#b3b6a0');
    rect(c,311,20,65,1,'#e8c88a'); rect(c,318,20,51,2,'#f7dda2');
    for (const lx of [20,114,289,453]) lantern(c,lx,0,lx===114||lx===289);
    rect(c,0,32,480,3,'#51766d'); rect(c,0,32,480,1,'#d1c5a2');
  }

  function cabinet(c, x,y,w,h,light=false) {
    const timber=light?'#ab7253':'#875847';
    box(c,x,y,w,h,'#5a4542',timber,light?'#bf885c':'#a06d50');
    rect(c,x+3,y+4,w-6,h-7,'#754d42');
    rect(c,x+4,y+5,w-8,h-9,light?'#93614d':'#825646');
    rect(c,x+w-8,y+4,4,2,'#483b3c'); rect(c,x+w-8,y+4,3,1,'#d5aa70');
    if (w>24) {
      rect(c,x+6,y+h-4,w-16,1,light?'#b27e5a':'#96664d');
      const grain=x%7;
      rect(c,x+7+grain,y+7,5,1,light?'#a37052':'#8a5d48');
      rect(c,x+9+grain,y+8,2,1,light?'#835844':'#79503f');
    }
  }

  function counters(c) {
    // Rear cabinetry sits slightly above the tiled floor.
    rect(c,14,73,452,7,'#3d6961'); rect(c,24,80,435,2,'#5a8879');
    rect(c,16,37,448,40,'#5c4540'); rect(c,17,60,446,15,'#975f49');
    for (let x=20; x<457; x+=36) cabinet(c,x,61,34,15);
    rect(c,17,74,446,3,'#55423d'); rect(c,19,74,441,1,'#9c664b');
    rect(c,11,35,457,26,'#4b534b');
    rect(c,13,36,453,23,'#b3b69b'); rect(c,14,36,451,2,'#d4c9a6');
    rect(c,14,38,451,20,'#bdbea2'); rect(c,14,56,451,2,'#a7ad92');
    rect(c,12,58,456,2,'#e2d3ab'); rect(c,14,60,452,2,'#706b59');
    for (let x=20; x<465; x+=36) {
      rect(c,x,37,1,20,'#a7af94'); rect(c,x+1,37,1,20,'#c8c7a6');
    }
    // Shadow from the roof and the flanking carved posts.
    for (const x of [1,461]) {
      rect(c,x,25,18,175,'#315c58'); rect(c,x+1,24,15,177,'#694b46');
      rect(c,x+3,24,12,177,'#945d49'); rect(c,x+4,24,3,177,'#a76f54');
      rect(c,x+12,24,2,177,'#754d43');
      for (const y of [33,78,155,192]) {
        rect(c,x-1,y,19,3,'#514940'); rect(c,x,y,17,1,'#b69765');
      }
    }
    for (const [x,reverse] of [[19,false],[457,true]]) {
      const sign=reverse?-1:1;
      for (let n=0;n<5;n++) {
        rect(c,x+(sign>0?n:-n-1),79,1,113,'rgba(30,62,58,'+(0.12-n*0.018)+')');
      }
    }
  }

  function crate(c,x,y,kind) {
    const left=x-31, top=y-12;
    oval(c,x+2,y+9,33,6,'rgba(57,63,53,.27)');
    box(c,left,top,62,23,'#654e40','#c28a56','#ebc081');
    box(c,left+3,top+2,56,15,'#947047','#765e43');
    for (let i=0;i<5;i++) rect(c,left+7+i*10,top+3,1,12,'#ac8052');
    const centers=kind==='cabbage'
      ? [[-17,-5,15],[-3,-6,16],[13,-5,15],[-23,1,13],[-9,1,17],[7,2,16],[21,1,14]]
      : [[-15,-7,14],[3,-8,16],[19,-7,14],[-22,-1,12],[-8,-1,14],[9,-1,16],[22,0,11]];
    for (const [dx,dy,s] of centers) sprite(c,kind,x+dx,y+dy,s,dx>3);
    rect(c,left,top+17,62,6,'#7e583e'); rect(c,left+2,top+17,58,1,'#e3ad71');
    rect(c,left+2,top+19,58,2,'#bd8956'); rect(c,left+2,top+21,58,1,'#91613d');
    for (const dx of [2,56]) {
      box(c,left+dx,top+14,4,9,'#896244','#d09a62','#e8b776');
      rect(c,left+dx+1,top+17,1,1,'#675345');
      rect(c,left+dx+1,top+21,1,1,'#675345');
    }
  }

  function plates(c,x,y,n=3) {
    for (let i=0;i<n;i++) {
      const py=y-i*2;
      oval(c,x,py+1,10,3,'#58756f'); oval(c,x,py,10,2,'#dbd5b9');
      oval(c,x,py-1,7,1,'#91a398');
    }
  }

  function saucepan(c,x,y) {
    oval(c,x,y+2,9,4,'#5e6d62'); rect(c,x-8,y-2,16,5,'#719084');
    oval(c,x,y-2,8,3,'#c4c7a8'); oval(c,x,y-2,6,1,'#5f756c');
    rect(c,x+7,y-2,7,2,'#6e594a'); rect(c,x+9,y-3,5,1,'#b29163');
  }

  function rearProps(c) {
    crate(c,75,53,'cabbage'); crate(c,159,53,'mushroom');
    // Mise en place, subdued and separate from the larger active stations.
    plates(c,27,55,2);
    rect(c,111,41,10,14,'#b1a781'); rect(c,110,40,10,13,'#d4c59f');
    rect(c,112,42,6,1,'#879488'); rect(c,113,45,5,1,'#a59473');
    rect(c,113,48,3,1,'#a59473');
    for (const [x,y,k] of [[207,52,'#987052'],[216,53,'#7f8064'],[223,51,'#ad8060']]) spice(c,x,y,k,true);
    saucepan(c,267,51);
    rect(c,291,48,10,5,'#86968b'); rect(c,291,47,10,2,'#b6b6a0');
    plates(c,407,54,4);
    // Small crock of chopsticks at the far corner.
    for (const [x,offset] of [[429,-3],[431,2],[432,-1],[434,4],[436,5]]) {
      line(c,x,48,x+offset,35+(x%3),'#96724e');
      rect(c,x+offset,35+(x%3),1,2,'#b26a4d');
    }
    box(c,426,45,13,10,'#60796d','#88a092','#b7bf9f');
    rect(c,429,50,7,1,'#66887c');
    // Two striped hand towels soften the long wood cabinet front.
    for (const [tx,body,stripe] of [[226,'#d7c6a2','#ad5a4b'],[389,'#94aaa1','#547d78']]) {
      rect(c,tx-1,61,14,2,'#685347'); rect(c,tx,61,12,1,'#c79e6d');
      rect(c,tx,62,10,12,'#735b4c'); rect(c,tx,62,9,11,body);
      rect(c,tx+1,69,7,1,stripe); rect(c,tx+1,71,7,1,stripe);
      rect(c,tx+6,63,1,6,'rgba(69,68,65,.17)');
      for (let i=0;i<8;i+=3) rect(c,tx+i,73,2,1,body);
    }
    stoveBase(c,350,55);
  }

  function stoveBase(c,x,y) {
    box(c,x-31,y-15,62,27,'#4a4d47','#73827a','#c7c4a4');
    box(c,x-27,y-12,54,20,'#49615c','#536a63');
    for (const dx of [-22,22]) {
      rect(c,x+dx,y-10,2,15,'#364c4b'); rect(c,x+dx+1,y-10,1,15,'#859086');
    }
    oval(c,x,y,20,8,'#333f40'); oval(c,x,y,17,6,'#bd8353');
    rect(c,x-30,y+8,60,5,'#71817a'); rect(c,x-29,y+8,58,1,'#a8ad95');
    for (const dx of [-21,21]) {
      oval(c,x+dx,y+10,2,2,'#3b5554'); rect(c,x+dx,y+8,1,2,'#d7b47e');
    }
  }

  function bamboo(c,x,y,phase,kind,t) {
    const lit=phase==='ready'||phase==='cooking'||phase==='burnt';
    if (lit) {
      const flame=phase==='burnt'?'#ea7152':'#ffc369';
      for (let i=0;i<5;i++) {
        const k=x-13+i*6, h=2+(Math.floor(t*5+i*1.7)%3);
        rect(c,k,y+7-h,3,h,flame); rect(c,k+1,y+6-h,1,2,'#fff0a8');
      }
    }
    oval(c,x,y+6,20,6,'#614b3d');
    rect(c,x-19,y-3,39,9,'#9b6945');
    oval(c,x,y+4,19,6,'#a87a4e'); oval(c,x,y+2,19,5,'#d6a362');
    rect(c,x-19,y-4,39,7,'#c69355');
    for (let i=-15;i<=15;i+=5) {
      const offset=Math.round((1-Math.sqrt(1-(i/20)**2))*3);
      rect(c,x+i,y-offset,1,5,'#ab7b49');
      rect(c,x+i+1,y-offset,1,4,'#e6b672');
    }
    oval(c,x,y-3,20,6,'#805942'); oval(c,x,y-4,19,5,'#eac183');
    oval(c,x,y-4,16,4,'#a98250');
    for (let i=-12;i<15;i+=5) line(c,x+i-2,y-2,x+i+3,y-6,'#c39c63');
    if (phase==='ready'||phase==='burnt') {
      if (phase==='burnt') {
        for (const [dx,dy] of [[-7,-4],[2,-6],[8,-2],[-2,-1]]) {
          oval(c,x+dx,y+dy,4,2,'#6a5041'); rect(c,x+dx-1,y+dy-2,3,1,'#755f4c');
        }
      } else {
        for (const [dx,dy,s] of [[-6,-6,10],[5,-6,10],[-3,-2,10],[8,-2,9]]) {
          sprite(c,'dumpling',x+dx,y+dy,s);
        }
        rect(c,x-8,y-1,2,1,kind==='mushroom'?'#bd6748':'#719b59');
      }
      lid(c,x+22,y-13,0.62);
    } else if (phase==='cooking') {
      lid(c,x,y-5,1);
    } else {
      // Empty basket reads as an open, inviting work surface.
      lid(c,x+22,y-13,0.62);
    }
    if (lit) {
      for (let i=0;i<4;i++) {
        const u=(t*(phase==='burnt'?0.46:0.63)+i*.26)%1;
        const sx=x-9+i*6+Math.round(Math.sin(u*7+i)*2);
        const sy=y-8-Math.round(u*17);
        c.save(); c.globalAlpha=Math.sin(u*Math.PI)*(phase==='ready' ? .9 : .72);
        const col=phase==='burnt'?'#51464a':(i%2?'#fce9be':'#dfdebb');
        rect(c,sx,sy,2+(i%2),2,col); rect(c,sx+1,sy-2,2,2,col);
        if (u>.4) rect(c,sx,sy-3,2,1,col);
        c.restore();
      }
    }
  }

  function lid(c,x,y,scale) {
    c.save(); c.translate(x,y); c.scale(scale,scale);
    oval(c,0,0,20,6,'#92633f'); oval(c,0,-2,19,6,'#e2b574');
    oval(c,0,-3,16,4,'#c99d60');
    for (const f of [-10,-4,2,8]) {
      line(c,f-3,0,f+3,-6,'#ebc586'); line(c,f+1,-6,f+8,-1,'#a87849');
    }
    rect(c,-4,-8,8,2,'#855f44'); rect(c,-3,-10,6,3,'#b18454');
    rect(c,-2,-10,4,1,'#f1cb8d');
    c.restore();
  }

  function islandLayer(c) {
    // It is drawn between character depth bands so a chef can walk behind it.
    rect(c,168,132,147,17,'rgba(36,66,60,.23)'); rect(c,171,147,141,3,'rgba(36,66,60,.12)');
    rect(c,169,129,142,17,'#594941'); rect(c,171,128,138,14,'#905b48');
    for (const x of [172,208,244,280]) cabinet(c,x,129,29,13,true);
    rect(c,171,142,138,3,'#6f5041');
    rect(c,174,144,4,3,'#58493e'); rect(c,303,144,4,3,'#58493e');
    box(c,164,109,152,24,'#554e44','#bd9870','#f2cd93');
    rect(c,166,111,148,18,'#d6b17b');
    for (let x=176;x<310;x+=19) rect(c,x,112,1,16,'#c69c6d');
    rect(c,165,129,150,2,'#e9c58a'); rect(c,166,131,148,2,'#966b4c');
    rect(c,238,111,3,18,'#aa805d'); rect(c,241,111,1,18,'#eaca8b');
    // Broad end-grain board and a steel cleaver, drawn at an angle.
    rect(c,179,113,53,16,'#967450'); box(c,177,112,53,16,'#996d49','#c48f55','#efc68a');
    rect(c,179,114,49,12,'#d3a366');
    for (const [x,y,n] of [[182,115,7],[185,124,9],[217,116,6],[209,124,7],[197,115,5]]) {
      rect(c,x,y,n,1,'#be8d59');
    }
    line(c,202,122,211,116,'#bc8e59'); line(c,201,120,208,116,'#ddb276');
    poly(c,[[186,121],[197,114],[202,119],[190,125]],'#716f60');
    poly(c,[[187,120],[196,114],[200,118],[190,124]],'#c8d1b9');
    line(c,191,123,200,118,'#e7e6c6');
    line(c,197,115,204,111,'#5b4940',2); line(c,200,113,204,111,'#94654a');
    rect(c,187,121,1,1,'#8e9c8c');
    for (const [x,y] of [[215,119],[218,117],[217,123],[223,120]]) {
      rect(c,x,y,2,1,'#779453'); rect(c,x,y-1,1,1,'#a8b26b');
    }
    // A square blue linen cloth and an empty ceramic exchange platter.
    box(c,249,112,53,17,'#6b7e72','#8ca195','#b5bb9e');
    for (let x=251;x<300;x+=4) rect(c,x,127,2,1,'#ded1a4');
    rect(c,252,114,47,1,'#647f78'); rect(c,252,125,47,1,'#b7bca0');
    platter(c,276,119,20,6);
    rect(c,306,114,4,8,'#a77e52'); rect(c,305,115,5,1,'#e6be82');
  }

  function platter(c,x,y,rx,ry) {
    oval(c,x+1,y+2,rx,ry,'#647d71'); oval(c,x,y+1,rx,ry,'#5d7771');
    oval(c,x,y,rx,ry,'#d5d1b0'); oval(c,x,y-1,rx-2,ry-1,'#91aaa0');
    oval(c,x,y-1,rx-4,Math.max(1,ry-2),'#e7ddbc');
    for (const d of [-1,1]) {
      rect(c,x+d*(rx-3),y-1,2,1,'#597c78');
      rect(c,x+d*(rx-5),y-3,2,1,'#698b80');
    }
  }

  function front(c) {
    rect(c,0,196,480,60,'#534540');
    rect(c,1,199,7,54,'#825747'); rect(c,472,199,7,54,'#805747');
    rect(c,7,197,467,59,'#423b3c');
    rect(c,13,223,454,30,'#835447');
    for (let x=15;x<460;x+=37) cabinet(c,x,225,34,22,true);
    rect(c,12,248,455,6,'#62473f'); rect(c,14,249,451,1,'#aa7554');
    // The serving hatch is red lacquer with a dumpling crest and brass trim.
    box(c,105,224,73,25,'#65423e','#a74e48','#c17b59');
    box(c,109,227,65,18,'#d59d66','#995249');
    for (const x of [113,164]) {
      rect(c,x,231,7,1,'#d09665'); rect(c,x,240,7,1,'#d09665');
      rect(c,x,232,1,8,'#d09665'); rect(c,x+6,232,1,8,'#d09665');
      rect(c,x+2,234,3,1,'#bb8159'); rect(c,x+2,238,3,1,'#bb8159');
    }
    sprite(c,'dumpling',141,236,17);
    // Front worktop and a stepped polished edge.
    box(c,7,197,467,27,'#655a4b','#b9aa87','#ebd1a2');
    rect(c,10,199,461,21,'#c3b494');
    for (let x=17;x<467;x+=30) {
      rect(c,x,199,1,21,'#b4a685'); rect(c,x+1,199,1,21,'#cec09a');
    }
    rect(c,7,220,467,3,'#ecd1a0'); rect(c,9,223,463,1,'#927a59');
    // Deep enamel scrap pail.
    oval(c,52,219,12,3,'#998e74');
    poly(c,[[40,205],[61,205],[58,219],[43,219]],'#49695f');
    poly(c,[[42,206],[59,206],[56,217],[45,217]],'#749383');
    rect(c,45,208,2,7,'#9ba992'); rect(c,55,208,1,7,'#5f8173');
    oval(c,50,204,11,4,'#536e63'); oval(c,50,203,10,3,'#c0c2a4');
    oval(c,50,203,8,2,'#3d5955'); rect(c,47,203,5,1,'#527169');
    rect(c,39,206,2,4,'#7e8170'); rect(c,60,206,2,4,'#7e8170');
    // Lacquer delivery tray, order pad and service bell.
    box(c,111,202,55,17,'#754a43','#b15f4d','#d88e61');
    box(c,113,204,51,13,'#d29460','#a55746');
    platter(c,133,210,16,5);
    oval(c,154,214,5,2,'#6a5548'); oval(c,154,212,5,3,'#bc9158');
    rect(c,151,210,5,2,'#ecca84'); rect(c,154,208,1,2,'#825f43');
    // A wire rail makes it read as a pass at a glance.
    rect(c,107,198,2,16,'#7e6553'); rect(c,168,198,2,16,'#7e6553');
    rect(c,108,197,61,2,'#9f7150'); rect(c,109,197,59,1,'#ddad72');
    for (const px of [116,124]) {
      rect(c,px,199,5,4,'#f0d9a3'); rect(c,px+1,200,3,1,'#a39171');
    }
    frontTableProps(c);
  }

  function coveredCrate(c) {
    // The mushroom delivery is still tied up during practice and the opening shift.
    poly(c,[[128,43],[133,41],[187,41],[191,45],[188,58],[175,59],[165,57],[152,60],[142,58],[129,59]],'#586f70');
    poly(c,[[129,44],[134,41],[186,41],[189,44],[187,52],[169,54],[151,54],[130,52]],'#79928a');
    line(c,129,45,134,41,'#a3b2a0');
    for (const dx of [136,140,178,182]) {
      line(c,dx,42,dx-1,52,'#b5bf9e'); line(c,dx-1,53,dx-2,57,'#94a694');
    }
    line(c,143,46,170,46,'#a3ac92'); line(c,147,49,178,49,'#869c8e');
    rect(c,154,42,2,15,'#ab8a62'); rect(c,155,42,1,15,'#d2b17d');
    line(c,151,45,154,48,'#a7835b',2); line(c,155,48,160,44,'#a7835b');
    rect(c,155,48,2,2,'#d1ab74');
  }

  function frontTableProps(c) {
    // Red-stitched work mat and a stack of freshly floured wrappers.
    box(c,333,199,70,20,'#8b6b52','#bc936b','#e5bf8e');
    rect(c,335,201,66,15,'#d2ab7b'); rect(c,338,202,59,1,'#c49a6d');
    rect(c,336,215,62,1,'#e4bd89');
    for (const [x,y,w] of [[341,211,2],[345,204,3],[351,207,2],[356,214,3],[362,203,2],[373,215,3],[390,212,3],[396,205,2],[339,209,1]]) {
      rect(c,x,y,w,1,'#ecd3a0');
    }
    for (let i=0;i<3;i++) {
      oval(c,369,212-i,10,3,'#ad946f'); oval(c,369,211-i,10,3,'#f2ddb0');
      rect(c,363,209-i,6,1,'#f9e8bf');
    }
    line(c,342,211,356,202,'#805e48',3);
    line(c,344,211,354,204,'#cc9255',3); line(c,344,210,354,203,'#e2ae6e',2);
    line(c,341,212,344,210,'#996b48',2); line(c,356,202,358,201,'#936546',2);
    oval(c,389,208,6,2,'#a98862'); oval(c,389,207,6,2,'#eccea0');
    // Empty counter space is kept quieter than the interactive stations.
    plates(c,207,214,3);
    box(c,251,203,20,13,'#89968a','#b0b6a0','#c2bfa5');
    for (let i=1;i<19;i+=4) rect(c,251+i,205,1,10,'#95a292');
    rect(c,251,207,19,1,'#8e9c90'); rect(c,251,213,19,1,'#929f90');
    // Small tea set beside the wrapping board.
    oval(c,431,214,9,3,'#999681'); oval(c,431,211,6,5,'#587b70');
    oval(c,430,210,5,4,'#82a08c'); rect(c,429,205,4,2,'#5f7d70');
    rect(c,430,204,2,1,'#b1b295');
    line(c,426,210,423,207,'#729081',2);
    rect(c,436,208,3,1,'#55776d'); rect(c,438,209,1,2,'#55776d');
    oval(c,443,213,4,2,'#829486'); oval(c,443,212,3,1,'#c4c4a7');
  }

  const heads = {
    down: [
      '.......nnnnn........','.....nnNNNNNnn......','....nNNNnnNnNNnn....',
      '...nNNnnnNNNNNNNn...','...nrrrRRRRRRRRrn...',
      '..nrRRRrrRRRRRrRrn..','..nrrnnnnnnnnnnrrn..',
      '..nnssttttnntttnnn..','..nstttttttttttssn..',
      '.nsstttntttttnttsSn.','.nsStttNtttttNttsSn.',
      '..nssttttthttttssn..','...nstSSttttSSstn...',
      '....nssttnntttsn....','.....nnsttttssn.....','.......nsssss.......'
    ],
    side: [
      '.......nnnnn........','.....nnNNNNNnn......','....nNNNnnNnNNnn....',
      '...nNNNNnNNNnNNNn...','...nrrrRRRRRRRRrn...',
      '..nrRRRrrRRRRRrRrn..','..nrrnnNNnnnnnnrrn..',
      '..nnNNNNNnsttttnnn..','..nNNNNNnsttttttn...',
      '..nNNNSStttttNttSn..','...nNssStttttNtttSn.',
      '...nnsssttttttthtn..','....nnnstttttSSsn...',
      '......nnsttsttttn...','.......nssttnnnn....','........nssss.......'
    ],
    up: [
      '.......nnnnn........','.....nnNNNNNnn......','....nNNnNNNnNNnn....',
      '...nNnnNNNNNNNNNn...','...nrrrRRRRRRRRrn...',
      '..nrRRRRrrRRRRrRrn..','..nrrNNNnNnNNNNrrn..',
      '..nnNnNNnNNnNnNNnn..','..nNNNNNNNNNNNNNNn..',
      '.nsNNnnNnNNNNNnNnsn.','.nsnNnnNNNNNnnNNnsn.',
      '..nnNNnNNnnnNnNNnn..','...nnNNnnNNnnnNnn...',
      '....nnnnNnnnnnnn....','.....nnssttssnn.....','.......nsssss.......'
    ]
  };

  const jackets = {
    down: [
      '......nssnssn......','....nneeeteeenn....','...neehhhedeeeen...',
      '..nehhVhRRevheeen..','..neheVvVVvvhhepn..','..nenVvvVVvvvnen...',
      '...nnVvvVvVvvnn....','....nVaVaaVaVn.....','....nbbbBbbbbn.....',
      '....nVvVvvvVvn.....','....nVVvvVVVVn.....','.....nddNnddn......'
    ],
    up: [
      '......nssnssn......','....nneeeteeenn....','...neehhRRehhhen...',
      '..nehhVhRRVhheeen..','..neheVvhhvVhhepn..','..nenVvvhheVvnen...',
      '...nnVvvhhhvvnn....','....nVaVaVaVVn.....','....nbbbBbbbbn.....',
      '....nVvvvVvvvn.....','....nVVvVVvVVn.....','.....nddNnddn......'
    ]
  };

  function chefPalette(id) {
    return id===2 ? {
      n:'#302938',N:'#57404a',s:'#aa735d',t:'#d49a73',S:'#aa6857',h:'#f1d5a0',
      r:'#47667e',R:'#76aab4',v:'#4f8792',V:'#386771',a:'#68a09f',B:'#e0ae66',
      e:'#c0baa2',p:'#938e84',b:'#74554e',d:'#555363'
    } : {
      n:'#372b36',N:'#62454a',s:'#c48a69',t:'#edba8e',S:'#dd947b',h:'#f8e4b4',
      r:'#a84749',R:'#f17a55',v:'#bf6650',V:'#995447',a:'#d78a64',B:'#f1c476',
      e:'#c8c0a5',p:'#998b7c',b:'#735348',d:'#514959'
    };
  }

  const chefColors=[null,chefPalette(1),chefPalette(2)];

  function food(c, held, x,y, size=16) {
    if (!held) return;
    const mushroom=held.kind==='mushroom';
    const stage=held.stage || 'raw';
    if (stage==='raw') { sprite(c,held.kind,x,y,size); return; }
    if (stage==='wrapped') {
      sprite(c,'dumpling',x,y,size);
      rect(c,x-2,y+3,2,1,mushroom?'#bd7a50':'#93a769');
      return;
    }
    c.save(); c.translate(Math.round(x),Math.round(y));
    const scale=size/17;
    c.scale(scale,scale);
    if (stage==='chopped') {
      oval(c,0,2,8,3,'#5a675c'); oval(c,0,1,8,2,'#d5c89e');
      const dark=mushroom?'#805044':'#53734b', mid=mushroom?'#ae6b4c':'#81a05b';
      const light=mushroom?'#deb47a':'#c1cd84';
      for (const [dx,dy] of [[-6,-1],[-2,-3],[2,-2],[4,0],[-2,0]]) {
        rect(c,dx,dy,4,3,dark); rect(c,dx,dy,3,2,mid); rect(c,dx,dy,1,1,light);
      }
    } else {
      oval(c,0,4,9,3,'#795b43'); oval(c,0,3,9,2,'#cb9a62');
      rect(c,-8,0,17,3,'#d2a56a'); oval(c,0,0,9,3,'#ebc487');
      oval(c,0,0,7,2,'#ab8455');
      if (stage==='burnt') {
        oval(c,-3,-2,4,2,'#695041'); oval(c,3,-2,4,2,'#6a4a41');
        rect(c,-4,-4,2,1,'#957155'); rect(c,2,-4,2,1,'#987251');
      } else {
        sprite(c,'dumpling',-3,-2,9); sprite(c,'dumpling',3,-2,9);
        rect(c,0,0,2,1,mushroom?'#bc7851':'#7c975c');
      }
    }
    c.restore();
  }

  function chef(c, player,t) {
    const id=player.id===2?2:1, colors=chefColors[id];
    const x=Math.round(player.x/2), y=Math.round(player.y/2);
    const moving=Boolean(player.moving), working=Boolean(player.work);
    const step=moving?Math.floor(t*7)%4:0;
    const bounce=moving&&step%2 ? -1 : 0;
    const face=player.facing||'down', side=face==='left'||face==='right';
    const up=face==='up', mirror=face==='left'?-1:1;
    oval(c,x,y,10,3,'rgba(42,66,62,.26)');
    oval(c,x,y,7,2,'rgba(47,61,57,.17)');
    c.save(); c.translate(x,y); c.scale(mirror,1);
    // Short boots get distinct swing positions even when the cook faces sideways.
    for (const foot of [-1,1]) {
      const sx=foot<0?-7:2, lift=moving ? (step===0&&foot<0 || step===2&&foot>0?-2:0) : 0;
      rect(c,sx,-5+lift,5,4,colors.n); rect(c,sx+1,-5+lift,3,3,colors.d);
      rect(c,sx+(side?1:0),-2+lift,6,2,colors.n);
      rect(c,sx+(side?3:1),-2+lift,3,1,'#82685b');
    }
    c.translate(0,bounce);
    bitmap(c,up?jackets.up:jackets.down,colors,-9,-17);
    // Hands move independently while working, giving each station action its own pose.
    const stirring=working?Math.round(Math.sin(t*(player.work.type==='chop'?16:10))*2):0;
    const carrying=Boolean(player.held);
    for (const arm of [-1,1]) {
      const right=arm===1, dx=right?6:-9;
      const raised=working?(right?-4+stirring:-2):carrying?-2:moving&&((step<2)===right)?-1:0;
      const dy=-13+raised;
      rect(c,dx,dy,4,5,colors.n); rect(c,dx,dy,3,3,colors.e);
      rect(c,dx+(right?0:1),dy,2,2,colors.h);
      rect(c,dx+(right?1:0),dy+3,3,2,colors.s); rect(c,dx+1,dy+3,2,1,colors.t);
    }
    // Cloth knot and trailing ties, unique to these stall cooks.
    rect(c,-10,-26,4,3,colors.r); rect(c,-10,-26,3,1,colors.R);
    if (id===2) {
      oval(c,-5,-29,4,4,colors.n); oval(c,-6,-30,2,2,colors.N);
    }
    const tail=moving&&step%2?1:0;
    line(c,-8,-25,-12,-22+tail,colors.r,2); rect(c,-12,-22+tail,2,1,colors.R);
    bitmap(c,side?heads.side:up?heads.up:heads.down,colors,-10,-31);
    // Squared knot at the nape and a contrasting edge on the apron.
    if (up) {
      rect(c,-3,-26,4,3,colors.r); rect(c,-2,-26,2,1,colors.R);
      line(c,-2,-24,-5,-20,colors.r,2); rect(c,-4,-22,1,2,colors.R);
    } else {
      rect(c,-2,-16,2,2,colors.R); rect(c,0,-15,2,2,colors.r);
    }
    if (carrying) {
      const hx=side?9:up?8:6, hy=side?-12:up?-18:-10;
      food(c,player.held,hx,hy+(working?stirring:0),15);
      rect(c,hx-6,hy+3,3,2,colors.s); rect(c,hx-6,hy+3,2,1,colors.t);
    }
    if (working) {
      const isChop=player.work.type==='chop';
      if (isChop) {
        line(c,7,-14+stirring,11,-20+stirring,'#775747',2);
        poly(c,[[10,-20+stirring],[12,-25+stirring],[16,-23+stirring],[14,-18+stirring]],'#c9cdb3');
        rect(c,11,-22+stirring,1,2,'#edf0cd');
      }
      for (let i=0;i<3;i++) {
        const u=(t*(isChop?2.1:1.4)+i*.31)%1;
        const ax=8+Math.round(u*(5+i*2)), ay=-12-Math.round(Math.sin(u*Math.PI)*(2+i));
        if (u<.74) rect(c,ax,ay,2,1,isChop?'#d1c697':'#f3dba5');
      }
    }
    c.restore();
  }

  function icon(c,kind,x,y,size) {
    if (kind==='steamer'||kind==='basket') {
      c.save(); c.translate(Math.round(x),Math.round(y)); c.scale(size/45,size/45);
      bamboo(c,0,0,'cooking',null,0);
      c.restore(); return;
    }
    sprite(c,kind==='score'?'coin':kind,x,y,size);
  }

  function prepare() {
    if (base) return;
    base=surface(W,H); island=surface(W,H); buffer=surface(W,H);
    const c=base.getContext('2d');
    c.imageSmoothingEnabled=false;
    floor(c); wall(c); counters(c); rearProps(c); front(c);
    islandLayer(island.getContext('2d'));
  }

  function draw(ctx, scene, time=0) {
    prepare();
    const c=buffer.getContext('2d');
    c.imageSmoothingEnabled=false; c.drawImage(base,0,0);
    if (scene.round<2) coveredCrate(c);
    const steam=scene.steamer||{};
    bamboo(c,350,51,steam.phase||'empty',steam.kind,time);
    const players=(scene.players||[]).slice().sort((a,b)=>a.y-b.y);
    // The tabletop must hide a chef standing exactly behind it.
    for (const player of players) if (player.y<286) chef(c,player,time);
    c.drawImage(island,0,0);
    if (scene.shelf) food(c,scene.shelf,276,118,18);
    for (const player of players) if (player.y>=286) chef(c,player,time);
    ctx.save(); ctx.imageSmoothingEnabled=false;
    ctx.drawImage(buffer,0,0,960,512); ctx.restore();
  }

  return {draw,icon};
})();

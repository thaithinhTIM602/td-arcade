/* Original artwork for Dog Bird Air Mail. The scene tiles are drawn once at a
   fixed pixel grid; flight positions stay in the game's logical coordinates. */
window.AirArt = (() => {
  "use strict";

  const TILE = 768, SKY = 270;
  const C = {
    ink: "#273a46", inkLight: "#415667", cream: "#fff4d8", white: "#fffbea",
    red: "#dd5144", redHi: "#ff8560", redLow: "#a83e42", gold: "#ffc664",
    blue: "#4e8da4", blueDark: "#396b7d", blueHi: "#87b8be"
  };
  let scenery, signals, pups, envelopes;

  function canvas(w, h) {
    if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(w, h);
    const element = document.createElement("canvas");
    element.width = w; element.height = h;
    return element;
  }
  function raster(w, h, paint) {
    const bitmap = canvas(w, h), c = bitmap.getContext("2d");
    c.imageSmoothingEnabled = false;
    paint(c);
    return bitmap;
  }
  function box(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  // A scan-line fill gives even the steep mountain ridges a crisp pixel edge.
  function polygon(c, color, pts) {
    let min = Infinity, max = -Infinity;
    for (let i = 1; i < pts.length; i += 2) {
      min = Math.min(min, pts[i]); max = Math.max(max, pts[i]);
    }
    c.fillStyle = color;
    for (let y = Math.floor(min); y < Math.ceil(max); y++) {
      const hits = [], sy = y + 0.5;
      for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
        const y0 = pts[j + 1], y1 = pts[i + 1];
        if ((y0 <= sy && sy < y1) || (y1 <= sy && sy < y0)) {
          hits.push(pts[j] + (sy - y0) * (pts[i] - pts[j]) / (y1 - y0));
        }
      }
      hits.sort((a,b) => a-b);
      for (let j = 0; j + 1 < hits.length; j += 2) {
        const x1 = Math.ceil(hits[j] - 0.5), x2 = Math.ceil(hits[j+1] - 0.5);
        c.fillRect(x1, y, x2 - x1, 1);
      }
    }
  }
  function line(c, x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1-x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1-y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    c.fillStyle = color;
    while (true) {
      c.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const twice = 2 * err;
      if (twice >= dy) {err += dy; x0 += sx;}
      if (twice <= dx) {err += dx; y0 += sy;}
    }
  }
  function ellipse(c, x, y, rx, ry, color) {
    c.fillStyle = color;
    for (let j = -ry; j <= ry; j++) {
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (j*j)/(ry*ry))));
      c.fillRect(x-half, y+j, 2*half+1, 1);
    }
  }
  function random(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function cloud(c, x, y, scale, mirror = false) {
    c.save(); c.translate(x, y); c.scale(mirror ? -scale : scale, scale);
    const shadow = "#d1e4dd", mid = "#fff2d9", lit = "#fff9e6";
    polygon(c, shadow, [-4,3,2,2,4,-2,12,-4,17,-5,20,-10,25,-13,32,-13,38,-10,41,-6,47,-7,52,-5,56,-1,61,-1,64,2,74,3,71,5,57,6,47,8,23,8,12,6,-2,6]);
    polygon(c, mid, [-3,3,4,1,6,-3,13,-4,17,-4,20,-10,25,-14,32,-14,38,-11,42,-6,47,-7,52,-5,56,-1,62,-1,65,2,72,3,50,4,41,6,25,6,17,4,3,4]);
    polygon(c, lit, [2,1,8,-3,13,-4,18,-4,21,-10,26,-13,31,-13,36,-11,39,-8,31,-8,29,-5,22,-4,21,-1,12,-1,8,1]);
    // Small detached wisps keep repeated silhouettes from reading as a pattern.
    box(c,-11,6,6,1,shadow); box(c,64,6,9,1,shadow); box(c,77,4,4,1,mid);
    c.restore();
  }
  function pine(c, x, base, h, dark, mid, glint) {
    const w = Math.max(2, Math.round(h*.30)), tip = base-h;
    box(c,x-1,base-3,2,4,dark);
    polygon(c,dark,[x,tip,x+2,tip+h*.24,x+1,tip+h*.26,x+w*.68,tip+h*.51,x+w*.44,tip+h*.52,x+w,base-2,x+2,base-2,x,base,x-w,base-2,x-w*.53,tip+h*.54,x-w*.76,tip+h*.55,x-1,tip+h*.26,x-2,tip+h*.27]);
    polygon(c,mid,[x,tip+1,x,tip+h*.34,x-1,tip+h*.44,x+1,tip+h*.48,x-1,tip+h*.65,x+1,tip+h*.67,x-2,base-3,x-w+1,base-3,x-w*.5,tip+h*.56,x-w*.58,tip+h*.56,x-1,tip+h*.3]);
    if (h>10 && glint) {
      box(c,x-1,tip+3,1,2,glint); box(c,x-2,tip+Math.round(h*.61),2,1,glint);
    }
  }
  function mountain(c, x, peak, left, right, base, palette, shape) {
    const h=base-peak;
    c.save(); c.translate(x,peak);
    const ridge = [-left,h, -left*.82,h*.69, -left*.72,h*.70, -left*.50,h*.44, -left*.40,h*.42, -left*.26,h*.23, -left*.17,h*.22, -left*.09,h*.08, 0,0, right*.09,h*.09, right*.14,h*.11, right*.24,h*.26, right*.36,h*.32, right*.48,h*.52, right*.57,h*.57, right*.62,h*.55, right*.82,h*.8, right,h];
    polygon(c,palette.rock,ridge);
    polygon(c,palette.shade,[0,0,right*.09,h*.09,right*.14,h*.11,right*.24,h*.26,right*.36,h*.32,right*.48,h*.52,right*.57,h*.57,right*.62,h*.55,right*.82,h*.8,right,h,right*.04,h,right*.1,h*.73,-left*.01,h*.66,right*.06,h*.47,-left*.02,h*.33,right*.014,h*.19]);
    polygon(c,palette.face,[-left*.72,h*.70,-left*.5,h*.44,-left*.4,h*.42,-left*.25,h*.24,-left*.18,h*.23,-left*.34,h*.56,-left*.40,h*.59,-left*.53,h*.84,-left*.56,h*.83,-left*.62,h]);
    polygon(c,palette.face,[-left*.19,h*.48,-left*.1,h*.30,-left*.04,h*.17,-left*.1,h*.42,-left*.13,h*.49,-left*.17,h*.63,-left*.25,h*.74]);
    const snowline = shape ? .34 : .43;
    polygon(c,palette.snow,[-left*.51,h*.45,-left*.40,h*.42,-left*.26,h*.23,-left*.17,h*.22,-left*.09,h*.08,0,0,right*.09,h*.09,right*.14,h*.11,right*.24,h*.26,right*.36,h*.32,right*.40,h*.39,right*.28,h*.34,right*.27,h*.39,right*.18,h*.26,right*.15,h*.33,right*.12,h*.25,right*.10,h*.29,right*.044,h*.16,-left*.015,h*.18,-left*.066,h*snowline,-left*.084,h*.30,-left*.18,h*.42,-left*.16,h*.31,-left*.28,h*.39,-left*.25,h*.32,-left*.35,h*.43,-left*.39,h*.41]);
    polygon(c,palette.snowShade,[0,0,right*.09,h*.09,right*.14,h*.11,right*.24,h*.26,right*.36,h*.32,right*.4,h*.39,right*.28,h*.34,right*.27,h*.39,right*.18,h*.26,right*.15,h*.33,right*.12,h*.25,right*.1,h*.29,right*.044,h*.16,right*.018,h*.15,right*.025,h*.21,-left*.01,h*.20,right*.012,h*.12]);
    line(c,-left*.17,h*.24,-left*.22,h*.31,palette.snow);
    if (!shape) line(c,-left*.33,h*.47,-left*.40,h*.55,palette.snowShade);
    c.restore();
  }

  function roofHouse(c, x, y, s, post=false) {
    c.save(); c.translate(x,y); c.scale(s,s);
    const wall=post?"#eed8ae":"#f5ddba", shadow=post?"#b9a782":"#c8b299";
    box(c,1,-12,19,12,shadow); box(c,2,-11,14,11,wall);
    box(c,17,-10,3,10,shadow); box(c,1,-1,20,2,"#667d70");
    box(c,14,-20,3,6,"#ac7866"); box(c,14,-20,4,1,"#76595a");
    polygon(c,post?"#965346":"#96736a",[-2,-12,4,-19,18,-19,23,-12,22,-10,14,-10,11,-13,8,-10,-2,-10]);
    polygon(c,post?"#d67556":"#bf8973",[-2,-12,4,-19,15,-19,10,-12]);
    line(c,3,-17,13,-17,post?"#ec9b6f":"#d6a189");
    box(c,4,-8,3,3,"#678e96"); box(c,4,-8,3,1,"#547982");
    box(c,9,-6,3,6,"#7f7264");box(c,10,-4,1,2,"#e4ba8a");
    box(c,14,-8,2,3,"#759397");
    if(post) {
      box(c,3,-11,12,2,"#b75a4b");box(c,7,-10,5,1,"#ffe3b5");
      box(c,17,-6,4,5,"#a85246");box(c,17,-7,4,1,"#d98b61");box(c,18,-5,2,1,"#65494a");
    }
    c.restore();
  }

  function makeScenery() {
    const sky = raster(1,SKY,c=>{
      const grad=c.createLinearGradient(0,0,0,SKY);
      grad.addColorStop(0,"#77bbda");grad.addColorStop(.46,"#addef0");
      grad.addColorStop(.72,"#e5ecdc");grad.addColorStop(1,"#f8e5c3");
      c.fillStyle=grad;c.fillRect(0,0,1,SKY);
    });
    const clouds = raster(TILE,SKY,c=>{
      for(const off of [-TILE,0,TILE]) {
        cloud(c,off+13,54,.82);
        cloud(c,off+188,24,.57,true);
        cloud(c,off+239,80,1.1);
        cloud(c,off+457,40,.96,true);
        cloud(c,off+545,93,.66);
        cloud(c,off+686,64,.78,true);
        cloud(c,off+739,17,.48);
      }
      const thin="#d7e8e2";
      for(const [x,y,w] of [[19,80,13],[141,63,25],[182,93,12],[336,40,19],[543,55,24],[635,108,15]]) {
        box(c,x,y,w,1,thin);box(c,x+3,y-1,w*.56,1,"#e9f0df");
      }
    });
    const ranges = raster(TILE,SKY,c=>{
      polygon(c,"#a8c4c7",[0,151,21,145,34,147,59,133,72,137,97,127,116,136,145,124,164,121,184,104,203,110,213,119,223,118,235,130,260,139,292,130,312,138,342,123,361,121,374,111,397,120,414,119,435,132,456,141,477,134,499,141,525,124,543,120,563,106,572,111,580,110,602,125,614,123,635,133,652,127,673,138,702,128,720,135,741,139,768,151,768,244,0,244]);
      polygon(c,"#d9e6db",[160,124,184,104,204,111,212,118,202,114,199,117,190,112,189,116,184,108,179,114,178,112,171,119,168,118]);
      polygon(c,"#dae8e1",[546,118,563,106,572,111,580,110,592,119,579,115,576,117,571,113,570,115,562,109,558,114,557,112]);
      const far={rock:"#9abcc2",shade:"#86aaaf",face:"#b2ced0",snow:"#eef3e3",snowShade:"#c7dcdc"};
      const near={rock:"#84abb4",shade:"#7295a4",face:"#a5c1c2",snow:"#f5f3df",snowShade:"#ccdeda"};
      const left={rock:"#90b4b9",shade:"#769ba5",face:"#afc9c5",snow:"#f3f2e2",snowShade:"#c6dada"};
      for (const off of [-TILE,0,TILE]) {
        mountain(c,off+16,139,113,110,204,far,1);
        mountain(c,off+248,127,112,135,206,far,1);
        mountain(c,off+402,143,108,93,211,far,0);
        mountain(c,off+623,131,114,117,208,far,1);
        mountain(c,off+112,111,128,130,210,near,0);
        mountain(c,off+337,146,103,128,209,left,1);
        mountain(c,off+508,101,141,133,211,near,0);
        mountain(c,off+704,128,116,110,212,left,1);
      }
    });
    const valley=raster(TILE,SKY,c=>{
      const hill=[0,208,0,188,18,184,43,185,65,176,82,177,108,168,125,169,150,178,164,177,193,188,224,192,249,188,275,180,296,177,323,165,340,168,359,170,388,181,408,178,446,187,465,190,485,185,506,185,539,173,553,173,577,162,594,166,612,163,639,175,669,180,688,185,710,179,727,183,746,184,768,188,768,213];
      polygon(c,"#78a4a2",hill);
      polygon(c,"#96b9ac",[45,192,64,183,77,181,99,171,109,168,125,169,149,178,162,177,185,185,158,181,137,180,123,175,108,178,86,184,79,184,61,192]);
      polygon(c,"#8db4aa",[483,194,516,182,544,173,553,173,577,162,595,167,612,163,633,174,610,169,593,173,580,170,562,179,549,179,527,186,516,186]);
      const rng=random(101);
      for(let x=0;x<TILE;x+=3+Math.floor(rng()*4)){
        const base=199+Math.floor(3*Math.sin(x*.04)+2*Math.sin(x*.13));
        pine(c,x,base,5+Math.floor(rng()*8),"#719b94","#80a79b");
      }
      polygon(c,"#79a89b",[0,195,45,195,74,198,116,194,143,195,176,193,216,195,256,193,291,194,324,191,358,192,402,196,446,194,489,196,533,192,575,190,609,193,640,191,677,195,710,193,752,194,768,195,768,216,0,216]);
      polygon(c,"#c4c8a1",[0,204,42,204,63,201,104,202,150,199,184,201,227,199,253,200,291,198,316,201,371,200,406,202,445,201,471,203,526,201,563,198,608,198,648,200,699,201,735,202,768,204,768,211,0,211]);
      // Tiny, far-bank buildings stay quiet against the blue of the flight lane.
      [[75,201,.45],[98,201,.55],[142,201,.46],[371,202,.46],[390,202,.39],[569,199,.48],[593,199,.55]].forEach(v=>roofHouse(c,...v));
      box(c,0,205,TILE,42,"#8ac7cb");
      for(let i=0;i<145;i++){
        const x=Math.floor(rng()*TILE),y=207+Math.floor(rng()*33),w=3+Math.floor(rng()*25);
        const col=y<216?"#b7d8ce":i%4===0?"#c9dfcf":"#a0d1cc";
        box(c,x,y,w,1,col);if(x+w>TILE)box(c,0,y,x+w-TILE,1,col);
      }
      for(let i=0;i<22;i++){
        const x=Math.floor(rng()*TILE),y=207+Math.floor(rng()*7);box(c,x,y,4+rng()*9,1,"#e1e5ce");
      }
      // A single sail establishes the valley's scale.
      polygon(c,"#fff0ce",[498,218,504,209,504,218]);
      line(c,505,207,505,220,"#8d8c7b");box(c,496,220,13,1,"#7c9894");box(c,498,221,8,1,"#88ada5");
    });
    const shore=raster(TILE,SKY,c=>{
      const ridge=[0,244,0,232,16,228,40,226,64,225,90,229,112,230,142,232,168,232,189,229,214,228,235,224,267,225,291,230,325,232,351,232,377,229,402,228,432,231,463,231,488,227,522,226,551,222,578,221,610,223,637,228,660,230,693,231,719,228,742,228,768,232,768,248];
      polygon(c,"#a9bea4",ridge);
      const rng=random(497);
      for(const [at,pop] of [[3,9],[106,5],[193,8],[298,6],[384,6],[474,4],[637,8],[706,6]]) {
        for(let i=0;i<pop;i++){
          const x=at+i*3+Math.floor(rng()*4),h=7+Math.floor(rng()*11),y=231+Math.floor(rng()*4);
          pine(c,x,y,h,"#72978a","#90ac96","#a6b99e");
        }
      }
      for(const [x,y,s,p] of [[43,228,.68],[61,228,.82],[233,228,.68],[249,227,.9,true],[268,228,.64],[521,225,.7],[538,224,.57],[554,223,.8],[577,224,.68],[595,225,.52]])roofHouse(c,x,y,s,p);
      polygon(c,"#a4b693",[0,235,28,233,63,232,99,235,140,236,170,232,218,232,260,229,280,231,310,233,350,235,396,232,432,233,462,234,495,231,525,229,557,227,593,229,630,232,660,235,705,235,735,233,768,235,768,255,0,255]);
      polygon(c,"#d8ceaa",[0,240,42,239,77,239,110,241,157,240,200,238,241,234,266,233,279,233,267,235,248,236,223,239,190,241,151,242,113,242,76,241,39,241,0,242]);
      polygon(c,"#d8ceaa",[401,241,453,239,488,236,527,231,560,229,579,229,564,231,540,232,506,236,490,237,458,241,411,243]);
      // A windsock on the post office apron, a small mail box and a meadow path.
      box(c,277,216,1,12,"#71867a");box(c,276,215,3,1,"#859a85");
      polygon(c,"#e9b08b",[278,215,286,217,286,219,278,218]);
      box(c,278,215,2,3,"#bd7362");box(c,282,217,2,2,"#c27967");
      box(c,244,225,2,3,"#ad685a");box(c,243,224,4,1,"#cf8b6b");
      for(let i=0;i<160;i++){
        const x=Math.floor(rng()*TILE),y=236+Math.floor(rng()*16);
        box(c,x,y,2+Math.round(rng()*5),1,i%3?"#95aa8a":"#bec5a3");
      }
      for(const [at,row] of [[14,249],[173,244],[291,248],[465,247],[704,245]]) {
        for(let k=0;k<4;k++) {
          const x=at+k*6;box(c,x,row-3,1,4,"#8c997e");
          if(k<3)box(c,x+1,row-2,5,1,"#a5a98b");
        }
      }
      for(const [at,base,h] of [[12,241,15],[21,241,12],[152,240,12],[177,241,16],[320,240,17],[330,240,13],[415,238,13],[425,238,18],[651,240,15],[662,240,11],[739,239,13]]) {
        pine(c,at,base,h,"#607f73","#789784","#8eaa92");
      }
    });
    const ground=raster(TILE,24,c=>{
      box(c,0,0,TILE,24,"#627c68");
      box(c,0,0,TILE,2,"#536d62");box(c,0,2,TILE,2,"#a8b88c");
      box(c,0,4,TILE,5,"#879f75");box(c,0,9,TILE,15,"#b59b78");
      box(c,0,9,TILE,2,"#978c6d");box(c,0,18,TILE,6,"#a68f74");
      const rng=random(3207);
      for(let x=0;x<TILE;x+=7+Math.floor(rng()*12)){
        const w=2+Math.floor(rng()*10);box(c,x,2,w,1,"#c7cb99");box(c,x+2,6,w,1,"#758c6a");
      }
      for(let i=0;i<210;i++){
        const x=Math.floor(rng()*TILE),y=12+Math.floor(rng()*12);
        box(c,x,y,1+Math.round(rng()*2),1,i%2?"#937e69":"#c3ab88");
      }
    });
    return {sky, clouds, ranges, valley, shore, ground};
  }

  function repeat(c, image, width, y, offset, row = 0, end = image.height) {
    const span=image.width*2;
    const origin=-((Math.floor(offset/2)*2 % span)+span)%span;
    const rows=end-row;
    for(let x=origin;x<width;x+=span) {
      c.drawImage(image,0,row,image.width,rows,x,y+row*2,span,rows*2);
    }
  }
  function landscape(ctx,{width,height=540,ground=505,travel=0,time=0,reducedMotion=false}) {
    if(!scenery)scenery=makeScenery();
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(scenery.sky,0,0,width,height);
    const ys=ground/505;
    ctx.scale(1,ys);
    // Sun is optical distance. Clouds and the various banks cross at distinct speeds.
    const sx=Math.round(width*.72/2)*2;
    ctx.save();ctx.translate(sx,111);ctx.scale(2,2);
    ellipse(ctx,0,0,20,20,"#d6e2ce");
    ellipse(ctx,0,0,18,18,"#f5e9be");ellipse(ctx,0,0,15,15,"#fff1cf");ctx.restore();
    const breeze=reducedMotion?0:time*1.4;
    repeat(ctx,scenery.clouds,width,0,travel*.047+breeze,6,116);
    repeat(ctx,scenery.ranges,width,0,travel*.13,99,215);
    repeat(ctx,scenery.valley,width,0,travel*.24,159,247);
    repeat(ctx,scenery.shore,width,0,travel*.43,201,255);
    repeat(ctx,scenery.ground,width,505,travel*.84);
    if(height/ys>553)box(ctx,0,552,width,height/ys-551,"#a68f74");
    ctx.restore();
  }

  function gateStem(upper) {
    return raster(30,26,c=>{
      // The posts are enclosed route masts. Their solid faces and outer edges
      // extend from each beacon all the way to its side of the flight lane.
      box(c,0,0,30,26,C.ink);
      box(c,2,0,26,26,upper?"#779eab":"#b27853");
      box(c,3,0,3,26,upper?"#c4dad3":"#e5b67b");
      box(c,6,0,2,26,upper?"#9ebfbe":"#d69a62");
      box(c,23,0,3,26,upper?"#537788":"#966345");
      box(c,26,0,2,26,upper?"#789aa4":"#ac7350");
      box(c,9,0,13,26,upper?"#88aeb7":"#c38c60");
      if (upper) {
        polygon(c,"#6f96a5",[8,0,13,0,22,10,22,15,8,2]); 
        polygon(c,"#a1c1c4",[8,1,10,1,22,12,22,15,20,13,8,4]);
        polygon(c,"#6b91a1",[8,24,8,20,22,7,22,11]);
        line(c,8,21,21,9,"#bad1ca");
      } else {
        // Painted steel braces bolt onto a warm wooden frame.
        box(c,11,1,1,24,"#a36f4c");box(c,18,0,1,26,"#a36f4c");
        polygon(c,"#835b46",[7,20,23,4,23,10,8,25]);
        polygon(c,"#d8aa73",[7,19,23,3,23,6,7,22]);
        line(c,9,3,17,11,"#9b694d");
      }
      box(c,2,0,26,3,upper?"#688996":"#81634f");
      box(c,3,0,24,1,upper?"#bed1c7":"#d6aa7d");
      for(const x of [4,24])box(c,x,1,2,2,upper?"#526f80":"#765a4c");
    });
  }
  function postMark(c, x, y) {
    box(c,x-4,y-1,9,4,C.cream);
    box(c,x-3,y,1,1,"#b75544");box(c,x-2,y+1,2,1,"#b75544");
    box(c,x+2,y,1,1,"#b75544");box(c,x,y+1,2,1,"#b75544");
    box(c,x-8,y-1,4,1,"#ffe4ae");box(c,x-7,y+1,3,1,"#f7cd95");
    box(c,x+5,y-1,4,1,"#ffe4ae");box(c,x+5,y+1,3,1,"#f7cd95");
  }
  function gateCap(upper) {
    return raster(30,18,c=>{
      if(upper) {
        polygon(c,C.ink,[0,0,30,0,30,15,27,18,3,18,0,15]);
        box(c,1,1,28,2,"#4e6a76");box(c,2,1,26,1,"#c1ccc0");
        box(c,2,4,26,9,C.redLow);box(c,3,4,23,7,C.red);box(c,3,4,23,1,C.redHi);
        postMark(c,15,7);
        box(c,2,13,26,2,"#f5cc85");box(c,4,13,22,1,"#fff1b5");
        box(c,4,15,22,1,"#9d6a47");box(c,7,16,16,1,"#d78c4f");
      } else {
        polygon(c,C.ink,[3,0,27,0,30,3,30,18,0,18,0,3]);
        box(c,4,1,22,2,"#e8b463");box(c,7,1,16,1,"#fff3b8");
        box(c,2,3,26,4,"#ffdc8c");box(c,4,3,22,1,"#fff5ce");
        for(const x of [6,21])box(c,x,4,2,2,"#d7954e");
        box(c,1,7,28,2,"#764c41");
        box(c,2,9,26,6,C.redLow);box(c,3,9,24,5,C.red);
        for(const x of [-1,8,17,26]){
          const pts=[x,14,x+4,14,x+8,9,x+4,9];
          c.save();c.beginPath();c.rect(2,9,26,5);c.clip();
          polygon(c,"#f9dca9",pts);c.restore();
        }
        box(c,2,15,26,2,"#71858a");box(c,3,15,24,1,"#b1b7a0");
      }
    });
  }
  function mastBody(ctx,bitmap,y0,y1) {
    if(y1<=y0)return;
    for(let y=y0;y<y1;y+=26) {
      const h=Math.min(26,y1-y);
      ctx.drawImage(bitmap,0,0,30,h,0,y,30,h);
    }
  }
  function gate(ctx,{x,width,top,bottom,ground=505,index=0,time=0}) {
    if(!signals)signals={up:gateStem(true),down:gateStem(false),upCap:gateCap(true),downCap:gateCap(false)};
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.translate(x-width/2,0);ctx.scale(width/30,2);
    const t=top/2,b=bottom/2,g=ground/2,h=18;
    if(t>h)mastBody(ctx,signals.up,0,t-h);
    const upH=Math.min(h,Math.max(0,t));
    if(upH)ctx.drawImage(signals.upCap,0,h-upH,30,upH,0,t-upH,30,upH);
    const lowH=Math.min(h,Math.max(0,g-b));
    if(lowH)ctx.drawImage(signals.downCap,0,0,30,lowH,0,b,30,lowH);
    if(g>b+h)mastBody(ctx,signals.down,b+h,g);
    if(g-b>h+6) {
      // Mounting shoe stops at the ground, at the same width as the mast.
      box(ctx,0,g-4,30,4,C.ink);box(ctx,1,g-3,28,2,"#687977");
      box(ctx,4,g-3,2,1,"#b2b9a1");box(ctx,24,g-3,2,1,"#b2b9a1");
    }
    if (Math.sin(time*3.5+index*1.77)>.1 && t>9 && g-b>9) {
      box(ctx,6,t-5,5,1,"#fffbd1");box(ctx,18,b+2,5,1,"#fff9cb");
    }
    ctx.restore();
  }

  const dog = {
    out:"#343940", deep:"#a65e3f", fur:"#df9554", face:"#ecab68", lit:"#ffd193",
    white:"#fff4d7", shade:"#e8d5b0", blush:"#e7997a", nose:"#333941", mouth:"#773f3e",
    feather:"#fff9e1", featherShade:"#d8e3d5", featherDeep:"#8baeb1",
    far:"#d0e1da", farShade:"#9dbdc1", wingInk:"#526e78"
  };
  function farWing(c, pose) {
    // The far wing fans upward in profile, leaving a separate light silhouette
    // between the scarf and the ears even on a phone-sized playfield.
    const slant = [.46,-.13,.03,.24][pose], spread=[.73,.94,.85,.78][pose];
    function wingPath(color,points) {
      const moved=[];
      for(let i=0;i<points.length;i+=2) {
        const radius=points[i+1]+5;
        moved.push(Math.round(points[i]-1+radius*slant),Math.round(radius*spread)-5);
      }
      polygon(c,color,moved);
    }
    wingPath(dog.wingInk,[-5,-4,-7,-9,-7,-17,-6,-24,-4,-26,-3,-25,-3,-20,0,-26,2,-27,3,-26,2,-21,5,-24,7,-24,7,-21,5,-16,7,-18,8,-17,6,-12,3,-8,-1,-5]);
    wingPath(dog.far,[-5,-5,-6,-10,-6,-17,-5,-23,-4,-24,-4,-17,-2,-20,0,-24,2,-25,0,-18,4,-22,6,-23,5,-19,2,-13,6,-16,5,-13,2,-9,-1,-6]);
    wingPath("#eff3de",[-6,-13,-6,-18,-5,-23,-4,-24,-4,-17,-1,-21,1,-24,0,-21,-3,-15,-4,-14,-4,-11]);
    wingPath(dog.farShade,[-4,-9,-2,-14,1,-17,-1,-12,-3,-8]);
  }
  function body(c,pose,crashed) {
    // A white-tipped tail and short, tucked back legs keep the airborne
    // silhouette recognisably canine even at the smallest mobile scale.
    polygon(c,dog.out,[-10,-1,-14,-3,-17,-7,-21,-8,-22,-6,-20,-1,-16,2,-12,4,-9,4]);
    polygon(c,dog.fur,[-11,0,-15,-2,-17,-5,-20,-6,-19,-2,-16,1,-12,3]);
    polygon(c,dog.white,[-17,-6,-21,-7,-21,-5,-19,-2,-17,-2,-18,-4,-16,-3]);
    polygon(c,dog.out,[-13,-1,-10,-5,-6,-7,1,-7,7,-5,11,-1,10,4,8,6,8,8,10,9,10,11,6,12,3,9,2,7,-4,8,-6,7,-8,10,-11,11,-14,10,-14,8,-11,6,-14,4]);
    polygon(c,dog.deep,[-13,-1,-9,-4,-5,-6,0,-6,7,-4,9,0,9,4,6,6,7,8,9,10,7,10,4,8,3,6,-1,6,-6,6,-9,9,-12,9,-11,7,-10,5,-13,3]);
    polygon(c,dog.fur,[-13,-1,-10,-4,-6,-6,0,-6,7,-4,9,-1,5,4,-4,5,-8,3,-10,6,-13,4]);
    polygon(c,dog.face,[-11,-2,-8,-5,-4,-6,0,-6,4,-4,-2,-4,-7,-3,-10,0]);
    polygon(c,dog.shade,[-5,4,-1,4,5,1,8,2,6,5,6,7,9,9,7,10,4,8,3,6,-4,7,-6,6]);
    polygon(c,dog.white,[-3,4,2,3,6,0,8,1,5,4,4,5,0,6,-3,6]);
    box(c,-13,8,3,1,dog.shade);box(c,7,9,2,1,dog.white);

    // Rear ear, near ear, stop, forehead, long muzzle.
    polygon(c,dog.out,[3,-6,1,-11,0,-17,1,-19,3,-18,7,-14,9,-12,11,-15,14,-18,16,-18,16,-14,14,-9,16,-7,17,-4,20,-3,21,-2,21,1,18,4,14,5,11,5,9,8,6,7,5,4,2,1]);
    polygon(c,dog.deep,[3,-7,2,-12,1,-16,2,-17,6,-14,9,-11,12,-14,14,-16,15,-16,14,-13,13,-9,15,-6,16,-3,20,-2,19,1,17,3,13,4,10,4,8,7,6,5,5,2,3,0]);
    polygon(c,dog.face,[3,-9,2,-16,3,-16,7,-13,9,-10,12,-13,14,-15,13,-10,12,-8,15,-6,16,-3,17,-1,14,1,12,3,8,4,5,1]);
    polygon(c,"#c87664",[3,-15,6,-12,8,-9,5,-10]);polygon(c,"#d98d72",[12,-11,14,-14,13,-10]);
    polygon(c,dog.lit,[8,-9,10,-9,11,-7,12,-6,15,-5,14,-3,11,-4,9,-5]);
    polygon(c,dog.white,[8,-8,10,-8,10,-6,12,-4,15,-4,16,-3,19,-2,19,0,17,2,13,3,10,3,9,5,7,6,6,5,7,3,9,1,10,-1,9,-3,9,-5]);
    box(c,17,-3,4,2,dog.nose);box(c,19,-1,2,1,dog.nose);box(c,18,-3,1,1,"#93a0a1");
    if(crashed){line(c,12,-6,14,-4,dog.nose);line(c,12,-4,14,-6,dog.nose);}
    else{
      box(c,12,-7,2,1,dog.deep);box(c,12,-5,2,3,dog.nose);box(c,12,-5,1,1,dog.white);
    }
    box(c,10,-1,2,1,dog.blush);
    box(c,15,1,4,1,dog.mouth);box(c,15,2,2,1,"#d56f65");

    // Flying scarf lies on the far side, with a knot against the chest.
    const rise=pose===1?1:0;
    polygon(c,"#a34344",[6,0,1,-1,-4,-4-rise,-10,-5-rise,-14,-4-rise,-20,-6-rise,-19,-2-rise,-14,0-rise,-10,-1-rise,-5,0,0,3,5,4]);
    polygon(c,C.red,[-20,-6-rise,-15,-4-rise,-10,-5-rise,-4,-4-rise,1,-1,4,0,2,1,-5,-2,-10,-3-rise,-14,-2-rise,-17,-3-rise]);
    line(c,-12,-4-rise,-7,-4-rise,"#ff9271");
    polygon(c,C.redLow,[3,-2,6,0,10,2,9,5,5,4,2,1]);
    polygon(c,C.redHi,[4,-2,6,-1,9,1,9,2,7,2,4,0]);
    box(c,4,1,3,3,C.red);
    // Blue leather dispatch bag, brass clasp and diagonal shoulder strap.
    line(c,3,-1,-1,5,"#6b635c");line(c,2,-1,-2,5,"#e9be82");
    polygon(c,"#344956",[-5,3,1,3,3,4,2,9,-3,10,-6,8]);
    polygon(c,"#527f89",[-5,4,1,4,2,5,1,8,-3,9,-5,8]);
    polygon(c,"#76a6a4",[-5,4,1,4,1,6,-2,7,-5,6]);
    box(c,-2,6,2,2,"#e9b86c");box(c,-2,6,1,1,"#ffdb8a");
  }
  function nearWing(c, pose) {
    if(pose===0) { // Downstroke, with visible overlapping primary feathers.
      polygon(c,dog.wingInk,[-4,-3,-8,-2,-10,0,-11,4,-13,9,-12,12,-10,11,-9,8,-10,14,-8,15,-5,11,-4,8,-4,13,-2,14,0,10,1,5,-1,0]);
      polygon(c,dog.feather,[-4,-2,-8,-1,-9,1,-10,5,-12,10,-12,11,-10,9,-8,5,-9,12,-8,13,-6,10,-4,4,-3,4,-3,11,-2,12,0,8,0,4,-1,1]);
      line(c,-7,3,-10,8,dog.featherShade);line(c,-4,4,-7,10,dog.featherShade);
      box(c,-4,-1,2,1,dog.white);
    } else if(pose===1) {
      polygon(c,dog.wingInk,[-3,0,-6,1,-12,-2,-16,-5,-18,-9,-19,-14,-17,-14,-15,-11,-17,-17,-17,-20,-15,-19,-13,-16,-13,-21,-12,-23,-10,-21,-7,-15,-7,-11,-4,-7,-2,-3]);
      polygon(c,dog.feather,[-3,-1,-6,0,-11,-3,-15,-6,-17,-10,-17,-12,-15,-9,-12,-7,-15,-13,-16,-18,-14,-16,-11,-11,-12,-17,-12,-20,-11,-21,-9,-17,-8,-13,-8,-10,-5,-7,-3,-4]);
      polygon(c,dog.featherShade,[-4,-1,-7,-1,-13,-5,-16,-9,-13,-7,-9,-5,-12,-12,-9,-8,-6,-4,-4,-3]);
      line(c,-8,-8,-10,-14,dog.featherDeep);
    } else if(pose===2) {
      polygon(c,dog.wingInk,[-3,0,-7,1,-13,-1,-17,-3,-20,-6,-20,-8,-16,-7,-19,-10,-20,-13,-18,-13,-13,-10,-15,-14,-15,-17,-13,-17,-8,-12,-6,-9,-3,-7,-1,-4]);
      polygon(c,dog.feather,[-3,-1,-7,0,-13,-2,-16,-4,-19,-7,-16,-6,-12,-4,-17,-9,-19,-12,-15,-10,-10,-7,-13,-12,-14,-15,-13,-15,-9,-11,-5,-7,-3,-6,-2,-4]);
      polygon(c,dog.featherShade,[-4,-1,-8,-1,-15,-4,-11,-3,-15,-8,-11,-5,-6,-3]);
      line(c,-8,-6,-12,-10,dog.featherDeep);
    } else { // Glide, showing a little air between the individual feather tips.
      polygon(c,dog.wingInk,[-3,0,-6,2,-12,2,-17,1,-19,-1,-18,-2,-15,-2,-19,-4,-20,-6,-18,-7,-13,-5,-16,-9,-16,-11,-14,-11,-8,-8,-3,-6,-1,-3]);
      polygon(c,dog.feather,[-3,-1,-6,1,-12,1,-16,0,-17,-1,-12,-1,-16,-4,-19,-6,-15,-5,-10,-3,-14,-7,-15,-9,-13,-9,-8,-6,-4,-5,-2,-3]);
      line(c,-5,-1,-11,-3,dog.featherShade);
    }
  }
  function makePups() {
    return Array.from({length:8},(_,i)=>raster(49,49,c=>{
      c.translate(24,31);const pose=i%4;
      farWing(c,pose);body(c,pose,i>=4);nearWing(c,pose);
    }));
  }
  function pup(ctx,{x,y,scale=1,angle=0,flap=1,time=0,crashed=false}) {
    if(!pups)pups=makePups();
    const p=flap<.22?0:flap<.47?1:flap<.73?2:3;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,y);ctx.rotate(angle);ctx.scale(1.55*scale,1.55*scale);
    ctx.drawImage(pups[p+(crashed?4:0)],-24,-31);
    ctx.restore();
  }

  function makeEnvelope() {
    return raster(19,15,c=>{
      polygon(c,"#86543f",[1,2,17,2,19,4,18,13,16,15,2,14,0,12,0,4]);
      polygon(c,"#db914c",[1,2,16,1,18,3,17,12,15,13,2,12,1,11]);
      polygon(c,"#ffe29a",[2,2,15,2,17,3,16,11,2,11]);
      polygon(c,"#f4bd68",[2,10,7,6,11,6,16,10,15,11,3,11]);
      line(c,3,10,7,6,"#d99858");line(c,11,6,15,10,"#d99858");
      polygon(c,"#bf794b",[1,3,17,2,16,4,10,9,7,9,1,5]);
      polygon(c,"#fff2b2",[2,2,16,2,15,4,9,7,8,7,2,4]);
      box(c,7,6,4,3,"#b54a42");box(c,8,5,2,1,"#de6751");box(c,8,6,2,1,"#ff8c65");
      box(c,3,2,5,1,"#fff9cc");box(c,13,10,2,1,"#ffe7a0");
    });
  }
  function letter(ctx,{x,y,scale=1,time=0}) {
    if(!envelopes)envelopes=makeEnvelope();
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.drawImage(envelopes,-13,-10,26,20);
    // Sparkles advertise the collectible without moving its hit target.
    const flicker=(Math.sin(time*5+x*.009)+1)/2;
    if(flicker>.58) {
      const p=flicker>.87?2:1;
      box(ctx,12,-13-p,1,2*p+1,"#fff8d0");box(ctx,12-p,-13,2*p+1,1,"#fff8d0");
    }
    ctx.restore();
  }
  return {landscape,gate,pup,letter};
})();

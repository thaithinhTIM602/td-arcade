const colors = {
  ".": null, k: "#382736", w: "#fff1cf", l: "#ffdb98", t: "#cd9469", r: "#f37356",
  d: "#a4434b", b: "#78564e", g: "#83bb87", a: "#3d846e", h: "#c6da8a", m: "#a57d8b",
  e: "#fcb368", o: "#db854b", n: "#efe3cc", q: "#7e9b9a"
};
const patterns = {
  dumpling: [
    ".......kkkkk........",".....kkwwwwwkk......","....kwwlwllwwwk.....","...kwwlwlwlwlwwk....",
    "..kwwlwwlwlwwlwwk...","..kwlwwlwwwlwwlwk...",".kwwwwwwwwwwwwwwwk..",".kwwwwwwwwwwwwwwwk..",
    ".kwwwwwwwwwwwwlllk..","..kwwlwwwwwwllltk...","...klllllllltttk....","....kktttttttkk.....","......kkkkkkk......."
  ],
  chef: ["....kkkkk....","..kkrrrrrkk..",".krrrrrrrwwk.",".krrwwwwwrrk.","..klllllllk..","..klkllklwk..","..kllltlllk..","...ktllltk...","...kkwwwkk...","..kwwrrrwwk..",".kwwrwwwrwwk.",".kkrrwwwrrkk."],
  cabbage: [".....aaa.....","...aahhhgaa..","..ahhhghghga.",".ahhghhghhgga","aghghghgghaga","ahhghhghgagaa","agghghgghagaa",".agghghhgaga.","..agghgggaa..","...aagggaa...",".....aaa....."],
  mushroom: [".....kkk.....","...kktttkk...","..kettntttk..",".ketnnttnntk.","ketttttttnttk","kktttttttttkk","..kkwwwwwkk..","....kwwlk....","....kwwlk....","...kwwlllk...","...kkkkkkk..."],
  coin: ["....oooo....","..oelllloo..",".oelwwwlleo.",".elwllwlleo.","oewllwlleeto","oewllwlleeto","oewllwlleeto",".elwllwlleo.",".oellllleeo.","..ooeeeooo..","....oooo...."],
  clock: ["....nnnn....","..nn....nn..",".n....n...n.",".n....n...n.","n.....n....n","n.....nnn..n","n..........n",".n........n.",".n........n.","..nn....nn..","....nnnn...."],
  ticket: ["..eeeeeeee..","..ewwwwwwe..","..ewwwwwwe..","..ewkkkwwe..","..ewwwwwwe..","..ewkkkkwe..","..ewwwwwwe..","..ewkkkwwe..","..ewwwwwwe..","..ewewwewe..","...e.e..e..."],
  guide: ["nnnnn.nnnnn","n...nnn...n","n....n....n","n....n....n","n....n....n","n....n....n","n....n....n","nnnnnnnnnnn",".....n....."],
  sound: [".....n....n..","....nn.....n.","...nnn..n...n","nnnnnn...n..n","nnnnnn...n..n","nnnnnn...n..n","...nnn..n...n","....nn.....n.",".....n....n.."],
  mute: [".....n......","....nn......","...nnn..n..n","nnnnnn...nn.","nnnnnn...nn.","nnnnnn..n..n","...nnn......","....nn......",".....n......"],
  pause: ["nnn...nnn","nnn...nnn","nnn...nnn","nnn...nnn","nnn...nnn","nnn...nnn","nnn...nnn","nnn...nnn","nnn...nnn"],
  play: ["kk.......","kkkk.....","kkkkkk...","kkkkkkkk.","kkkkkkkkk","kkkkkkkk.","kkkkkk...","kkkk.....","kk......."],
  pointer: ["n..........","nn.........","nwn........","nwwn.......","nwwwn......","nwwwwn.....","nwwwwwn....","nwwwwwwn...","nwww.nnnn..","nwnwn......","nn.nwn.....","n...nwn....",".....nn...."],
  star: [".....e.....",".....l.....","....ele....","eeeeleleeee",".ellllllle.","..ellllle..","...lllll...","..ellllle..","..el...le..",".ee.....ee."],
  fold: ["....kkkkk....","..kknnnnnkk..",".knnlnlnlnnk.","knnlnlnlnlnnk","knnnnnnnnnnnk",".knnnnnnnnlk.","..klllllllk..","...kkkkkkk..."],
  steam: ["...q..q..q...","..q..q..q....","...q..q..q...",".koooooooook.","keltttttttlek","keeeeeeeeeeek","koootttttoook","keltttttttlek",".ktttttttttk.","..kkkkkkkkk.."],
  chop: [".........qq..","........qqq..",".......qqnq..","......qqnq...",".....qqnq....","....qqnq.....","...booq......","..boob.......",".boob........",".bbb........."],
  bulb: ["....ellle....","...ellllle...","..ellwwllle..","..ellwwllle..","...ellllle...","....ellle....","....ooooo....",".....ooo....."],
  check: [".........aa","........aga",".......aga.","......aga..","aa...aga...","aga.aga....",".agaga.....","..aga......","...a......."]
};
function blit(ctx, rows, x, y, palette=colors) {
  rows.forEach((row,j) => [...row].forEach((v,i) => {
    if (palette[v]) {ctx.fillStyle=palette[v];ctx.fillRect(x+i,y+j,1,1);}
  }));
}
export function drawIcon(canvas, kind=canvas.dataset.icon) {
  if (!canvas) return;
  const ctx=canvas.getContext("2d"); ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled=false;
  if (kind==="duo") {
    const green={...colors,r:"#6cae8b", d:"#387565"};blit(ctx,patterns.chef,1,1,green);blit(ctx,patterns.chef,10,4);return;
  }
  const pat=patterns[kind];if(!pat)return;
  blit(ctx,pat,Math.floor((canvas.width-pat[0].length)/2),Math.floor((canvas.height-pat.length)/2));
}

const glyphs = {
 P:["1111110","1111111","1100011","1100011","1111111","1111110","1100000","1100000","1100000"],
 L:["1100000","1100000","1100000","1100000","1100000","1100000","1100000","1111111","1111111"],
 E:["1111111","1111111","1100000","1100000","1111110","1111110","1100000","1111111","1111111"],
 A:["0011100","0111110","1110111","1100011","1100011","1111111","1111111","1100011","1100011"],
 T:["1111111","1111111","0011100","0011100","0011100","0011100","0011100","0011100","0011100"],
 S:["0111111","1111111","1100000","1100000","0111110","0011111","0000011","1111111","1111110"],
 R:["1111110","1111111","1100011","1100011","1111111","1111100","1101110","1100111","1100011"]
};
function word(ctx, value, x, y, shades) {
  const points=[];
  [...value].forEach((ch,idx) => glyphs[ch].forEach((line,row) => [...line].forEach((bit,col) => {
    if(bit==="1")points.push([x+idx*16+col*2+Math.floor((8-row)/3),y+row*2,row]);
  })));
  const paint=(dx,dy,color,sz=2)=>{ctx.fillStyle=color; for(const [x,y] of points)ctx.fillRect(x+dx,y+dy,sz,sz);};
  paint(-1,1,"#28192a",4);paint(1,3,"#28192a",4);paint(2,4,"#271c2c",3);
  paint(1,3,"#954b4b");paint(1,2,"#a95747");paint(0,1,"#cb744a");
  for(const [px,py,row] of points){
    ctx.fillStyle=shades[row<2?0:row<6?1:2];ctx.fillRect(px,py,2,2);
  }
}
export function drawWordmark(canvas) {
  const c=canvas.getContext("2d");c.clearRect(0,0,canvas.width,canvas.height);
  word(c,"PLEAT",8,1,["#fff3cd","#ffe8b5","#ffdda0"]);
  word(c,"STREET",2,22,["#ffdb91","#ffc37b","#ffac69"]);
  for(const [x,y] of [[94,8],[104,19]]) {
    c.fillStyle="#e99762";c.fillRect(x,y-2,1,5);c.fillRect(x-2,y,5,1);c.fillStyle="#ffdfa4";c.fillRect(x,y,1,1);
  }
}

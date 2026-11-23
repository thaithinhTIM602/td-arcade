const palette = {
  k:"#203a4a", b:"#30546a", q:"#548293", red:"#c34837", r:"#df6145",
  c:"#fff2cf", y:"#ffd280", a:"#bd852e", t:"#a7653b", w:"#ffffff", s:"#788b8c"
};
const tiles = {
  mail:[
    "...............","..kkkkkkkkkkk..",".kccccccccccck.",".kryyyyyyyyyrk.",".kyrcccccccryk.",".kyyrrcccrryyk.",".kyyyyrrryyyyk.",".kyyyyyyyyyyyk.",".kryyyyyyyyyrk.",".kccccccccccck.","..kkkkkkkkkkk.."
  ],
  award:[
    ".....rrrrr.....","...rryyyyyrr...","..ryyyyyyyyyr..","..ryycaaacyyr..","..ryyaccacyyr..","..ryycaaacyyr..","..ryyyyyyyyyr..","...rryyyyyrr...","....brbrbrb....","....bb...bb....","...bbb...bbb..."
  ],
  guide:["kkkkkk.kkkkkk","kccccc kcccck","kcbbbckcbbbck","kccccckccccck","kcbbbckcbbbck","kccccckccccck","kkkkkkkkkkkkk","......k......"],
  sound:[".....k....k..","....kk.....k.","...kkk..k...k","kkkkkk...k..k","kkkkkk...k..k","kkkkkk...k..k","...kkk..k...k","....kk.....k.",".....k....k.."],
  mute:[".....k.......","....kk.......","...kkk..k..k.","kkkkkk...kk..","kkkkkk...kk..","kkkkkk..k..k.","...kkk.......","....kk.......",".....k......."],
  pause:["kkk...kkk","kkk...kkk","kkk...kkk","kkk...kkk","kkk...kkk","kkk...kkk","kkk...kkk","kkk...kkk","kkk...kkk"],
  play:["ww.......","wwww.....","wwwwww...","wwwwwwww.","wwwwwwwww","wwwwwwww.","wwwwww...","wwww.....","ww......."],
  pointer:["k..........","kk.........","kck........","kcck.......","kccck......","kcccck.....","kccccck....","kcccccck...","kccc.kkkk..","kckck......","kk.kck.....","k...kck....",".....kk...."],
  beacon:[".....r....","....ryr...","...kccck..","..kkkkkkk.","....rcr...","....crc...","....rcr...","....crc...","....rcr...","...kkbkk..","..kkbbbkk."],
  wing:["...........bbb",".........bbccb",".......bbcccbb",".....bbccccbb.","..bbbcccccbb..",".bcccccccbb...",".bcccbccbb....","..bccccbb.....","...bbbbb......"],
  medal:[".....k.....","....kyk....","....kyk....","kkkkcyckkkk",".kcyyyyyck.","..kcyyyck..","...kyyyk...","..kykykyk..","..kk...kk.."]
};
export function paintIcon(canvas,name=canvas.dataset.icon) {
  if(!canvas)return;
  const g=canvas.getContext("2d");g.clearRect(0,0,canvas.width,canvas.height);
  function tile(rows,x,y,mirror=false) {
    rows.forEach((row,j)=>[...row].forEach((ch,i)=>{
      if(palette[ch]){g.fillStyle=palette[ch];g.fillRect(x+(mirror?row.length-1-i:i),y+j,1,1);}
    }));
  }
  if(name==="brand"){
    tile(tiles.wing,0,2,true);tile(tiles.wing,28,2);tile(tiles.mail,13,6);return;
  }
  const rows=tiles[name];if(!rows)return;
  tile(rows,Math.floor((canvas.width-rows[0].length)/2),Math.floor((canvas.height-rows.length)/2));
}

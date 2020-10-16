window.addEventListener('load', main)
let intervalVar;
"use strict";

let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  function array2d( nrows, ncols, val) {
    const res = [];
    for( let row = 0 ; row < nrows ; row ++) {
      res[row] = [];
      for( let col = 0 ; col < ncols ; col ++)
        res[row][col] = val(row,col);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min,max] = [Math.ceil(min), Math.floor(max)]
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  class _MSGame {
    constructor() {
      this.init(8,10,10); // easy
    }

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;
      // create an array
      this.arr = array2d(
        nrows, ncols,
        () => ({mine: false, state: STATE_HIDDEN, count: 0}));
    }

    count(row,col) {
      const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
    }
    sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement
      let allowed = [];
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
            allowed.push([r,c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for( let i = 0 ; i < this.nmines ; i ++ ) {
        let j = rndInt(i, allowed.length-1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r,c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(this.arr[r][c].state == STATE_MARKED)
            this.arr[r][c].state = STATE_HIDDEN;
          this.arr[r][c].count = this.count(r,c);
        }
      }
      let mines = []; let counts = [];
      for(let row = 0 ; row < this.nrows ; row ++ ) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
      console.log("Mines and counts after sprinkling:");
      console.log(mines.join("\n"), "\n");
    }
    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    uncover(row, col) {
      console.log("uncover", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if this is the very first move, populate the mines, but make
      // sure the current cell does not get a mine
      if( this.nuncovered === 0)
        this.sprinkleMines(row, col);
      // if cell is not hidden, ignore this move
      if( this.arr[row][col].state !== STATE_HIDDEN) return false;
      // floodfill all 0-count cells
      const ff = (r,c) => {
        if( ! this.validCoord(r,c)) return;
        if( this.arr[r][c].state !== STATE_HIDDEN) return;
        this.arr[r][c].state = STATE_SHOWN;
        this.nuncovered ++;
        if( this.arr[r][c].count !== 0) return;
        ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
        ff(r  ,c-1);         ;ff(r  ,c+1);
        ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
      };
      ff(row,col);
      // have we hit a mine?
      if( this.arr[row][col].mine) {
        this.exploded = true;
      }
      return true;
    }
    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality
    mark(row, col) {
      console.log("mark", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if cell already uncovered, refuse this
      console.log("marking previous state=", this.arr[row][col].state);
      if( this.arr[row][col].state === STATE_SHOWN) return false;
      // accept the move and flip the marked status
      this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
        STATE_HIDDEN : STATE_MARKED;
      return true;
    }
    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
      const res = [];
      for( let row = 0 ; row < this.nrows ; row ++) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          let a = this.arr[row][col];
          if( this.exploded && a.mine) s += "M";
          else if( a.state === STATE_HIDDEN) s += "H";
          else if( a.state === STATE_MARKED) s += "F";
          else if( a.mine) s += "M";
          else s += a.count.toString();
        }
        res[row] = s;
      }
      return res;
    }
    getStatus() {
      let done = this.exploded ||
          this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines
      }
    }
  }

  return _MSGame;

})();

function tile_uncover(game, ind){
  const col = ind % game.getStatus().ncols;
  const row = Math.floor(ind/game.getStatus().ncols);
  if(!game.getStatus().done){
    game.uncover(row, col);
  }
  render(game);
}

function tile_mark(game, ind){
  const col = ind % game.getStatus().ncols;
  const row = Math.floor(ind/game.getStatus().ncols);
  //mark or unmark a tile only if game has started, the game is not over and user has not used all of their marks
  if(!game.getStatus().done && game.getStatus().nuncovered !== 0 && (game.getStatus().nmines - game.getStatus().nmarked > 0)){
    game.mark(row, col);
  }
  //call game.mark() to unmark a tile that has a mark if max marks have been placed
  else if((game.getStatus().nmines - game.getStatus().nmarked === 0)){
    const renderingArray = game.getRendering();
    if(renderingArray[row][col] === "F"){
      game.mark(row, col);
    }
  }
  $("#flags").html(`${game.getStatus().nmines - game.getStatus().nmarked}`);
  render(game);
}

function add_tile_listeners(game){
  $(".tile").each(function(){
    let i = Number($(this).attr("data-tileInd"));
    
    $(this).bind("touchend", function(){
      let startTime = Number($(this).attr("data-timer"));
      let endTime = new Date();
      endTime = endTime.getTime();
      console.log(endTime - startTime);
      if(endTime - startTime >= 1000){
        tile_mark(game, i);
      }
      else{
        tile_uncover(game, i);
      }
      $(this).attr("data-timer", 0);
    }).bind("touchstart", function(){
      let start = new Date();
      start = start.getTime();
      $(this).attr("data-timer", start);
    });
    
    $(this).mouseup(function(){
      let startTime = Number($(this).attr("data-timer"));
      let endTime = new Date();
      endTime = endTime.getTime();
      //console.log(endTime - startTime);
      if(endTime - startTime >= 1000){
        tile_mark(game, i);
      }
      else{
        tile_uncover(game, i);
      }
      $(this).attr("data-timer", 0);
    }).mousedown(function(){
      let start = new Date();
      start = start.getTime();
      $(this).attr("data-timer", start);
    });
    
    //$(this).click(tile_uncover.bind(null, game, i));
  });
}

function prepare_dom(game){
  const gameBoard = document.querySelector("#gameBoard");
  const nTiles = 14*18; //max size
  for(let i = 0; i < nTiles; i++){
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.setAttribute("data-tileInd", i);
      gameBoard.appendChild(tile);
  }
  add_tile_listeners(game);
  $("h1").css("display", "none");
  $("#flags").html(`${game.getStatus().nmines}`);
  render(game);
  
}

//TODO: this method is a special rendering method to be used only on a game over 
function reveal_mines(game){
  let renderArray = game.getRendering();
  $("#gameBoard").children().each(function(){
    if(Number($(this).attr("data-tileInd")) >= game.getStatus().ncols * game.getStatus().nrows){
      $(this).css("display", "none");
    }
    else{
      const col = Number($(this).attr("data-tileInd")) % game.getStatus().ncols;
      const row = Math.floor(Number($(this).attr("data-tileInd"))/game.getStatus().ncols);
      if(renderArray[row][col] === "M"){
        $(this).css("background-color", "blue");
      }
    }
  });
}


function check_tile_content(tile, renderArray, row, col){
  if(renderArray[row][col] === "F"){
    tile.css("background-color", "red");
  }
  else if(!isNaN(renderArray[row][col])){
    tile.css("background-color", "Darkgray");
    if(renderArray[row][col] !== '0'){
      tile.text(renderArray[row][col]);
    }
  }
  else if(renderArray[row][col] === "H"){
    tile.css("display", "block");
    tile.css("background-color", "lightgray");
    tile.empty();
  }
}

function check_game_over_condition(game){
  let boom = game.getStatus().exploded;
  let done = game.getStatus().done;

  if(done){
    clearInterval(intervalVar);
    intervalVar = null;
    if(boom){
      reveal_mines(game);
    }
    else{
      console.log("you win");
    }
  }
}

function render(game){
  let renderArray = game.getRendering();
  $("#gameBoard").css("grid-template-columns", `repeat(${game.getStatus().ncols}, 1fr)`);
  $("#gameBoard").css("grid-template-rows", `repeat(${game.getStatus().nrows}, 1fr)`);

  if(game.getStatus().nuncovered !== 0 && !intervalVar){
    console.log("Started Interval");
    intervalVar = setInterval(incrementSeconds, 1000);
  }
  $("#gameBoard").children().each(function(){
    if(Number($(this).attr("data-tileInd")) >= game.getStatus().ncols * game.getStatus().nrows){
      $(this).css("display", "none");
    }
    else{
      $(this).css("display", "block");
      const col = Number($(this).attr("data-tileInd")) % game.getStatus().ncols;
      const row = Math.floor(Number($(this).attr("data-tileInd"))/game.getStatus().ncols);
      //If the game has begun and the array has been populated
      if(game.getStatus().nuncovered !== 0 && !game.getStatus().done){
        check_tile_content($(this), renderArray, row, col);
      }
      //If game has yet to begin and array is not populated
      else if(!game.getStatus().done){
        $(this).css("display", "block");
        $(this).css("background-color", "lightgray");
        $(this).empty();
      }
    }
  });
  if(game.getStatus().done){
    check_game_over_condition(game);
  }
}

function menu_button_cb(game, ncols, nrows, nmines){
  game.init(nrows, ncols, nmines);
  render(game);
  $("#flags").html(`${game.getStatus().nmines}`);
  $("#time").html("0");
  $("#time").attr("data-playTime", 0);
  if(intervalVar){
    clearInterval(intervalVar);
    intervalVar = null;
  }
  
}

function incrementSeconds(){
  let seconds = Number($("#time").attr("data-playTime")) + 1;
  $("#time").attr("data-playTime", seconds);
  $("#time").html(`${seconds}`);
}

function main(){

  let game = new MSGame();
  
  
  $(".menuButton").each(function(){
    [cols,rows,mines] = $(this).attr("data-gridSettings").split("x");
    //console.log(cols, rows, mines);
    difficulty = $(this).attr("data-difficulty");
    $(this).html(difficulty);
    $(this).click(menu_button_cb.bind(null, game, cols, rows, mines));
  });

  prepare_dom(game);
}
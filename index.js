/*
  Global Variables
*/

let board;
let game = new Chess();   //Initializes a new Chess game instance

//jQuery selectors for updating the game status and displaying FEN and PGN
let $status = $('#status');
let $fen = $('#fen');
let $pgn = $('#pgn');

//Keeps track of the pieces each side took
let capturedPieces = {
  white: [],
  black: []
};

//The color of squares that will be highlighted for legal moves
let whiteSquareGrey = '#a9a9a9';
let blackSquareGrey = '#696969';

const depthLimit = 3; //Set a depth limit for the AI search

//Each piece type has weights so that the board can evaluate them later
const weights = {
  'p': 10,
  'n': 30,
  'b': 30,
  'r': 50,
  'q': 90,
  'k': 900 //The highest since the king is the most important piece
};

/*
  Piece Square Tables (PST)
  Assigns an additional score delta to each piece based on its position on the board
*/

//PST for the player
const pst_w = {
  'p': [
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
    [1.0, 1.0, 2.0, 3.0, 3.0, 2.0, 1.0, 1.0],
    [0.5, 0.5, 1.0, 2.5, 2.5, 1.0, 0.5, 0.5],
    [0.0, 0.0, 0.0, 2.0, 2.0, 0.0, 0.0, 0.0],
    [0.5, -0.5, -1.0, 0.0, 0.0, -1.0, -0.5, 0.5],
    [0.5, 1.0, 1.0, -2.0, -2.0, 1.0, 1.0, 0.5],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
  ],
  'n': [
    [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
    [-4.0, -2.0, 0.0, 0.0, 0.0, 0.0, -2.0, -4.0],
    [-3.0, 0.0, 1.0, 1.5, 1.5, 1.0, 0.0, -3.0],
    [-3.0, 0.5, 1.5, 2.0, 2.0, 1.5, 0.5, -3.0],
    [-3.0, 0.0, 1.5, 2.0, 2.0, 1.5, 0.0, -3.0],
    [-3.0, 0.5, 1.0, 1.5, 1.5, 1.0, 0.5, -3.0],
    [-4.0, -2.0, 0.0, 0.5, 0.5, 0.0, -2.0, -4.0],
    [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
  ],
  'b': [
    [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
    [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
    [-1.0, 0.0, 0.5, 1.0, 1.0, 0.5, 0.0, -1.0],
    [-1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, -1.0],
    [-1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0],
    [-1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0],
    [-1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, -1.0],
    [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
  ],
  'r': [
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0]
  ],
  'q': [
    [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
    [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
    [-1.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
    [-0.5, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
    [0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
    [-1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
    [-1.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, -1.0],
    [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
  ],
  'k': [
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
    [-1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
    [2.0, 2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 2.0],
    [2.0, 3.0, 1.0, 0.0, 0.0, 1.0, 3.0, 2.0]
  ],
};

//PST for the AI
const pst_b = {
  'p': pst_w['p'].slice().reverse(),
  'n': pst_w['n'].slice().reverse(),
  'b': pst_w['b'].slice().reverse(),
  'r': pst_w['r'].slice().reverse(),
  'q': pst_w['q'].slice().reverse(),
  'k': pst_w['k'].slice().reverse(),
};


/* 
  AI 
*/

//Function to evaluate the current state of the board and returns a score
//A positive score favors white, while a negative score favors black
function evaluateBoard(board) {
  let score = 0; 

  //Iterates over all squares of the chessboard
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      //Adds the value of the piece on the current square to the total score
      score += getPieceValue(board[i][j], i, j);
    }
  }

  return score;
}

//Function to get the value of a piece based on its type and position
function getPieceValue(piece, x, y) {
  //Returns 0 if there is no piece on the square
  if (piece === null) {
    return 0;
  }

  let absoluteValue = getAbsoluteValue(piece, piece.color === 'w', x, y);      //Calculates the absolute value of the piece
  return piece.color === 'w' ? absoluteValue : -absoluteValue;                 //Returns positive for white pieces and negative for black pieces
}

//Helper function to calculate the absolute value of a piece based off its position on the board
function getAbsoluteValue (piece, isWhite, x, y) {
  let tables = isWhite ? pst_w : pst_b;                       //Selects the PST based on piece color
  let value = weights[piece.type] + tables[piece.type][y][x]; //Calculates value from a base weight and position table

  return value;
}

//Function to implement the minimax algorithm with alpha-beta pruning to determine the best move for the AI
function minimax(depth, game, alpha, beta, isMaximizingPlayer) {
  //If the depth limit is reached, return the board evaluation
  if (depth === 0) {
    return -evaluateBoard(game.board());
  }

  let possibleMoves = game.moves();                            //Get all possible moves for the current player
  let bestScore = isMaximizingPlayer ? -Infinity : Infinity;  //Initialize best score based on the current player

  //Iterate over all possible moves
  for (let i = 0; i < possibleMoves.length; i++) {
    game.move(possibleMoves[i]);                                              //Makes all possible move on the board
    let score = minimax(depth - 1, game, alpha, beta, !isMaximizingPlayer);   //Recursively calls minimax for the opponent, reducing depth and swapping player; setting the score to its results
    game.undo();                                                              //Undoes the move

    //Update best score based on the current player.
    if (isMaximizingPlayer) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
    } 
    else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, score);
    }

    if (beta <= alpha) {
      break;
    }
  }

  return bestScore;
}

//Function to make a move for the AI player using the minimax algorithm with alpha-beta pruning
function makeAIMove() {
  let bestMove = null;                //Keeps track of the best move
  let bestScore = -Infinity;          //Keeps track of the best score
  let possibleMoves = game.moves();   //Get all possible moves for the AI

  //Iterate over all possible moves.
  for (let i = 0; i < possibleMoves.length; i++) {
    game.move(possibleMoves[i]); //Makes the move on the board

    //Calls minimax to get the score of the move
    let score = minimax(depthLimit - 1, game, -Infinity, Infinity, false);

    game.undo();  //Undo the move to explore other possibilities

    //Update best move and score if current score is better
    if (score > bestScore) {
      bestScore = score;
      bestMove = possibleMoves[i];
    }
  }

  //If a best move was found, make the move on the board
  if (bestMove) {
    let move = game.move(bestMove);
    board.position(game.fen());
    updateCapturedPieces(move);
    updateStatus();
  }
}

/* 
  UI 
*/

//Removes the highlighted grey squares
function removeGreySquares() {
  $('#myBoard .square-55d63').css('background', '');
}

//Highlights squares for legal moves
function greySquare(square) {
  let $square = $('#myBoard .square-' + square);

  let background = whiteSquareGrey;
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey;
  }

  $square.css('background', background);
}

//Checks if a piece was captured and update the the list of captured pieces
function updateCapturedPieces(move) {
  if (move.captured) {
    let color = move.color === 'w' ? 'black' : 'white';
    capturedPieces[color].push(move.captured);
  }
}

//Updates the display of each captured chess pieces
function updateCapturedDisplay() {
  $('#player-taken').html(capturedPieces.white.map(piece => `<img src="img/chesspieces/wikipedia/w${piece}.png" />`).join(' '));
  $('#ai-taken').html(capturedPieces.black.map(piece => `<img src="img/chesspieces/wikipedia/b${piece}.png" />`).join(' '));
}

/* 
  Game
*/

//Function to reset the game
function resetGame() {
  game.reset();
  board.start();
  capturedPieces = { white: [], black: [] };
  updateStatus();
  updateCapturedDisplay();
}

document.getElementById("reset-button").addEventListener("click", resetGame);

//Function to handle the start of a piece drag on the board
function onDragStart(source, piece, position, orientation) {
  //Do not pick up pieces if the game is over or only pick up pieces for White
  if (game.game_over() || piece.search(/^b/) !== -1) {
    return false;
  }
}

//Function to handle when a piece is dropped
function onDrop(source, target) {
  removeGreySquares();

  let move = game.move({
    from: source,
    to: target,
    promotion: 'q' //Promotes to queen
  });

  //If the move is illegal, snap the piece back to its original position
  if (move === null) {
    return 'snapback';
  }

  window.setTimeout(makeAIMove, 250); //Starts movement for AI

  updateCapturedPieces(move);
  updateStatus(); //Update the game status after each move
}

function onMouseoverSquare(square, piece) {
  //Get list of possible moves for this square
  let moves = game.moves({
    square: square,
    verbose: true
  })

  //Exit if there are no moves available for this square
  if (moves.length === 0) {
    return;
  }

  //Highlight the square they moused over
  greySquare(square)

  //Highlight the possible squares for this piece
  for (let i = 0; i < moves.length; i++) {
    greySquare(moves[i].to)
  }
}

function onMouseoutSquare(square, piece) {
  removeGreySquares();
}

function onSnapEnd() {
  board.position(game.fen());
}

//Updates the board position after a piece snap
function onSnapEnd() {
  board.position(game.fen()); //Updates the board to the current FEN
}

//Updates the status of the game
function updateStatus() {
  let status = '';
  let moveColor = game.turn() === 'b' ? 'Black' : 'White'; //Determines whose turn it is

  //Checks the current status of the game and update accordingly
  if (game.in_checkmate()) {
    status = `Game over, ${moveColor} is in checkmate.`;
  }
  else if (game.in_draw()) {
    status = `Game over, drawn position`;
  }
  else {
    status = `${moveColor}'s turn`;
    if (game.in_check()) {
      status += `, ${moveColor} is in check`;
    }
  }

  //Updates the HTML elements with the new status and game details
  $status.html(status);
  $fen.html(game.fen());
  $pgn.html(game.pgn());

  updateCapturedDisplay();
}

//Configuration object for the chessboard
let config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onSnapEnd: onSnapEnd
}

board = Chessboard('myBoard', config);  //Initialize the chessboard with the specified configuration
updateStatus(); //Initial status update

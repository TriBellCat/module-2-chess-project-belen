let board;
let game = new Chess();   //Initializes a new Chess game instance

//jQuery selectors for updating the game status and displaying FEN and PGN
let $status = $('#status');
let $fen = $('#fen');
let $pgn = $('#pgn');

//Keeps track of how many pieces each side took
let capturedPieces = {
  white :[],
  black: []
};

//Squares that will be highlighted later on
let whiteSquareGrey = '#a9a9a9';
let blackSquareGrey = '#696969';

//Variables to add to the AI' scores
let addMove = 1200;
let addCapture = 1000;

//Each piece type has weights so that the board can evaluate them later
const weights = {
  'p': 100,
  'n': 280,
  'b': 320,
  'r': 479,
  'q': 929,
  'k': 60000 //Should be the highest since the king is the most important piece
};

//Piece square tables to assign an additional score delta to each piece based on its position on the board
const pst = {
'p':[
            [ 100, 100, 100, 100, 105, 100, 100,  100],
            [  78,  83,  86,  73, 102,  82,  85,  90],
            [   7,  29,  21,  44,  40,  31,  44,   7],
            [ -17,  16,  -2,  15,  14,   0,  15, -13],
            [ -26,   3,  10,   9,   6,   1,   0, -23],
            [ -22,   9,   5, -11, -10,  -2,   3, -19],
            [ -31,   8,  -7, -37, -36, -14,   3, -31],
            [   0,   0,   0,   0,   0,   0,   0,   0]
        ],
    'n': [ 
            [-66, -53, -75, -75, -10, -55, -58, -70],
            [ -3,  -6, 100, -36,   4,  62,  -4, -14],
            [ 10,  67,   1,  74,  73,  27,  62,  -2],
            [ 24,  24,  45,  37,  33,  41,  25,  17],
            [ -1,   5,  31,  21,  22,  35,   2,   0],
            [-18,  10,  13,  22,  18,  15,  11, -14],
            [-23, -15,   2,   0,   2,   0, -23, -20],
            [-74, -23, -26, -24, -19, -35, -22, -69]
        ],
    'b': [ 
            [-59, -78, -82, -76, -23,-107, -37, -50],
            [-11,  20,  35, -42, -39,  31,   2, -22],
            [ -9,  39, -32,  41,  52, -10,  28, -14],
            [ 25,  17,  20,  34,  26,  25,  15,  10],
            [ 13,  10,  17,  23,  17,  16,   0,   7],
            [ 14,  25,  24,  15,   8,  25,  20,  15],
            [ 19,  20,  11,   6,   7,   6,  20,  16],
            [ -7,   2, -15, -12, -14, -15, -10, -10]
        ],
    'r': [  
            [ 35,  29,  33,   4,  37,  33,  56,  50],
            [ 55,  29,  56,  67,  55,  62,  34,  60],
            [ 19,  35,  28,  33,  45,  27,  25,  15],
            [  0,   5,  16,  13,  18,  -4,  -9,  -6],
            [-28, -35, -16, -21, -13, -29, -46, -30],
            [-42, -28, -42, -25, -25, -35, -26, -46],
            [-53, -38, -31, -26, -29, -43, -44, -53],
            [-30, -24, -18,   5,  -2, -18, -31, -32]
        ],
    'q': [   
            [  6,   1,  -8,-104,  69,  24,  88,  26],
            [ 14,  32,  60, -10,  20,  76,  57,  24],
            [ -2,  43,  32,  60,  72,  63,  43,   2],
            [  1, -16,  22,  17,  25,  20, -13,  -6],
            [-14, -15,  -2,  -5,  -1, -10, -20, -22],
            [-30,  -6, -13, -11, -16, -11, -16, -27],
            [-36, -18,   0, -19, -15, -15, -21, -38],
            [-39, -30, -31, -13, -31, -36, -34, -42]
        ],
    'k': [  
            [  4,  54,  47, -99, -99,  60,  83, -62],
            [-32,  10,  55,  56,  56,  55,  10,   3],
            [-62,  12, -57,  44, -67,  28,  37, -31],
            [-55,  50,  11,  -4, -19,  13,   0, -49],
            [-55, -43, -52, -28, -51, -47,  -8, -50],
            [-47, -42, -43, -79, -64, -32, -29, -32],
            [ -4,   3, -14, -50, -57, -18,  13,   4],
            [ 17,  30,  -3, -14,   6,  -1,  40,  18]
        ],
};

/* 
  AI 
*/
//Function for the AI to make random moves
function makeRandomMove() {
  let possibleMoves = game.moves();

  //game over
  if (possibleMoves.length === 0) {
    return;
  }

  let randomIdx = Math.floor(Math.random() * possibleMoves.length);
  game.move(possibleMoves[randomIdx]);
  board.position(game.fen());
}

//Function to evaluates the current state of the board and returns a score.
//A positive score favors white, while a negative score favors black.
function evaluateBoard(move) {
  let score = 0; //Initializes the score to 0.

  //Iterates over all squares of the chessboard.
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = game.get(String.fromCharCode(97 + j) + (8 - i)); //Gets the piece at the current square (j, i) and convert its coordinates to algebraic notation

      //Checks if there's a piece on the square
      if (piece) {
        const pieceValue = weights[piece.type];                 //Gets the piece value from the weights object
        const piecePositionValue = pst[piece.type][i][j];  //Gets the position value from the piece-square table

        //Adds or subtract the piece value and position value to the score based on its color
        if (piece.color === 'w') {
          score += pieceValue + piecePositionValue;
        } 
        else {
          score -= pieceValue + piecePositionValue;
        }
      }
    }
  }
  
  //Evaluate the number of legal moves for each side
  const whiteMoves = game.moves({ verbose: true, legal: true }).filter(m => m.color === 'w').length;
  const blackMoves = game.moves({ verbose: true, legal: true }).filter(m => m.color === 'b').length;

  //Add scores to its movement; more moves is generally better
  score += addMove * (whiteMoves - blackMoves);

  //Adds more to score for capturing a piece
  if (move && move.captured) {
    const captureValue = weights[move.captured] * addCapture; 
    score += (move.color === 'w' ? captureValue : -captureValue);
  }

  return score;
}



//Function to implement the minimax algorithm with alpha-beta pruning to determine the best move for the AI.
function minimax(depth, alpha, beta, isMaximizingPlayer, lastMove) {
  //If the depth limit is reached or game over, return the board evaluation
  if (depth === 0 || game.game_over()) {
    return evaluateBoard(lastMove);
  }

  let possibleMoves = game.moves();                           //Get all possible moves for the current player.
  let bestScore = isMaximizingPlayer ? -Infinity : Infinity;  //Initialize best score based on the current player.

  //Iterate over all possible moves.
  for (let i = 0; i < possibleMoves.length; i++) {
    game.move(possibleMoves[i]);                                       //Makes the move on the board
    let score = minimax(depth - 1, alpha, beta, !isMaximizingPlayer); //Recursively call minimax for the opponent, reducing depth and swapping player.
    game.undo();                                                      //Undo the move to explore other possibilities

    //Update best score based on the current player.
    if (isMaximizingPlayer) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);
    }
    else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, bestScore);
    }

    //If beta is less than or equal to alpha, prune the branch.
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
  let possibleMoves = game.moves({ verbose: true });   //Get all possible moves for the AI.
  const depthLimit = 3;               //Set a depth limit for the AI search

   //Sort moves to prioritize captures
   possibleMoves.sort((a, b) => {
    const aCaptureValue = a.captured ? weights[a.captured] : 0;
    const bCaptureValue = b.captured ? weights[b.captured] : 0;
    return bCaptureValue - aCaptureValue; //Descending order
  });

  //Iterate over all possible moves.
  for (let i = 0; i < possibleMoves.length; i++) {
    game.move(possibleMoves[i]); //Makes the move on the board.
    
    //Calls minimax to get the score of the move
    let score = minimax(depthLimit - 1, -Infinity, Infinity, false, possibleMoves[i]);  
    
    game.undo(); //Undo the move to explore other possibilities.

    //Update best move and score if current score is better.
    if (score > bestScore) {
      bestScore = score;
      bestMove = possibleMoves[i];
    }
  }

  //If a best move was found, make the move on the board.
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
  //do not pick up pieces if the game is over or only pick up pieces for White
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

  window.setTimeout(makeAIMove, 250); //make random legal move for black

  updateCapturedPieces(move);
  updateStatus(); //Update the game status after each move
}

function onMouseoverSquare(square, piece) {
  //get list of possible moves for this square
  let moves = game.moves({
    square: square,
    verbose: true
  })

  //exit if there are no moves available for this square
  if (moves.length === 0) {
    return;
  }

  //highlight the square they moused over
  greySquare(square)

  //highlight the possible squares for this piece
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
    status = 'Game over, drawn position';
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

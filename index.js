let board;
let game = new Chess();   //Initializes a new Chess game instance

//jQuery selectors for updating the game status and displaying FEN and PGN
let $status = $('#status');
let $fen = $('#fen');
let $pgn = $('#pgn');

//Squares that will be highlighted later on
let whiteSquareGrey = '#a9a9a9';
let blackSquareGrey = '#696969';

//Each piece type has weights so that the board can evaluate them later
const weights = {
  'p': 1,
  'n': 3,
  'b': 3,
  'r': 5,
  'q': 9,
  'k': 200 //Should be the highest since the king is the most important piece
};

/* 
  Highlight Squares 
*/

function removeGreySquares() {
  $('#myBoard .square-55d63').css('background', '');
}

function greySquare(square) {
  let $square = $('#myBoard .square-' + square);

  let background = whiteSquareGrey;
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey;
  }

  $square.css('background', background);
}

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
function evaluateBoard() {
  let score = 0; //Initializes the score to 0.

  //Iterates over all squares of the chessboard.
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = game.get(String.fromCharCode(97 + j) + (8 - i)); //Gets the piece at the current square (j, i).

      //Checks if there's a piece on the square
      if (piece) {
        const pieceValue = weights[piece.type]; //Gets the piece value from the weights object.

        //Add or subtract the piece value to the score based on its color.
        if (piece.color === 'w') {
          score += pieceValue;
        }

        else {
          score -= pieceValue;
        }
      }
    }
  }
  return score;
}

//Function to implement the minimax algorithm with alpha-beta pruning to determine the best move for the AI.
function minimax(depth, alpha, beta, isMaximizingPlayer) {
  //If the depth limit is reached or game over, return the board evaluation.
  if (depth === 0 || game.game_over()) {
    return evaluateBoard();
  }

  let possibleMoves = game.moves(); //Get all possible moves for the current player.
  let bestScore = isMaximizingPlayer ? -Infinity : Infinity; //Initialize best score based on the current player.

  //Iterate over all possible moves.
  for (let i = 0; i < possibleMoves.length; i++) {
    game.move(possibleMoves[i]);   //Make the move on the board.
    let score = minimax(depth - 1, alpha, beta, !isMaximizingPlayer); //Recursively call minimax for the opponent, reducing depth and swapping player.
    game.undo(); //Undo the move to explore other possibilities

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
  //Initialize variables to track the best move and score.
  let bestMove = null;
  let bestScore = -Infinity;

  //Get all possible moves for the AI.
  let possibleMoves = game.moves();

  //Set a depth limit for the AI search
  const depthLimit = 3;

  //Iterate over all possible moves.
  for (let i = 0; i < possibleMoves.length; i++) {
    game.move(possibleMoves[i]);  //Make the move on the board.
    let score = minimax(depthLimit - 1, -Infinity, Infinity, false);//Call minimax to get the score of the move, AI is the minimizing player..
    game.undo();  //Undo the move to explore other possibilities.

    //Update best move and score if current score is better.
    if (score > bestScore) {
      bestScore = score;
      bestMove = possibleMoves[i];
    }
  }

  //If a best move was found, make the move on the board.
  if (bestMove) {
    game.move(bestMove);
    board.position(game.fen());
    updateStatus();
  }
}

/* 
  Game
*/
//Function to handle the start of a piece drag on the board
function onDragStart(source, piece, position, orientation) {
  //do not pick up pieces if the game is over
  //or only pick up pieces for White
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

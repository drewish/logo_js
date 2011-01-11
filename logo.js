(function () {
  var cmdMove = function (distance) {
    ctx.translate(distance, 0);
    ctx.lineTo(0, 0);// if pen up ctx.moveTo(0, 0);
  };
  var cmdRotate = function (degrees) {
    ctx.rotate((degrees * Math.PI / 180));
  };
  var cmdClearScreen = function () {
    ctx.setTransform(1, 0, 0, 1, 0, 0) 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 2); 
    ctx.beginPath();
    ctx.moveTo(0, 0);
  }

  var commands = {
    'REPEAT': {
      'args': ['s', 'v'],
      'f': function (count, commands) {
        var i;
        for (i = 0; i < count; i++) {
          evalTree(commands.slice(0));
        }
      }
    },
    'FORWARD': {
      'args': ['s'],
      'f': cmdMove
    },
    'BACK': {
      'args': ['s'],
      'f': function (distance) { cmdMove(-distance); }
    },
    'LEFT': {
      'args': ['s'],
      'f': function (deg) { cmdRotate(-deg); }
    },
    'RIGHT': {
      'args': ['s'],
      'f': cmdRotate
    },
    'CLEARSCREEN': {
      'args': [],
      'f': cmdClearScreen
    }
  };
    
  var tokenizeInput = function (input) {
    return input
      // Remove comments (semi-colon to end of line).
      .replace(/;.*?\n/g, '')
      // Add whitespace around square brackets so they split correctly.
      .replace('[', ' [ ')
      .replace(']', ' ] ')
      // Remove leading or trailing whitespace.
      .trim()
      // Tokenize the input
      .split(/\s+/);
  };
  
  var parseTokens = function (tokens) {
    var t = null, tree = [];
    while (tokens.length) {
      switch (t = tokens.shift()) {
        case '[':
          tree.push(parseTokens(tokens));
          break;
        case ']':
          return tree;
        default:
          tree.push(t);
      }
    }
    return tree;
  };

  var evalTree = function (tree) {
    var t;
    while (tree.length) {
      t = tree.shift();
      if (command = commands[t.toUpperCase()]) {
        // Check that the correct arguments are available.
        var args = [], arg;
        for (var i = 0; i < command.args.length; i++) {
          arg = tree.shift();
          args.push(arg);
        }
        console.log(t.toUpperCase() + ": " + args);
        command.f.apply(this, args);
      }
      else {
        console.log("unknow command " + t);
      }
    }
  }

  var runInput = function (input) {
    var tokens = tokenizeInput(input);
    var tree = parseTokens(tokens);
console.log(tree);
    evalTree(tree);
    
    ctx.stroke();		// show the track
    
    ctx.beginPath(); // start turtle display
    ctx.moveTo(0,-5);
    ctx.lineTo(20,0);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();
  }

  var canvas = document.getElementById('can'),
    ctx;

  $('#console').css({
    'width': window.innerWidth / 2,
    'height': window.innerHeight,
  });
  $('#run').click(function (e) {
    runInput( $('#program').val() );
    e.preventDefault();
  });

  canvas.width = window.innerWidth / 2;
  canvas.height = window.innerHeight;
  
  ctx = canvas.getContext('2d');
  cmdClearScreen()
  ctx.strokeStyle = "#000"; 
})()

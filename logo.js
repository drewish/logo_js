(function () {
  var cmdMove = function (distance) {
    ctx.translate(distance, 0);
    if (state.penDown) {
      ctx.lineTo(0, 0);
    }
    else {
      ctx.moveTo(0, 0);
    }
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

  var state = {
    penDown: true,
  };
  var variables = {};
  /*
   arg types:
     v = value
     s = symbol (variable name)
     b = block of commands
  */ 
  var commands = {
    // FLOW
    'REPEAT': {
      'args': ['v', 'b'],
      'f': function (count, commands) {
        var i;
        for (i = 0; i < count; i++) {
          evalTree(commands.slice(0));
        }
      }
    },
    // MOVEMENT
    'FORWARD': {
      'args': ['v'],
      'f': cmdMove
    },
    'BACK': {
      'args': ['v'],
      'f': function (distance) { cmdMove(-distance); }
    },
    'LEFT': {
      'args': ['v'],
      'f': function (deg) { cmdRotate(-deg); }
    },
    'RIGHT': {
      'args': ['v'],
      'f': cmdRotate
    },
    // DISPLAY
    'CLEARSCREEN': {
      'args': [],
      'f': cmdClearScreen
    },
    'PENUP': {
      'args': [],
      'f': function () { 
        state.penDown = false;
      }
    },
    'PENDOWN': {
      'args': [],
      'f': function () {
        state.penDown = true;
      }
    },
    'SETPENCOLOUR': {
      'args': ['v'],
      'f': function (value) {
        var palette = [
          '#000000', // black
          '#0000ff', // blue
          '#00ff00', // green
          '#00ffff', // cyan
          '#ff0000', // red
          '#ff00ff', // magenta
          '#ffff00', // yellow
          '#ffffff', // white
          '#8b4513', // brown
          '#d2b48c', // tan
          '#228b22', // forest
          '#00ffff', // aqua
          '#fa8072', // salmon
          '#a020f0', // purple
          '#ffa500', // orange
          '#bebebe'  // grey
        ];
        if (palette[value]) {
          // We want to stroke the current path then start a new one with the 
          // current location as the first point.
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.strokeStyle = palette[value];
        }
      }
    },
    'PRINT': {
      'args': ['v'],
      'f': function (arg) { console.log(arg); }
    },
    // VARIABLES
    'MAKE': {
      'args': ['s', 'v'],
      'f': function (name, value) {
        variables[name] = value;
        return value;
      }
    },
    // MATH
    'SUM': {
      'args': ['v', 'v'],
      'f': function (left, right) {
        return left + right;
      }
    },
    'DIFFERENCE': {
      'args': ['v', 'v'],
      'f': function (left, right) {
        return left - right;
      }
    },
    'MINUS': {
      'args': ['v'],
      'f': function (value) {
        return -value;
      }
    }
  };
  var aliases = {
    'CS': 'CLEARSCREEN',
    'FD': 'FORWARD',
  };
  
  
  var tokenizeInput = function (input) {
    var lines = input.split(/\n/g),
      tokens = [],
      token,
      words,
      word;

    for (var i = 0, ll = lines.length; i < ll; i++) {
      words = lines[i]
        // Remove comments (semi-colon to end of line).
        .replace(/;.*?$/, '')
        // Add whitespace around square brackets so they split correctly.
        .replace('[', ' [ ')
        .replace(']', ' ] ')
        // Remove leading or trailing whitespace.
        .trim()
        // Split by white space.
        .split(/\s+/);
      for (var j = 0, wl = words.length; j < wl; j++) {
        if (words[j]) {
          tokens.push({
            line: i + 1,
            value: words[j].toUpperCase()
          });
        }
      }
    }

    return tokens;
  };

  var parseTokens = function (tokens) {
    var token, tree = [];
    while (tokens.length) {
      token = tokens.shift();
      switch (token.value) {
      case '[':
        tree.push(parseTokens(tokens));
        break;

      case ']':
        return tree;

      default:
        if (token.value[0] == ':') {
          token.type = 'symbol';
          token.value = token.value.substr(1);
        }
        else if (token.value[0] == '"') {
          token.type = 'value';
          token.value = token.value.substr(1);
        }
        else if (parseInt(token.value).toString() == token.value) {
          token.type = 'value';
          token.value = parseInt(token.value);
        }
        else if (parseFloat(token.value).toString() == token.value) {
          token.type = 'value';
          token.value = parseFloat(token.value);
        }
        else {
          token.type = 'command';
          // Look up aliases.
          token.command = commands[aliases[token.value] || token.value];
        }
        tree.push(token);
      }
    }
    return tree;
  };

  var evalTree = function (tree) {
    var token;
    while (tree.length) {
      token = tree.shift();
      if (token.command) {
        executeCommand(token, tree);
      }
      else {
        console.log("Unknown command " + token.value + " on line " + token.line);
        return false;
      }
    }
  }

  var executeCommand = function (token, tree) {
    // Check that the correct arguments are available.
    var command = token.command, args = [], arg;

    for (var i = 0, l = command.args.length; i < l; i++) {
      // TODO check argument types against expected types.
      arg = tree.shift();
      if (arg.type == 'value') {
        args.push(arg.value);
      }
      else if (arg.type == 'symbol') {
        args.push(variables[arg.value]);
      }
      else if (arg.type == 'command') {
        args.push(executeCommand(arg, tree));
      }
      else {
        args.push(arg);
      }
    }
    console.log(token.value + ": " + args);
    return token.command.f.apply(this, args);
  }

  var runInput = function (input) {
    var tokens = tokenizeInput(input);
    var tree = parseTokens(tokens);
    evalTree(tree);
    
    // show the track
    ctx.stroke();
    
    // start turtle display
    ctx.beginPath(); 
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

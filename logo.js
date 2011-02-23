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
    'REPEAT': {
      'args': ['v', 'b'],
      'f': function (count, commands) {
        var i;
        for (i = 0; i < count; i++) {
          evalTree(commands.slice(0));
        }
      }
    },
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
    'CLEARSCREEN': {
      'args': [],
      'f': cmdClearScreen
    },
    'PRINT': {
      'args': ['v'],
      'f': function (arg) { console.log(arg); }
    },
    'MAKE': {
      'args': ['s', 'v'],
      'f': function (name, value) { variables[name] = value }
    },
    'PENUP': {
      'args': [],
      'f': function () { state.penDown = false }
    },
    'PENDOWN': {
      'args': [],
      'f': function () { state.penDown = true }
    },
    'SETPENCOLOUR': {
      'args': ['v'],
      'f': function () {}
    },
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
          token.value = token.value;
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
    var token, command, args, arg;
    while (tree.length) {
      token = tree.shift();
      if (token.command) {
        // Check that the correct arguments are available.
        args = [];
        command = token.command;
        for (var i = 0, l = command.args.length; i < l; i++) {
          // TODO check argument types against expected types.
          arg = tree.shift();
//          console.log(arg);
//          console.log(command.args[i]);
          if (arg.type == 'value') {
            args.push(arg.value);
          }
          else if (arg.type == 'symbol') {
            args.push(variables[arg.value]);
          }
          else {
            args.push(arg);
          }
          
        }
        console.log(token.value + ": " + args);
        token.command.f.apply(this, args);
      }
      else {
        console.log("unknown command " + token.value + " on line " + token.line);
        return false;
      }
    }
  }

  var runInput = function (input) {
    var tokens = tokenizeInput(input);
    var tree = parseTokens(tokens);
console.log(tree);
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

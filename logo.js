/* jshint laxcomma: true */

function Logo(ctx) {
  ctx.strokeStyle = "#000";

  this.state = {
    penDown: true,
    heading: 0,
    x: 0,
    y: 0
  };
  this.variables = {};
  this.ctx = ctx;
  this.clearScreen();
}

Logo.prototype.runInput = function (input) {
  var tokens = this.tokenizeInput(input);
  var tree = this.parseTokens(tokens);
  this.evalTree(tree);

  // show the track
  this.ctx.stroke();

  this.drawTurtle();
};

Logo.prototype.tokenizeInput = function (input) {
  var lines = input.split(/\n/g)
    , tokens = []
    , words, i, j, ll, wl;

  for (i = 0, ll = lines.length; i < ll; i++) {
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
    for (j = 0, wl = words.length; j < wl; j++) {
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

Logo.prototype.parseTokens = function (tokens) {
  var token, tree = [];
  while (tokens.length) {
    token = tokens.shift();
    switch (token.value) {
    case '[':
      tree.push(this.parseTokens(tokens));
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
      else if (parseInt(token.value, 10).toString() == token.value) {
        token.type = 'value';
        token.value = parseInt(token.value, 10);
      }
      else if (parseFloat(token.value).toString() == token.value) {
        token.type = 'value';
        token.value = parseFloat(token.value);
      }
      else {
        token.type = 'command';
        // Look up aliases.
        token.command = this.commands[this.aliases[token.value] || token.value];
      }
      tree.push(token);
    }
  }
  return tree;
};

Logo.prototype.evalTree = function (tree) {
  var token;
  while (tree.length) {
    token = tree.shift();
    if (token.command) {
      this.evalToken(token, tree);
    }
    else {
      console.log("Unknown command " + token.value + " on line " + token.line);
      return false;
    }
  }
};

Logo.prototype.evalToken = function (token, tree) {
  // Check that the correct arguments are available.
  var command = token.command, args = [], arg;

  for (var i = 0, l = command.args.length; i < l; i++) {
    // TODO check argument types against expected types.
    arg = tree.shift();
    if (arg.type == 'value') {
      args.push(arg.value);
    }
    else if (arg.type == 'symbol') {
      args.push(this.variables[arg.value]);
    }
    else if (arg.type == 'command') {
      args.push(this.evalToken(arg, tree));
    }
    else {
      args.push(arg);
    }
  }
  console.log(token.value + ": " + args);
  return token.command.f.apply(this, args);
};



Logo.prototype.aliases = {
  'CS': 'CLEARSCREEN',
  'FD': 'FORWARD',
};

Logo.prototype.commands = {};

/*
 arg types:
   v = value
   s = symbol (variable name)
   b = block of commands
*/
// CONTROL FLOW
Logo.prototype.commands.REPEAT = {
  'args': ['v', 'b'],
  'f': function (count, commands) {
    var i;
    for (i = 0; i < count; i++) {
      this.evalTree(commands.slice(0));
    }
  }
};
// MOVEMENT
Logo.prototype.commands.FORWARD = {
  'args': ['v'],
  'f': Logo.prototype.move
};
Logo.prototype.commands.BACK = {
  'args': ['v'],
  'f': function (distance) {
    this.move(-distance);
  }
};
Logo.prototype.commands.LEFT = {
  'args': ['v'],
  'f': function (degrees) {
    this.ctx.rotate((-degrees * Math.PI / 180));
  }
};
Logo.prototype.commands.RIGHT = {
  'args': ['v'],
  'f': function (degrees) {
    this.ctx.rotate((degrees * Math.PI / 180));
  }
};
// DISPLAY
Logo.prototype.commands.CLEARSCREEN = {
  'args': [],
  'f': Logo.prototype.clearScreen
};
Logo.prototype.commands.PENUP = {
  'args': [],
  'f': function () {
    this.state.penDown = false;
  }
};
Logo.prototype.commands.PENDOWN = {
  'args': [],
  'f': function () {
    this.state.penDown = true;
  }
};
Logo.prototype.commands.SETPENCOLOUR = {
  'args': ['v'],
  'f': function (value) {
    var ctx = this.ctx
      , palette = [
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
};
Logo.prototype.commands.PRINT = {
  'args': ['v'],
  'f': function (arg) { console.log(arg); }
};
// VARIABLES
Logo.prototype.commands.MAKE = {
  'args': ['s', 'v'],
  'f': function (name, value) {
    this.variables[name] = value;
    return value;
  }
};
// MATH
Logo.prototype.commands.SUM = {
  'args': ['v', 'v'],
  'f': function (left, right) {
    return left + right;
  }
};
Logo.prototype.commands.DIFFERENCE = {
  'args': ['v', 'v'],
  'f': function (left, right) {
    return left - right;
  }
};
Logo.prototype.commands.MINUS = {
  'args': ['v'],
  'f': function (value) {
    return -value;
  }
};

Logo.prototype.clearScreen = function () {
  var ctx = this.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
};

Logo.prototype.move = function (distance) {
  var ctx = this.ctx;
  ctx.translate(distance, 0);
  if (this.state.penDown) {
    ctx.lineTo(0, 0);
  }
  else {
    ctx.moveTo(0, 0);
  }
};

Logo.prototype.drawTurtle = function () {
  var ctx = this.ctx;
  ctx.beginPath();
  ctx.moveTo(0,-5);
  ctx.lineTo(20,0);
  ctx.lineTo(0, 5);
  ctx.closePath();
  ctx.fill();
};


(function () {
  var con = document.getElementById('console')
    , canvas = document.getElementById('can')
    , ctx = canvas.getContext('2d');

  con.style.width = window.innerWidth / 2 + "px";
  con.style.height = window.innerHeight + "px";
  canvas.width = window.innerWidth / 2;
  canvas.height = window.innerHeight;

  var logo = new Logo(ctx);

  document.getElementById('run').addEventListener('click', function(e) {
    e.preventDefault();
    logo.runInput(document.getElementById('program').value);
  }, false);
})();

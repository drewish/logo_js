/* jshint laxcomma: true */

function Turtle(emitter) {
  this.visible = true;
  this.emitter = emitter;
  this.color = 'black';
  this.drawing = true;
  this.goHome();
  this.startPath();
}

Turtle.prototype.startPath = function () {
  if (this.drawing) {
    // TODO we should avoid starting new paths if we didn't move in our old one.
    var info = { x: this.x, y: this.y, color: this.color };
    this.emitter.trigger('path.start', info);
  }
};

Turtle.prototype.endPath = function () {
  if (this.drawing) {
    this.emitter.trigger('path.end');
  }
};

Turtle.prototype.penUp = function () {
  this.endPath();
  this.drawing = false;
};

Turtle.prototype.penDown = function () {
  if (!this.drawing) {
    this.drawing = true;
    this.startPath();
  }
};

Turtle.prototype.penColor = function (color) {
  if (this.color != color) {
    this.color = color;
    this.endPath();
    this.startPath();
    this.update();
  }
};

Turtle.prototype.goHome = function () {
  this.endPath();
  this.x = 0;
  this.y = 0;
  this.angle = 0;
  this.update();
  this.startPath();
};

Turtle.prototype.move = function(distance) {
  var rads = this.angle * Math.PI / 180
    , dx = distance * Math.sin(rads)
    , dy = distance * Math.cos(rads)
    ;
  if (this.drawing) {
    this.emitter.trigger('path.delta', { dx: dx, dy: dy });
  }
  this.x += dx;
  this.y += dy;
  this.update();
};

Turtle.prototype.rotate = function(degrees) {
  this.angle = (this.angle + degrees) % 360;
  this.update();
};

Turtle.prototype.show = function() {
  this.visible = true;
  this.update();
};

Turtle.prototype.hide = function() {
  this.visible = false;
  this.update();
};

Turtle.prototype.update = function () {
  this.emitter.trigger('turtle.change', this);
};


// * * *


// TODO: these callbacks are silly.
function Logo() {
  this.events = {};
  this.variables = {};
  this.ast = [];
  this.stack = [];
  this.turtle = new Turtle(this);
}

// Micro event emitter
Logo.prototype.on = function(event, callback) {
  this.events[event] = this.events[event] || [];
  this.events[event].push(callback);
  return this;
};
Logo.prototype.off = function(event, callback) {
  this.events[event] = this.events[event] || [];
  if (event in this.events) {
    this.events[event].splice(this.events[event].indexOf(callback), 1);
  }
  return this;
};
Logo.prototype.trigger = function(event /* ...args */) {
  if (event in this.events) {
    for (var i = 0, len = this.events[event].length; i < len; i++) {
      this.events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
    }
  }
  return this;
};

Logo.prototype.runInput = function (input) {
  var tokens = this.tokenizeInput(input)
    , tree = this.parseTokens(tokens)
    , token;
  while ((token = tree.shift())) {
    token.evaluate(tree);
  }
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
    if (token.value == '[') {
      tree.push(new ListToken(this.parseTokens(tokens), token.line, this));
    }
    else if (token.value == ']') {
      return tree;
    }
    else {
      if (token.value[0] == ':') {
        token = new SymbolToken(token.value.substr(1), token.line, this);
      }
      else if (token.value[0] == '"') {
        token = new WordToken(token.value.substr(1), token.line, this);
      }
      else if (parseInt(token.value, 10).toString() == token.value) {
        token = new NumberToken(parseInt(token.value, 10), token.line, this);
      }
      else if (parseFloat(token.value).toString() == token.value) {
        token = new NumberToken(parseFloat(token.value), token.line, this);
      }
      else {
        token = new CommandToken(token.value, token.line, this);
      }
      tree.push(token);
    }
  }
  return tree;
};

function Token (value, line, context) {
}
Token.prototype.evaluate = function () {
  return this.value;
};

function ListToken (value, line, context) {
  this.line = line;
  this.value = value;
}
ListToken.prototype = new Token();

function WordToken (value, line, context) {
  this.line = line;
  this.value = value;
}
WordToken.prototype = new Token();

function NumberToken (value, line, context) {
  this.line = line;
  this.value = value;
}
NumberToken.prototype = new Token();

// TODO I'm not in love with the name... VariableToken maybe?
function SymbolToken (value, line, context) {
  this.line = line;
  this.value = value;
  this.context = context;
}
SymbolToken.prototype = new Token();
SymbolToken.prototype.evaluate = function () {
  return this.context.variables[this.value];
};

function CommandToken (value, line, context) {
  this.line = line;
  // Look up aliases.
  this.value = context.aliases[value] || value;
  this.command = context.commands[this.value];
  this.context = context;
}
CommandToken.prototype = new Token();
CommandToken.prototype.evaluate = function (list) {
  // Check that the correct arguments are available.
  var command = this.command, args = [], token;

  if (!command) {
    console.log("Unknown command " + this.value + " on line " + this.line);
    return false;
  }

// TODO: check that there are enough args available
  for (var i = 0, l = command.args.length; i < l; i++) {
    // TODO check argument types against expected types.
    token = list.shift();
    if (token instanceof CommandToken) {
      args.push(token.evaluate(list));
    }
    else {
      args.push(token.evaluate());
    }
  }

  //console.log(token.value + ": " + args);
  return this.command.f.apply(this.context, args);
};


Logo.prototype.aliases = {
  'CS': 'CLEARSCREEN',
  'FD': 'FORWARD',
  'BK': 'BACKWARD',
  'RT': 'RIGHT',
  'LT': 'LEFT',
  'PU': 'PENUP',
  'PD': 'PENDOWN',
  'ST': 'SHOWTURTLE',
  'HT': 'HIDETURTLE',
  'SETPENCOLOR': 'SETPENCOLOUR'
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
  'args': [NumberToken, ListToken],
  'f': function (count, list) {
    var copy, i, token, result;
    for (i = 0; i < count; i++) {
      // Need to reuse the same tokens each time through the loop.
      copy = list.slice(0);
      while (copy.length) {
        result = copy.shift().evaluate(copy);
      }
    }
    return result;
  }
};
// MOVEMENT
Logo.prototype.commands.FORWARD = {
  'args': [NumberToken],
  'f': function (distance) {
    this.turtle.move(distance);
  }
};
Logo.prototype.commands.BACK = {
  'args': [NumberToken],
  'f': function (distance) {
    this.turtle.move(-distance);
  }
};
Logo.prototype.commands.LEFT = {
  'args': [NumberToken],
  'f': function (degrees) {
    this.turtle.rotate(-degrees);
  }
};
Logo.prototype.commands.RIGHT = {
  'args': [NumberToken],
  'f': function (degrees) {
    this.turtle.rotate(degrees);
  }
};
// DISPLAY
Logo.prototype.commands.HOME = {
  'args': [],
  'f': function () { this.turtle.goHome(); }
};
Logo.prototype.commands.CLEAN = {
  'args': [],
  'f': function () {
    this.trigger('path.remove_all');
    this.turtle.startPath();
  }
};
Logo.prototype.commands.CLEARSCREEN = {
  'args': [],
  'f': function () {
    this.commands.CLEAN.f.apply(this);
    this.commands.HOME.f.apply(this);
  }
};
Logo.prototype.commands.SHOWTURTLE = {
  'args': [],
  'f': function() { this.turtle.show(); },
};
Logo.prototype.commands.HIDETURTLE = {
  'args': [],
  'f': function() { this.turtle.hide(); },
};
Logo.prototype.commands.PENUP = {
  'args': [],
  'f': function () { this.turtle.penUp(); }
};
Logo.prototype.commands.PENDOWN = {
  'args': [],
  'f': function () { this.turtle.penDown(); }
};
Logo.prototype.commands.SETPENCOLOUR = {
  'args': [NumberToken],
  'f': function (value) {
    var palette = [
          'black', 'blue', 'green', 'cyan', 'red', 'magenta', 'yellow', 'white',
          'brown', 'tan', 'forest', 'aqua', 'salmon', 'purple', 'orange', 'grey'
        ];
    if (palette[value]) {
      this.turtle.penColor(palette[value]);
    }
  }
};
Logo.prototype.commands.PRINT = {
  'args': [null],
  'f': function (arg) { console.log(arg); }
};
// VARIABLES
Logo.prototype.commands.MAKE = {
  'args': [WordToken, null],
  'f': function (name, value) {
    this.variables[name] = value;
    return value;
  }
};
// MATH
Logo.prototype.commands.SUM = {
  'args': [NumberToken, NumberToken],
  'f': function (left, right) {
    return left + right;
  }
};
Logo.prototype.commands.DIFFERENCE = {
  'args': [NumberToken, NumberToken],
  'f': function (left, right) {
    return left - right;
  }
};
Logo.prototype.commands.MINUS = {
  'args': [NumberToken],
  'f': function (value) {
    return -value;
  }
};
Logo.prototype.commands.PRODUCT = {
  'args': [NumberToken, NumberToken],
  'f': function (left, right) {
    return left * right;
  }
};
Logo.prototype.commands.QUOTIENT = {
  'args': [NumberToken, NumberToken],
  'f': function (left, right) {
    return left / right;
  }
};

var module = module || {};
module.exports = Logo;

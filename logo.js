/* jshint laxcomma: true */

function Turtle(element) {
  this.element = element;
  this.color = 'black';
  this.drawing = true;
  this.goHome();
  this.startNewPath();
}

Turtle.prototype.startNewPath = function() {
  var path;
  if (this.drawing) {
    path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.classList.add('trail');
    path.setAttribute('d', 'M ' + this.x + ',' + this.y);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', this.color);
    path.setAttribute('stroke-width', 2);
    // TODO: it'd be nice to avoid hardcoding this id
    document.getElementById('slate').appendChild(path);
  }
  this.path = path;
};

Turtle.prototype.penUp = function () {
  this.drawing = false;
  this.path = null;
};

Turtle.prototype.penDown = function () {
  this.drawing = true;
  this.startNewPath();
};

Turtle.prototype.penColor = function (color) {
  if (this.color != color) {
    this.color = color;
    this.startNewPath();
  }
};

Turtle.prototype.goHome = function() {
  this.path = null;
  this.x = 0;
  this.y = 0;
  this.angle = 0;
  this.update();
};

Turtle.prototype.move = function(distance) {
  var rads = this.angle * Math.PI / 180
    , dx = distance * Math.sin(rads)
    , dy = distance * Math.cos(rads)
    ;
  if (this.path) {
    this.path.setAttribute('d', this.path.getAttribute('d') + ' l ' + dx + ',' + dy);
  }
  this.x += dx;
  this.y += dy;
  this.update();
};

Turtle.prototype.rotate = function(degrees) {
  this.angle = (this.angle + degrees) % 360;
  this.update();
};

Turtle.prototype.update = function () {
  // Headings (angles) are measured in degrees clockwise from the positive Y
  // axis.
  var transform = 'translate(' + this.x + ',' + this.y +') rotate(' + -this.angle + ')';
  this.element.setAttribute('transform', transform);
};

// * * *

function Logo() {
  this.turtle = new Turtle(document.getElementById('turtle'));
  this.variables = {};
}

Logo.prototype.runInput = function (input) {
  var tokens = this.tokenizeInput(input);
  var tree = this.parseTokens(tokens);
  return this.evalTree(tree);
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
    if (!token.command) {
      console.log("Unknown command " + token.value + " on line " + token.line);
      return false;
    }
    this.evalToken(token, tree);
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
  //console.log(token.value + ": " + args);
  return token.command.f.apply(this, args);
};

Logo.prototype.aliases = {
  'CS': 'CLEARSCREEN',
  'FD': 'FORWARD',
  'PU': 'PENUP',
  'PD': 'PENDOWN',
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
  'f': function (distance) {
    this.turtle.move(distance);
  }
};
Logo.prototype.commands.BACK = {
  'args': ['v'],
  'f': function (distance) {
    this.turtle.move(-distance);
  }
};
Logo.prototype.commands.LEFT = {
  'args': ['v'],
  'f': function (degrees) {
    this.turtle.rotate(-degrees);
  }
};
Logo.prototype.commands.RIGHT = {
  'args': ['v'],
  'f': function (degrees) {
    this.turtle.rotate(degrees);
  }
};
// DISPLAY
Logo.prototype.commands.HOME = {
  'args': [],
  'f': function() { this.turtle.goHome(); }
};
Logo.prototype.commands.CLEAN = {
  'args': [],
  'f': function() {
    var paths = document.getElementsByClassName('trail');
    while (paths.length) {
      paths[0].remove();
    }
    this.turtle.startNewPath();
  }
};
Logo.prototype.commands.CLEARSCREEN = {
  'args': [],
  'f': function() {
    this.commands.CLEAN.f.apply(this);
    this.commands.HOME.f.apply(this);
  }
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
  'args': ['v'],
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

(function () {
  var con = document.getElementById('console');

  con.style.width = window.innerWidth / 2 + "px";
  con.style.height = window.innerHeight + "px";

  var logo = new Logo();

  document.getElementById('run').addEventListener('click', function(e) {
    e.preventDefault();
    logo.runInput(document.getElementById('program').value);
  }, false);
})();

/* jshint laxcomma: true */

function Logo() {
  this.state = {
    penDown: true,
    color: '#000000',
    // The center of the graphics window (which may or may not be the entire
    // screen, depending on the machine used) is turtle location [0 0].
    x: 0,
    y: 0,
    a: 0,
  };
  this.newPath();
  this.variables = {};
}

Logo.prototype.runInput = function (input) {
  var tokens = this.tokenizeInput(input);
  var tree = this.parseTokens(tokens);
  this.evalTree(tree);
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

Logo.prototype.newPath = function() {
  var path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.classList.add('trail');
  path.setAttribute('d', 'M ' + this.state.x + ',' + this.state.y);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', this.state.color);
  path.setAttribute('stroke-width', 3);
  document.getElementById('slate').appendChild(path);

  this.path = path;
  return path;
};

Logo.prototype.move = function(distance) {
  var state = this.state
    , rads = state.a * Math.PI / 180
    , dx = distance * Math.sin(rads)
    , dy = distance * Math.cos(rads)
    ;
  this.path.setAttribute('d', this.path.getAttribute('d') + ' l ' + dx + ',' + dy);
  state.x += dx;
  state.y += dy;
  this.updateTurtle();
};

Logo.prototype.rotate = function(degrees) {
  this.state.a = (this.state.a + degrees) % 360;
  this.updateTurtle();
};

Logo.prototype.updateTurtle = function() {
  var state = this.state;
  document.getElementById('turtle').setAttribute('transform',
    // Headings (angles) are measured in degrees clockwise from the positive Y
    // axis.
    'translate(' + state.x + ',' + state.y +') rotate(' + -state.a + ')'
  );
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
  'f': Logo.prototype.move,
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
    this.rotate(-degrees);
  }
};
Logo.prototype.commands.RIGHT = {
  'args': ['v'],
  'f': Logo.prototype.rotate,
};
// DISPLAY
Logo.prototype.commands.HOME = {
  'args': [],
  'f': function() {
    this.state.x = 0;
    this.state.y = 0;
    this.state.a = 0;
    this.updateTurtle();
  }
};
Logo.prototype.commands.CLEAN = {
  'args': [],
  'f': function() {
    var paths = document.getElementsByClassName('trail');
    while (paths.length) {
      paths[0].remove();
    }
    this.newPath();
  }
};
Logo.prototype.commands.CLEARSCREEN = {
  'args': [],
  'f': function() {
    this.commands.HOME.f.apply(this);
    this.commands.CLEAN.f.apply(this);
  }
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
    if (palette[value] && this.state.color != palette[value]) {
      // We want to stroke the current path then start a new one with the
      // current location as the first point.
      this.state.color = palette[value];
      this.newPath();
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

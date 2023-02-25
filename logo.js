// @ts-check
/* jshint laxcomma: true */

class Turtle {
  #x = 0;
  #y = 0;
  #angle = 0;
  #visible = true;
  #color = 'black';

  /**
   * @param {Logo} emitter
   */
  constructor(emitter) {
    this.emitter = emitter;
    this.penDown();
  }

  startPath() {
    if (this.drawing) {
      // TODO we should avoid starting new paths if we didn't move in our old one.
      const info = { x: this.x, y: this.y, color: this.color };
      this.emitter.trigger('path.start', info);
    }
  }

  endPath() {
    if (this.drawing) {
      this.emitter.trigger('path.end');
    }
  };

  penUp() {
    this.endPath();
    this.drawing = false;
  };

  penDown() {
    if (!this.drawing) {
      this.drawing = true;
      this.startPath();
    }
  };

  get color() {
    return this.#color;
  }

  set color(color) {
    if (this.#color == color) {
      return;
    }
    this.#color = color;
    this.endPath();
    this.startPath();
    this.update();
  };

  get x() {
    return this.#x;
  }

  get y() {
    return this.#y;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  setpos(x, y) {
    const dx = x - this.#x,
      dy = y - this.#y;
    if (dx == 0 && dy == 0) {
      return;
    }
    this.#x = x;
    this.#y = y;
    if (this.drawing) {
      this.emitter.trigger('path.delta', { dx, dy });
    }
    this.update();
  }

  /**
   * @param {number} distance
   */
  move(distance) {
    const rads = this.angle * Math.PI / 180,
      dx = distance * Math.sin(rads),
      dy = distance * Math.cos(rads);
    if (dx == 0 && dy == 0) {
      return;
    }
    this.#x += dx;
    this.#y += dy;
    if (this.drawing) {
      this.emitter.trigger('path.delta', { dx, dy });
    }
    this.update();
  };

  get angle() {
    return this.#angle;
  }

  /**
   * @param {number} degrees
   */
  set angle(degrees) {
    if (this.#angle == degrees) {
      return;
    }
    this.#angle = degrees;
    this.update();
  }

  /**
   * @param {number} degrees
   */
  rotate(degrees) {
    this.angle = (this.angle + degrees) % 360;
  };

  get visible() {
    return this.#visible;
  }

  show() {
    if (this.#visible == true) {
      return;
    }
    this.#visible = true;
    this.update();
  };

  hide() {
    if (this.#visible == false) {
      return;
    }
    this.#visible = false;
    this.update();
  };

  update () {
    this.emitter.trigger('turtle.change', this);
  };
};


// * * *

class Token {
  /**
   * @param {any} value
   * @param {number | undefined} line
   */
  constructor(value, line) {
    this.line = line;
    this.value = value;
  }
  evaluate() {
    return this.value;
  };
};

class ListToken extends Token {}

class WordToken extends Token {}

class NumberToken extends Token {}

class BooleanToken extends Token {
  /**
   * @param {boolean} value
   * @param {number | undefined} line
   */
    constructor(value, line) {
      super(value, line)
    }
}

// TODO I'm not in love with the name... VariableToken maybe?
class VariableToken extends Token {
  /**
   * @param {any} value
   * @param {number | undefined} line
   * @param {Logo} context
   */
  constructor(value, line, context) {
    super(value, line);
    this.context = context;
  }
  evaluate() {
    return this.context.variables.get(this.value);
  };
};

class CommandToken extends Token {
  /**
   * @param {string} value
   * @param {number | undefined} line
   * @param {Logo} context
   */
  constructor(value, line, context) {
    super(value, line);

    // Look up aliases.
    this.value = context.aliases[value] ?? value;
    this.command = context.commands[this.value];
    this.context = context;
  }
  evaluate(list) {
    // Check that the correct arguments are available.
    const args = [];

    if (!this.command) {
      console.log(`Unknown command ${this.value} on line ${this.line}`);
      return false;
    }

    // TODO: check that there are enough args available
    for (let i = 0, l = this.command.args.length; i < l; i++) {
      // TODO check argument types against expected types.
      const token = list.shift();
      if (token instanceof CommandToken) {
        args.push(token.evaluate(list));
      }
      else {
        args.push(token.evaluate());
      }
    }

    //console.log(token.value + ": " + args);
    return this.command.f.apply(this.context, args);
  }
};

// * * *

class Logo {
  constructor() {
    this.events = new Map();
    this.variables = new Map();
    this.stack = [];
    this.turtle = new Turtle(this);
    this.commands = this.builtInCommands();
  }

  // Micro event emitter
  /**
   * @param {string} event
   * @param {any} callback
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, [callback]);
    } else {
      this.events.get(event).push(callback);
    }
    return this;
  };
  /**
   * @param {string} event
   */
  trigger(event, /* ...args */) {
    for (const callback of this.events.get(event) ?? []) {
      callback.apply(this, Array.prototype.slice.call(arguments, 1));
    }
    return this;
  };

  /**
   * @param {string} input
   */
  runInput(input) {
    const tokens = this.tokenizeInput(input),
      tree = this.parseTokens(tokens);
    let token;
    while (token = tree.shift()) {
      token.evaluate(tree);
    }
  };

  /**
   * @param {string} input
   */
  tokenizeInput(input) {
    const lines = input.split(/\n/g),
      tokens = [];

    for (const [lineNumber, line] of lines.entries()) {
      const words = line
        // Remove comments (semi-colon to end of line).
        .replace(/;.*?$/, '')
        // Add whitespace around square brackets so they split correctly.
        .replace('[', ' [ ')
        .replace(']', ' ] ')
        // Remove leading or trailing whitespace.
        .trim()
        // Split by white space.
        .split(/\s+/);
      for (const word of words) {
        if (word) {
          tokens.push({
            line: lineNumber + 1,
            value: word.toUpperCase()
          });
        }
      }
    }

    return tokens;
  };

  parseTokens(tokens, level = 0) {
    let token, tree = [];
    while (tokens.length) {
      token = tokens.shift();
      if (token.value == '[') {
        tree.push(new ListToken(this.parseTokens(tokens, level + 1), token.line));
      }
      else if (token.value == ']') {
        return tree;
      }
      else {
        if (token.value[0] == ':') {
          token = new VariableToken(token.value.substr(1), token.line, this);
        }
        else if (token.value[0] == '"') {
          token = new WordToken(token.value.substr(1), token.line);
        }
        else if (['true', 'false'].includes(token.value.toLowerCase())) {
          token = new BooleanToken(token.value.toLowerCase() == 'true', token.line);
        }
        else if (parseInt(token.value, 10).toString() == token.value) {
          token = new NumberToken(parseInt(token.value, 10), token.line);
        }
        else if (/^[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/.test(token.value)) {
          token = new NumberToken(parseFloat(token.value), token.line);
        }
        else {
          token = new CommandToken(token.value, token.line, this);
        }
        tree.push(token);
      }
    }
    return tree;
  };

  aliases = {
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

  builtInCommands() {
    return {
      // CONTROL FLOW
      'REPEAT': {
        'args': [NumberToken, ListToken],
        'f': (count, list) => {
          let result;
          for (let i = 0; i < count; i++) {
            // Need to reuse the same tokens each time through the loop.
            const copy = list.slice(0);
            while (copy.length) {
              result = copy.shift().evaluate(copy);
            }
          }
          return result;
        }
      },

      // MOVEMENT
      'FORWARD': {
        'args': [NumberToken],
        'f': (distance) => this.turtle.move(distance),
      },
      'BACK': {
        'args': [NumberToken],
        'f': (distance) => this.turtle.move(-distance),
      },
      'LEFT': {
        'args': [NumberToken],
        'f': (degrees) => this.turtle.rotate(-degrees),
      },
      'RIGHT': {
        'args': [NumberToken],
        'f': (degrees) => this.turtle.rotate(degrees),
      },
      'SETX': {
        'args': [NumberToken],
        'f': (x) => this.turtle.setpos(x, this.turtle.y),
      },
      'SETY': {
        'args': [NumberToken],
        'f': (y) => this.turtle.setpos(this.turtle.x, y),
      },
      'SETXY': {
        'args': [NumberToken, NumberToken],
        'f': (x, y) => this.turtle.setpos(x, y),
      },

      // DISPLAY
      'HOME': {
        'args': [],
        'f': () => {
          this.turtle.setpos(0, 0);
          this.turtle.angle = 0;
        }
      },
      'CLEAN': {
        'args': [],
        'f': () => {
          this.turtle.endPath();
          this.trigger('path.remove_all');
          this.turtle.startPath();
        }
      },
      'CLEARSCREEN': {
        'args': [],
        'f': () => {
          this.commands.HOME.f.apply(this);
          this.commands.CLEAN.f.apply(this);
        }
      },
      'SHOWTURTLE': {
        'args': [],
        'f': () => this.turtle.show(),
      },
      'HIDETURTLE': {
        'args': [],
        'f': () => this.turtle.hide(),
      },
      'PENUP': {
        'args': [],
        'f': () => this.turtle.penUp(),
      },
      'PENDOWN': {
        'args': [],
        'f': () => this.turtle.penDown(),
      },
      'SETPENCOLOUR': {
        'args': [NumberToken],
        'f': (value) => {
          const palette = [
            'black', 'blue', 'green', 'cyan',
            'red', 'magenta', 'yellow', 'white',
            'brown', 'tan', 'forest', 'aqua',
            'salmon', 'purple', 'orange', 'grey'
          ];
          if (palette[value]) {
            this.turtle.color = palette[value];
          } else {
            // TODO log an error?
          }
        }
      },
      'PRINT': {
        'args': [null],
        'f': console.log,
      },

      // VARIABLES
      'MAKE': {
        'args': [WordToken, null],
        'f': (name, value) => {
          this.variables.set(name, value);
          return value;
        }
      },

      // MATH
      'SUM': {
        'args': [NumberToken, NumberToken],
        'f': (left, right) => left + right,
      },
      'DIFFERENCE': {
        'args': [NumberToken, NumberToken],
        'f': (left, right) => left - right,
      },
      'MINUS': {
        'args': [NumberToken],
        'f': (value) => -value,
      },
      'PRODUCT': {
        'args': [NumberToken, NumberToken],
        'f': (left, right) => left * right,
      },
      'QUOTIENT': {
        'args': [NumberToken, NumberToken],
        'f': (left, right) => left / right,
      },
    };
  };
}

var module = module || {};
module.exports = {
  Turtle,
  Logo,
  Token,
  ListToken,
  WordToken,
  BooleanToken,
  NumberToken,
  VariableToken,
  CommandToken,
};

// @ts-check
require('should');
const { Logo, BooleanToken, ListToken, NumberToken } = require('./logo');

describe('Logo', () => {
  const logo = new Logo();

  describe('#tokenizeInput', () => {
    it('creates token objects', () => {
      const tokens = logo.tokenizeInput('plus\n[3 5];foo');
      tokens.should.be.an.instanceOf(Array).and.have.length(5);
      tokens.should.eql([
        { line: 1, value: 'PLUS' },
        { line: 2, value: '[' },
        { line: 2, value: '3' },
        { line: 2, value: '5' },
        { line: 2, value: ']' }
      ]);
    });
  });

  describe.only('#parseTokens', () => {
    it('handles numeric values', () => {
      const tokens = [
        { line: 1, value: '130' },
        { line: 2, value: '1.30' },
      ];
      const tree = logo.parseTokens(tokens);
      tree.should.be.an.instanceOf(Array).and.have.length(2);
      tree[0].should.be.an.instanceOf(NumberToken);
      tree[0].value.should.eql(130);
      tree[1].should.be.an.instanceOf(NumberToken);
      tree[1].value.should.eql(1.30);
    });
    it('handles boolean values', () => {
      const tokens = [
        { line: 1, value: 'true' },
        { line: 2, value: 'True' },
        { line: 3, value: 'TRUE' },
        { line: 4, value: 'false' },
        { line: 5, value: 'False' },
        { line: 6, value: 'FALSE' },
      ];
      const tree = logo.parseTokens(tokens);
      tree.should.be.an.instanceOf(Array).and.have.length(6);
      tree.every((val) => val.should.be.an.instanceOf(BooleanToken));
      tree[0].value.should.eql(true);
      tree[1].value.should.eql(true);
      tree[2].value.should.eql(true);
      tree[3].value.should.eql(false);
      tree[4].value.should.eql(false);
      tree[5].value.should.eql(false);
    });
    it('nests the contents of lists', () => {
      const tokens = [
        { line: 1, value: '[' },
        { line: 2, value: '10' },
        { line: 3, value: '[' },
        { line: 4, value: '20' },
        { line: 5, value: ']' },
        { line: 6, value: '30' },
        { line: 7, value: ']' }
      ];
      const tree = logo.parseTokens(tokens);
      tree.should.be.an.instanceOf(Array).and.have.length(1);

      const outerList = tree[0];
      outerList.should.be.an.instanceOf(ListToken);
      outerList.value.should.be.an.instanceOf(Array).and.have.length(3);

      const innerList = outerList.value[1];
      innerList.should.be.an.instanceOf(ListToken);
      innerList.value.should.be.an.instanceOf(Array).and.have.length(1);
    });
  });

  describe('commands', () => {
    describe('make', () => {
      it('declares variables', () => {
        logo.runInput('make "bar 23');
        logo.variables.get('BAR').should.equal(23);
      });
    });

    describe('math', () => {
      describe('sum', () => {
        it('adds numbers', () => {
          logo.runInput('make "baz sum 1 3');
          logo.variables.get('BAZ').should.equal(4);
        });
        it('adds variable to number', () => {
          logo.runInput('make "foo 3 make "baz sum :foo 5');
          logo.variables.get('BAZ').should.equal(8);
        });
      });

      describe('product', () => {
        it('multiplies numbers', () => {
          logo.runInput('make "baz product 3 9');
          logo.variables.get('BAZ').should.equal(27);
        });
      });

      describe('quotient', () => {
        it('divides numbers', () => {
          logo.runInput('make "baz quotient 27 3');
          logo.variables.get('BAZ').should.equal(9);
        });
      });
    });

    describe('display', () => {
      describe('setx', () => {
        it('moves', () => {
          logo.runInput('setx 100');
          logo.turtle.x.should.equal(100);
          logo.runInput('setx 10');
          logo.turtle.x.should.equal(10);
        });
      });

      describe('sety', () => {
        it('moves', () => {
          logo.runInput('sety 200');
          logo.turtle.y.should.equal(200);
          logo.runInput('sety 20');
          logo.turtle.y.should.equal(20);
        });
      });

      describe('setxy', () => {
        it('moves', () => {
          logo.runInput('SETXY -100 -200');
          logo.turtle.x.should.equal(-100);
          logo.turtle.y.should.equal(-200);
          logo.runInput('setxy 20 39');
          logo.turtle.x.should.equal(20);
          logo.turtle.y.should.equal(39);
        });
      });

      describe('home', () => {
        it('moves', () => {
          logo.turtle.setpos(1, 2);
          logo.turtle.angle = 3
          logo.runInput('home');
          logo.turtle.x.should.equal(0);
          logo.turtle.y.should.equal(0);
          logo.turtle.angle.should.equal(0);
        });
      });

      describe('setpencolor', () => {
        it('colorizes', () => {
          logo.runInput('SetPenColour 0');
          logo.turtle.color.should.equal('black');
          logo.runInput('SetPenColor 1');
          logo.turtle.color.should.equal('blue');
        });
      });

      describe('showturtle', () => {
        it('shows', () => {
          logo.runInput('showturtle');
          logo.turtle.visible.should.equal(true)
        });
      });

      describe('hideturtle', () => {
        it('hides', () => {
          logo.runInput('hideturtle');
          logo.turtle.visible.should.equal(false)
        });
      });

      describe('clearscreen', () => {
        it('goes home', () => {
          logo.turtle.x = 100;
          logo.turtle.y = 20;
          logo.turtle.angle = 99;

          logo.runInput('clearscreen');

          logo.turtle.x.should.equal(0);
          logo.turtle.y.should.equal(0);
          logo.turtle.angle.should.equal(0);
        });
      });
    });

    describe('repeat', () => {
      it('runs a block multiple times', () => {
        logo.runInput('make "foo 0 repeat 3 [ make "foo sum :foo 1 ]');
        logo.variables.get('FOO').should.equal(3);
      });
      it('runs a nested blocks correctly times', () => {
        logo.runInput('make "out 0 make "in 0 repeat 3 [ repeat 2 [ make "in sum :in 1 ] make "out sum :out 1 ]');
        logo.variables.get('OUT').should.equal(3);
        logo.variables.get('IN').should.equal(6);
      });
    });
  });
});

require('should');
const { Logo, ListToken } = require('./logo');

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

  describe('#parseTokens', () => {
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

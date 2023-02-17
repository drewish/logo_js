require('should');
var Logo = require('./logo');

describe('Logo', function () {
  var logo = new Logo();

  describe('#tokenizeInput', function () {
    it('should create token objects', function() {
      var tokens = logo.tokenizeInput('plus 3 5');
      tokens.should.be.an.instanceOf(Array).and.have.length(3);
    });
  });

  describe('commands', function() {
    describe('make', function() {
      it('declares variables', function() {
        logo.runInput('make "bar 23');
        logo.variables.BAR.should.equal(23);
      });
    });

    describe('sum', function() {
      it('adds numbers', function() {
        logo.runInput('make "baz sum 1 3');
        logo.variables.BAZ.should.equal(4);
      });
      it('adds variable to number', function() {
        logo.runInput('make "foo 3 make "baz sum :foo 5');
        logo.variables.BAZ.should.equal(8);
      });
    });

    describe('product', function() {
      it('adds numbers', function() {
        logo.runInput('make "baz product 3 9');
        logo.variables.BAZ.should.equal(27);
      });
      it('adds variable to number', function() {
        logo.runInput('make "foo 3 make "baz product :foo 5');
        logo.variables.BAZ.should.equal(15);
      });
    });

    describe('quotient', function() {
      it('adds numbers', function() {
        logo.runInput('make "baz quotient 27 3');
        logo.variables.BAZ.should.equal(9);
      });
      it('adds variable to number', function() {
        logo.runInput('make "foo 9 make "baz quotient :foo 3');
        logo.variables.BAZ.should.equal(3);
      });
    });

    describe('repeat', function() {
      it('runs a block multiple times', function() {
        logo.runInput('make "foo 0 repeat 3 [ make "foo sum :foo 1 ]');
        logo.variables.FOO.should.equal(3);
      });
      it('runs a nested blocks correctly times', function() {
        logo.runInput('make "out 0 make "in 0 repeat 3 [ repeat 2 [ make "in sum :in 1 ] make "out sum :out 1 ]');
        logo.variables.OUT.should.equal(3);
        logo.variables.IN.should.equal(6);
      });
    });
  });

});

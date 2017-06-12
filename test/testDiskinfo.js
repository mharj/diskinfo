const chai = require('chai');
const expect = chai.expect;
chai.should();
chai.use(require('chai-things'));
const fs = require("fs");
const parseMBR = require('../diskinfo.js').parseMBR;


describe('diskinfo', function() {
	it('should parse mbr info', function(done) {
		fs.readFile('./test/mbr.bin', (err, data) => {
			let info = parseMBR(data);
			info.uuid.should.be.a('string').and.equal('a83f808');
			info.gtp.should.be.a('boolean').and.equal(false);
			info.partitions.should.be.an('array').and.all.have.property('active');
			info.partitions.should.be.an('array').and.all.have.property('type');
			info.partitions.should.be.an('array').and.all.have.property('partitionSize');
			info.partitions.should.be.an('array').and.all.have.property('startCHS');
			info.partitions.should.be.an('array').and.all.have.property('endCHS');
			done();
		});
	});
});
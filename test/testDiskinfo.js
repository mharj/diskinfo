const chai = require('chai');
const expect = chai.expect;
chai.should();
chai.use(require('chai-things'));
const fs = require("fs");
const parseMBR = require('../diskinfo.js').parseMBR;
const parseGPT = require('../diskinfo.js').parseGPT;
const parseGPTable = require('../diskinfo.js').parseGPTable;
const partTypes = require('../diskinfo.js').partTypes;


describe('diskinfo', function() {
	it('should parse mbr info', function(done) {
		fs.readFile('./test/mbr.bin', (err, data) => {
			let info = parseMBR(data);
			info.uuid.should.be.a('string').and.equal('a83f808');
			info.partitions.should.be.an('array').and.all.have.property('active');
			info.partitions.should.be.an('array').and.all.have.property('type');
			info.partitions.should.be.an('array').and.all.have.property('partitionSize');
			info.partitions.should.be.an('array').and.all.have.property('startCHS');
			info.partitions.should.be.an('array').and.all.have.property('endCHS');
			done();
		});
	});
	it('should parse gtp info', function(done) {
		fs.readFile('./test/gtp.bin', (err, data) => {
			let info = parseMBR(data);
			info.partitions[0].type.should.be.equal(partTypes.GTP);
			let gtpInfo = parseGPT(data.slice(512,1024));
			gtpInfo.revision.should.be.equal('0.0.1.0');
			gtpInfo.headerSize.should.be.equal(92);
			gtpInfo.headerCRC32.should.be.equal(2738102986); // TODO: actually check this from buffer
			gtpInfo.uuid.should.be.equal('29c6b165-daa3-43fb-a56d-449fea36fd3c');
			for (var i = (gtpInfo.tableLBA*512);i < ((gtpInfo.tableLBA*512)+(gtpInfo.partitions*gtpInfo.partitionSize)); i += gtpInfo.partitionSize ) {
				let table = parseGPTable(data.slice(i,i+gtpInfo.partitionSize));
				if ( i == 1024 ) {
					table.type.should.be.equal('c12a7328-f81f-11d2-ba4b-00a0c93ec93b'); // EFI
				}
				if ( i == 1152 ) {
					table.type.should.be.equal('0fc63daf-8483-4772-8e79-3d69d8477de4'); // Linux partition
				}
				if ( i == 1280 ) {
					table.type.should.be.equal('0657fd6d-a4ab-43c4-84e5-0933c84b4f4f'); // Linux Swap
				}
			}
			done();
		});
	});	
});
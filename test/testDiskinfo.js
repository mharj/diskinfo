/* eslint max-len: ["error", 256] */
const chai = require('chai');
// const expect = chai.expect;
chai.should();
chai.use(require('chai-things'));
const fs = require('fs');
const crc32 = require('buffer-crc32');
const parseMBR = require('../diskinfo.js').parseMBR;
const parseGPT = require('../diskinfo.js').parseGPT;
const parseGPTable = require('../diskinfo.js').parseGPTable;
const partTypes = require('../diskinfo.js').partTypes;
const gptPartTypes = require('../diskinfo.js').gptPartTypes;

let gptData = null;
let mbrData = null;
let gtpInfo = null;
describe('diskinfo', function() {
	before(function(done) {
		gptData = fs.readFileSync('./test/gtp.bin');
		mbrData = fs.readFileSync('./test/mbr.bin');
		done();
	});
	it('should parse mbr info', function(done) {
		let info = parseMBR(mbrData);
		info.uuid.should.be.a('string').and.equal('a83f8008');
		info.partitions.should.be.an('array').and.all.have.property('active');
		info.partitions.should.be.an('array').and.all.have.property('type');
		info.partitions.should.be.an('array').and.all.have.property('partitionSize');
		info.partitions.should.be.an('array').and.all.have.property('startLBA');
		info.partitions.should.be.an('array').and.all.have.property('endLBA');
		done();
	});
	it('should parse gtp info', function(done) {
		let info = parseMBR(gptData);
		info.partitions[0].type.should.be.equal(partTypes.GPT);
		gtpInfo = parseGPT(gptData.slice(512, 1024));
		gtpInfo.revision.should.be.equal('0.0.1.0');
		gtpInfo.headerSize.should.be.equal(92);
		// check header crc32
		let crcbuff = gptData.slice(512, (512+gtpInfo.headerSize) );
		crcbuff[16]=0; // zero current crc32 for check
		crcbuff[17]=0;
		crcbuff[18]=0;
		crcbuff[19]=0;
		gtpInfo.headerCRC32.should.be.equal(crc32.unsigned(crcbuff));
		gtpInfo.uuid.should.be.equal('29c6b165-daa3-43fb-a56d-449fea36fd3c');
		done();
	});
	it('should parse gtp table info', function(done) {
		for (let i = (gtpInfo.tableLBA*512); i < ((gtpInfo.tableLBA*512)+(gtpInfo.partitions*gtpInfo.partitionSize)); i += gtpInfo.partitionSize ) {
			let table = parseGPTable(gptData.slice(i, i+gtpInfo.partitionSize));
			if ( i == 1024 ) {
				table.type.should.be.equal(gptPartTypes.EFI); // EFI
			}
			if ( i == 1152 ) {
				table.type.should.be.equal(gptPartTypes.LINUX); // Linux partition
			}
			if ( i == 1280 ) {
				table.type.should.be.equal(gptPartTypes.LINUX_SWAP); // Linux Swap
			}
		}
		done();
	});
});

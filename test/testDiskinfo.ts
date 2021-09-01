process.env.NODE_ENV = 'test';
import 'mocha';
import 'chai/register-should';
import {expect} from 'chai';
import * as chai from 'chai';
import * as fs from 'fs';
import * as crc32 from 'buffer-crc32';
import {Magic, scan} from '../src/';
import {gptPartTypes, IGtpData, parseGPT, parseGPTable} from '../src/gptPart';
import {parseMBR, partTypes} from '../src/mbrPart';

chai.should();

let gptData: Buffer;
let mbrData: Buffer;
let gtpInfo: IGtpData;
let fdNTFS: number;
let fdEXT: number;
let fdLVM2: number;
let fdMbr: number;
describe('diskinfo', function () {
	before(function (done) {
		gptData = fs.readFileSync('./test/gtp.bin');
		mbrData = fs.readFileSync('./test/mbr.bin');
		fdNTFS = fs.openSync('./test/ntfs.bin', 'rs+');
		fdEXT = fs.openSync('./test/ext.bin', 'rs+');
		fdLVM2 = fs.openSync('./test/lvm2.bin', 'rs+');
		fdMbr = fs.openSync('./test/mbr.bin', 'rs+');
		done();
	});
	describe('partitions', function () {
		it('should parse mbr info', function (done) {
			let info = parseMBR(mbrData);
			expect(info.uuid).to.be.a('string').and.equal('a83f8008');
			expect(info.partitions).to.be.an('array');
			info.partitions.forEach((p) => expect(p).to.have.all.keys(['active', 'type', 'partitionSize', 'startLBA', 'endLBA']));
			done();
		});
		it('should parse gtp info', function (done) {
			let info = parseMBR(gptData);
			info.partitions[0].type.should.be.equal(partTypes.GPT);
			gtpInfo = parseGPT(gptData.slice(512, 1024));
			gtpInfo.revision.should.be.equal('0.0.1.0');
			gtpInfo.headerSize.should.be.equal(92);
			// check header crc32
			let crcbuff = gptData.slice(512, 512 + gtpInfo.headerSize);
			crcbuff[16] = 0; // zero current crc32 for check
			crcbuff[17] = 0;
			crcbuff[18] = 0;
			crcbuff[19] = 0;
			gtpInfo.headerCRC32.should.be.equal(crc32.unsigned(crcbuff));
			gtpInfo.uuid.should.be.equal('29c6b165-daa3-43fb-a56d-449fea36fd3c');
			done();
		});
		it('should parse gtp table info', function (done) {
			for (
				let i = Number(gtpInfo.tableLBA) * 512;
				i < Number(gtpInfo.tableLBA) * 512 + gtpInfo.partitions * gtpInfo.partitionSize;
				i += gtpInfo.partitionSize
			) {
				let table = parseGPTable(gptData.slice(i, i + gtpInfo.partitionSize));
				if (i == 1024) {
					const startLBA = 0x800n;
					const endLBA = 0x1007ffn;
					table.typeId.should.be.equal(gptPartTypes.EFI); // EFI
					table.type.should.be.equal(gptPartTypes.getName(table.typeId));
					table.label.should.be.equal('EFI_PART');
					table.active.should.be.equal(true);
					table.attributes.should.be.equal(0n);
					table.startLBA.should.be.equal(startLBA);
					table.endLBA.should.be.equal(endLBA);
					table.partitionSize.should.be.equal(endLBA - startLBA + 1n);
					table.uuid.should.be.equal('5fa173fd-0850-410e-9c0f-5bc3d2e056a5');
				}
				if (i == 1152) {
					const startLBA = 0x100800n;
					const endLBA = 0x12007ffn;
					table.typeId.should.be.equal(gptPartTypes.LINUX); // Linux partition
					table.type.should.be.equal(gptPartTypes.getName(table.typeId));
					table.label.should.be.equal('Linux Root');
					table.active.should.be.equal(true);
					table.attributes.should.be.equal(0n);
					table.startLBA.should.be.equal(startLBA);
					table.endLBA.should.be.equal(endLBA);
					table.partitionSize.should.be.equal(endLBA - startLBA + 1n);
					table.uuid.should.be.equal('6ea92768-b99f-48dc-a75c-411cc5cb852e');
				}
				if (i == 1280) {
					const startLBA = 0x1200800n;
					const endLBA = 0x13ff7ffn;
					table.typeId.should.be.equal(gptPartTypes.LINUX_SWAP); // Linux Swap
					table.type.should.be.equal(gptPartTypes.getName(table.typeId));
					table.label.should.be.equal('Linux Swap');
					table.active.should.be.equal(true);
					table.attributes.should.be.equal(0n);
					table.startLBA.should.be.equal(startLBA);
					table.endLBA.should.be.equal(endLBA);
					table.partitionSize.should.be.equal(endLBA - startLBA + 1n);
					table.uuid.should.be.equal('7c1da61a-bb83-48b7-b2e1-09936e9ea162');
				}
				if (i == 1408) {
					const startLBA = 0x13ff800n;
					const endLBA = 0x13fffddn;
					table.typeId.should.be.equal(gptPartTypes.MSR); // Microsoft reserved partition
					table.type.should.be.equal(gptPartTypes.getName(table.typeId));
					table.label.should.be.equal('Microsoft reserved partition');
					table.active.should.be.equal(true);
					table.attributes.should.be.equal(0n);
					table.startLBA.should.be.equal(startLBA);
					table.endLBA.should.be.equal(endLBA);
					table.partitionSize.should.be.equal(endLBA - startLBA + 1n);
					table.uuid.should.be.equal('d102eb4b-2e28-4449-8c4f-2ae1ab46dc32');
				}
				if (i == 1536) {
					const startLBA = 0x13fffden;
					const endLBA = 0x17adf5dn;
					table.typeId.should.be.equal(gptPartTypes.BASIC_DATA); // Basic data partition
					table.type.should.be.equal(gptPartTypes.getName(table.typeId));
					table.label.should.be.equal('Basic data partition');
					table.active.should.be.equal(true);
					table.attributes.should.be.equal(0x80n);
					table.startLBA.should.be.equal(startLBA);
					table.endLBA.should.be.equal(endLBA);
					table.partitionSize.should.be.equal(endLBA - startLBA + 1n);
					table.uuid.should.be.equal('9a6ea671-a597-4ae2-90d4-75fdaede55ce');
				}
			}
			done();
		});
	});
	describe('FS magic check', function () {
		it('should check Win NTFS magic', function (done) {
			let magic = new Magic(fdNTFS);
			magic.haveNtfs(0).should.be.a('boolean').and.equal(true);
			magic.haveExt(0).should.be.a('boolean').and.equal(false);
			done();
		});
		it('should check Linux EXT2/3/4 magic', function (done) {
			let magic = new Magic(fdEXT);
			magic.haveExt(0).should.be.a('boolean').and.equal(true);
			magic.haveNtfs(0).should.be.a('boolean').and.equal(false);
			done();
		});
		it('should check Linux LVM2 magic', function (done) {
			let magic = new Magic(fdLVM2);
			magic.haveLvm2(0).should.be.a('boolean').and.equal(true);
			magic.haveExt(0).should.be.a('boolean').and.equal(false);
			magic.haveNtfs(0).should.be.a('boolean').and.equal(false);
			done();
		});
	});
	describe('test async scan', function () {
		it('should scan file descriptor', async () => {
			const data = await scan(fdMbr);
			expect(data.copyProtected).to.be.eq(false);
			expect(data.uuid).to.be.eq('a83f8008');
			data.partitions.forEach((p) => expect(p).to.have.keys(['active', 'type', 'startLBA', 'partitionSize', 'endLBA']));
		});
	});
});

const fs = require('fs');
const iconv = require('iconv-lite');
const uuidParse = require('uuid-parse');
const EFI_PART = Buffer.from([0x45, 0x46, 0x49, 0x20, 0x50, 0x41, 0x52, 0x54]);

const gptPartTypes = {
	EMPTY:				'00000000-0000-0000-0000-000000000000',
	MBR:				'024dee41-33e7-11d3-9d69-0008c781f39f',
	EFI:				'c12a7328-f81f-11d2-ba4b-00a0c93ec93b',
	LINUX:				'0fc63daf-8483-4772-8e79-3d69d8477de4',
	LINUX_SWAP:			'0657fd6d-a4ab-43c4-84e5-0933c84b4f4f',
	LINUX_LVM:			'e6d6d379-f507-44c2-a23c-238f2a3df928',
	LINUX_RAID:			'a19d880f-05fc-4d3b-a006-743f0f84911e',
	getName: 			function(val) { // print names for values
		for (let k in gptPartTypes) {
			if (gptPartTypes[k] == val) {
				return k;
			}
		}
		return '('+val.toString(16)+')';
	},
};
module.exports.gptPartTypes = gptPartTypes;

const partTypes = {
	EMPTY:				0x00,
	EXTENDED:			0x05,
	NTFS:				0x07,
	LINUX_SWAP:			0x82,
	LINUX:				0x83,
	LINUX_EXTENDED:		0x85,
	LINUX_LVM:			0x8e,
	GPT:				0xee,
	EFI:				0xef,
	LINUX_RAID:			0xfd,
	getName:			function(val) { // print names for values
		for (let k in partTypes) {
			if (partTypes[k] == val) {
				return k+' ('+val.toString(16)+')';
			}
		}
		return '('+val.toString(16)+')';
	},
};
module.exports.partTypes = partTypes;

function parseMBRPartition(part) {
	let out = {};
	out.active = (part.readUInt8(0)==0x80?true:false);
//	out.startCHS = Buffer.from([part[1],part[2],part[3]]); // obsolete
	out.type = part.readUInt8(4);
//	out.endCHS = Buffer.from([part[5],part[6],part[7]]); // obsolete
	out.startLBA = part.readUInt32LE(8);
	out.partitionSize = part.readUInt32LE(12);
	out.endLBA = out.startLBA+out.partitionSize;
	return out;
}

function parseMBR(mbr) {
	if ( mbr.length < 512 || mbr[0x1fe] != 85 || mbr[0x1ff] != 170 ) { // MBR signature
		throw Error('no MBR signature or buffer is less than 512 bytes');
	}
	let ret = {partitions: []};
	if ( mbr[0x1bc] == 90 && mbr[0x1bc] == 90 ) { // 0x5A5A = copy protected (UEFI)
		ret.copyProtected = true;
	}
	ret.uuid = mbr[0x1bb].toString(16) + mbr[0x1ba].toString(16) + mbr[0x1b9].toString(16) + mbr[0x1b8].toString(16); // DiskID: 1B8 (hex) through 1BE (hex) (looks like reverse)
	for (let i = 446; i <= 508; i += 16) { // MBR table blocks
		ret.partitions.push( parseMBRPartition( mbr.slice(i, i+16) ) );
	}
	return ret;
}
module.exports.parseMBR = parseMBR;

function readUuidBytes(buf, pos) {
	return [
		buf[(pos+3)], buf[(pos+2)], buf[(pos+1)], buf[(pos+0)],
		buf[(pos+5)], buf[(pos+4)], buf[(pos+7)], buf[(pos+6)],
		buf[(pos+8)], buf[(pos+9)], buf[(pos+10)], buf[(pos+11)],
		buf[(pos+12)], buf[(pos+13)], buf[(pos+14)], buf[(pos+15)],
	];
}

function parseGPT(buf) { // https://en.wikipedia.org/wiki/GUID_Partition_Table
	let out = {};
	if ( buf.indexOf(EFI_PART) != 0 ) {
		throw Error('not GTP entry');
	}
	out.revision = buf[8]+'.'+buf[9]+'.'+buf[10]+'.'+buf[11];
	out.headerSize = buf.readUInt32LE(12);
	out.headerCRC32 = buf.readUInt32LE(16);
	// buf.readUInt32LE(20); // reserved; must be zero
	out.currentLBA = buf.readUIntLE(24, 8); // Warning: 64bit uint, JS uses this as 53bit
	out.backupLBA = buf.readUIntLE(32, 8); // Warning: 64bit uint, JS uses this as 53bit
	out.firstUsableLBA = buf.readUIntLE(40, 8); // Warning: 64bit uint, JS uses this as 53bit
	out.lastUsableLBA = buf.readUIntLE(48, 8); // Warning: 64bit uint, JS uses this as 53bit
	out.uuid = uuidParse.unparse(readUuidBytes(buf, 56));
	out.tableLBA = buf.readUIntLE(72, 8); // Warning: 64bit uint, JS uses this as 53bit
	out.partitions = buf.readUInt32LE(80);
	out.partitionSize = buf.readUInt32LE(84);
	out.partitionCRC32 = buf.readUInt32LE(88);
	return out;
}
module.exports.parseGPT = parseGPT;

function parseGPTable(buf) {
	let out = {};
	out.type = uuidParse.unparse(readUuidBytes(buf, 0));
	out.uuid = uuidParse.unparse(readUuidBytes(buf, 16));
	out.active = (out.uuid==gptPartTypes.EMPTY?false:true);
	out.startLBA = buf.readUIntLE(32, 8); // Warning: 64bit uint, JS uses this as 53bit
	out.endLBA = buf.readUIntLE(40, 8); // Warning: 64bit uint, JS uses this as 53bit
	out.partitionSize = out.endLBA-out.startLBA+1; // +1?
	out.attributes = buf.readUIntLE(48, 8); // Warning: 64bit uint, JS uses this as 53bit
	out.label = iconv.decode(buf.slice(56, 128), 'utf16le').split('\u0000')[0]; // bit hack in here
	return out;
}
module.exports.parseGPTable = parseGPTable;

const buffer = Buffer.allocUnsafe(512);
function scan(fd) {
	if ( fs.readSync(fd, buffer, 0, buffer.length, 0) != 512 ) {
		throw Error('read only partial data from MBR');
	}
	let rootMbr = parseMBR(buffer);
	rootMbr.type = 'MBR';
	rootMbr.partitions.forEach(function(p){
		if ( p.type == partTypes.EXTENDED ) { // Extended partition reading
			fs.readSync(fd, buffer, 0, buffer.length, (p.startSector*512));
			let extparts = parseMBR(buffer);
			extparts.partitions.forEach(function(extpart) {
				if ( extpart.type != partTypes.EMPTY ) {
					extpart.startLBA = extpart.startLBA + p.startLBA;
					rootMbr.partitions.push(extpart);
				}
			});
		}
		if ( p.type == partTypes.GPT ) { // GPT partition table reading
			fs.readSync(fd, buffer, 0, buffer.length, 512);
			let gptInfo = parseGPT(buffer);
			rootMbr.uuid = gptInfo.uuid;
			let partitionBuffer = Buffer.allocUnsafe( (gptInfo.partitions*gptInfo.partitionSize) );
			fs.readSync(fd, partitionBuffer, 0, partitionBuffer.length, (gptInfo.tableLBA*512));
			let partitions = [];
			for (let i = 0; i < (gptInfo.partitions*gptInfo.partitionSize); i += gptInfo.partitionSize ) {
				let table = parseGPTable(partitionBuffer.slice(i, i+gptInfo.partitionSize));
				if ( table.type != '00000000-0000-0000-0000-000000000000') {
					partitions.push(table);
				}
			}
			rootMbr.partitions = partitions;
			rootMbr.type = 'GPT';
		}
	});
	return rootMbr;
}
module.exports.scan = scan;



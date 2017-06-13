const fs = require("fs");

const partTypes = {
	EMPTY:			0x00,
	NTFS:			0x07,
	LINUX_SWAP:		0x82,
	LINUX:			0x83,
	LINUX_EXTENDED:	0x85,
	LINUX_LVM:		0x8e,
	GTP:			0xee,
	EFI:			0xef,
	LINUX_RAID:		0xfd,
	getName: function(val) { // print names for values
		for (var k in partTypes) if (partTypes[k] == val) return k+' ('+val.toString(16)+')';
		return '('+val.toString(16)+')';
	}
};
module.exports.partTypes = partTypes;

function parseMBRPartition(part) {
	let out = {};
	out.active = (part.readUInt8(0)==0x80?true:false);
	out.startCHS = Buffer.from([part[1],part[2],part[3]]);
	out.type = part.readUInt8(4);
	out.endCHS = Buffer.from([part[5],part[6],part[7]]);
	out.startSector = part.readUInt32LE(8);
	out.partitionSize = part.readUInt32LE(12);
	return out;
}

function parseMBR(mbr) {
	if ( mbr.length < 512 || mbr[0x1fe] != 85 || mbr[0x1ff] != 170 ) { // MBR signature
		throw Error('no MBR signature or buffer is less than 512 bytes');
	}
	let ret = {partitions:[]};
	if ( mbr[0x1bc] == 90 && mbr[0x1bc] == 90 ) { // 0x5A5A = copy protected (UEFI)
		ret.copyProtected = true;
	}
	ret.uuid = mbr[0x1bb].toString(16) + mbr[0x1ba].toString(16) + mbr[0x1b9].toString(16) + mbr[0x1b8].toString(16); // DiskID: 1B8 (hex) through 1BE (hex) (looks like reverse)
	for (var i = 446;i <= 508;i += 16) { // MBR table blocks
		ret.partitions.push( parseMBRPartition( mbr.slice(i,i+16) ) );
	}
	return ret;
}
module.exports.parseMBR = parseMBR;

const buffer = Buffer.allocUnsafe(512);
function scan(fd) {
	if ( fs.readSync(fd,buffer,0,buffer.length,0) != 512 ) {
		throw Error('read only partial data from MBR');
	}
	let rootMbr = parseMBR(buffer);
	rootMbr.partitions.forEach(function(p){
		if ( p.type == partTypes.EXTENDED ) { // TODO: Extended partition reading
			fs.readSync(fd,buffer,0,buffer.length,(p.startSector*512));
			let extparts = parseMBR(mbr);
			extparts.partitions.forEach(function(extpart) {
				if ( extpart.type != partTypes.EMPTY ) {
					extpart.startSector = extpart.startSector + p.startSector;
					rootMbr.partitions.push(extpart);
				}
			});
		}
		if ( p.type == partTypes.GTP ) { // TODO: GTP partition table reading
			
		}
	});
	return rootMbr;
}
module.exports.scan = scan;


